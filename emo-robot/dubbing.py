"""
Traduction vidéo : transcription de l'audio, traduction en français,
génération d'une voix off française et incrustation des sous-titres.

Pipeline :
  1. faster-whisper transcrit l'audio original (avec timestamps)
  2. traduction des segments en français
  3. Deepgram Aura (si clé dispo) ou edge-tts synthétise la voix off française
  4. ffmpeg mixe la voix off et incruste les sous-titres
"""
import asyncio
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path

WORK_DIR = Path(__file__).parent / "work"
WORK_DIR.mkdir(exist_ok=True)

# Voix Deepgram française (Aura-2). Fallback sur Edge TTS si pas de clé.
DEEPGRAM_VOICE = "aura-2-agathe-fr"  # voix féminine FR, enthousiaste — parfaite TikTok
EDGE_VOICE = "fr-FR-DeniseNeural"

# La voix off passe au premier plan, l'audio original reste en fond sonore
ORIGINAL_AUDIO_GAIN = 0.15


@dataclass
class Segment:
    start: float
    end: float
    text_src: str
    text_fr: str = ""

    @property
    def duration(self) -> float:
        return max(self.end - self.start, 0.1)


def transcribe(video: Path) -> tuple[list[Segment], str]:
    """Transcrit l'audio. Retourne les segments et la langue détectée."""
    from faster_whisper import WhisperModel

    # "small" : bon compromis qualité/vitesse sur CPU. "medium" si tu as un GPU.
    model = WhisperModel("small", device="cpu", compute_type="int8")
    raw_segments, info = model.transcribe(str(video), vad_filter=True)

    segments = [
        Segment(start=s.start, end=s.end, text_src=s.text.strip())
        for s in raw_segments
        if s.text.strip()
    ]
    return segments, info.language


def translate_segments(segments: list[Segment], source_lang: str) -> list[Segment]:
    """Traduit chaque segment en français, en place."""
    if source_lang == "fr":
        for seg in segments:
            seg.text_fr = seg.text_src
        return segments

    from deep_translator import GoogleTranslator
    translator = GoogleTranslator(source=source_lang or "auto", target="fr")

    # Traduction par lots pour limiter les appels réseau
    BATCH = 20
    for i in range(0, len(segments), BATCH):
        chunk = segments[i:i + BATCH]
        try:
            results = translator.translate_batch([s.text_src for s in chunk])
        except Exception:
            results = [_safe_translate(translator, s.text_src) for s in chunk]

        for seg, translated in zip(chunk, results):
            seg.text_fr = translated or seg.text_src

    return segments


def _safe_translate(translator, text: str) -> str:
    try:
        return translator.translate(text)
    except Exception:
        return text


def write_srt(segments: list[Segment], path: Path) -> Path:
    """Écrit les sous-titres français au format SRT."""
    lines = []
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{_srt_time(seg.start)} --> {_srt_time(seg.end)}")
        lines.append(_wrap(seg.text_fr))
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def _srt_time(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _wrap(text: str, width: int = 42) -> str:
    """Coupe en deux lignes max — au-delà, c'est illisible sur mobile."""
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) <= width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\n".join(lines[:2])


def _synth_deepgram(text: str, out: Path, api_key: str) -> bool:
    """Synthèse vocale via Deepgram Aura-2 (voix française naturelle)."""
    import urllib.request, json as _json
    url = f"https://api.deepgram.com/v1/speak?model={DEEPGRAM_VOICE}&encoding=mp3"
    body = _json.dumps({"text": text}).encode()
    req = urllib.request.Request(
        url, data=body,
        headers={"Authorization": f"Token {api_key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            out.write_bytes(resp.read())
        return out.stat().st_size > 1000
    except Exception as e:
        print(f"  Deepgram TTS échoué : {e}")
        return False


async def _synth_edge(text: str, out: Path, rate: str = "+0%"):
    import edge_tts
    communicate = edge_tts.Communicate(text, EDGE_VOICE, rate=rate)
    await communicate.save(str(out))


def build_voiceover(segments: list[Segment], slug: str) -> Path | None:
    """
    Génère la voix off française, chaque segment placé à son timestamp d'origine.
    Retourne None si aucun segment exploitable.
    """
    usable = [s for s in segments if s.text_fr.strip()]
    if not usable:
        return None

    seg_dir = WORK_DIR / f"{slug}_tts"
    seg_dir.mkdir(exist_ok=True)

    deepgram_key = os.getenv("DEEPGRAM_API_KEY", "").strip()
    use_deepgram = bool(deepgram_key)
    if use_deepgram:
        print(f"  Voix : Deepgram Aura-2 ({DEEPGRAM_VOICE})")
    else:
        print(f"  Voix : Edge TTS ({EDGE_VOICE})")

    clips: list[tuple[Path, float]] = []
    for i, seg in enumerate(usable):
        out = seg_dir / f"{i:04d}.mp3"
        if not out.exists():
            try:
                if use_deepgram:
                    ok = _synth_deepgram(seg.text_fr, out, deepgram_key)
                    if not ok:
                        asyncio.run(_synth_edge(seg.text_fr, out))
                else:
                    asyncio.run(_synth_edge(seg.text_fr, out))
            except Exception as e:
                print(f"  TTS échoué sur le segment {i} : {e}")
                continue
        if out.exists():
            clips.append((out, seg.start))

    if not clips:
        return None

    # Chaque clip est retardé jusqu'à son timestamp, puis tous sont mixés ensemble
    voiceover = WORK_DIR / f"{slug}_voice.m4a"
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for clip, _ in clips:
        cmd += ["-i", str(clip)]

    filters = [
        f"[{i}:a]adelay={int(start * 1000)}|{int(start * 1000)}[a{i}]"
        for i, (_, start) in enumerate(clips)
    ]
    mix_inputs = "".join(f"[a{i}]" for i in range(len(clips)))
    filters.append(f"{mix_inputs}amix=inputs={len(clips)}:normalize=0[out]")

    cmd += [
        "-filter_complex", ";".join(filters),
        "-map", "[out]",
        "-c:a", "aac", "-b:a", "128k",
        str(voiceover),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  Mixage voix off échoué : {result.stderr[:300]}")
        return None

    return voiceover


def render(video: Path, srt: Path, voiceover: Path | None, slug: str) -> Path:
    """Incruste les sous-titres et mixe la voix off par-dessus l'audio original."""
    output = WORK_DIR / f"{slug}_fr.mp4"

    # Style lisible sur mobile : gros texte, contour noir, positionné bas
    style = (
        "FontName=Arial,FontSize=16,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,"
        "Alignment=2,MarginV=60"
    )
    # ffmpeg exige des chemins échappés dans le filtre subtitles
    srt_escaped = str(srt).replace("\\", "/").replace(":", "\\:")
    sub_filter = f"subtitles='{srt_escaped}':force_style='{style}'"

    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(video)]

    if voiceover:
        cmd += ["-i", str(voiceover)]
        cmd += [
            "-filter_complex",
            f"[0:v]{sub_filter}[v];"
            f"[0:a]volume={ORIGINAL_AUDIO_GAIN}[orig];"
            f"[orig][1:a]amix=inputs=2:duration=first:normalize=0[a]",
            "-map", "[v]", "-map", "[a]",
        ]
    else:
        cmd += ["-vf", sub_filter, "-map", "0:v", "-map", "0:a?"]

    cmd += [
        "-c:v", "libx264", "-preset", "medium", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(output),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Rendu ffmpeg échoué : {result.stderr[:500]}")

    return output


def dub_to_french(video: Path, slug: str) -> tuple[Path, str]:
    """
    Pipeline complet : transcription, traduction, voix off, sous-titres.
    Retourne le chemin de la vidéo française et la transcription source.
    """
    print("  [1/4] Transcription de l'audio...")
    segments, lang = transcribe(video)
    if not segments:
        raise RuntimeError("Aucune parole détectée dans la vidéo.")
    print(f"        {len(segments)} segments, langue détectée : {lang}")

    print("  [2/4] Traduction en français...")
    translate_segments(segments, lang)

    print("  [3/4] Génération de la voix off française...")
    srt = write_srt(segments, WORK_DIR / f"{slug}.srt")
    voiceover = build_voiceover(segments, slug)
    if not voiceover:
        print("        Voix off indisponible — sous-titres seuls.")

    print("  [4/4] Rendu final (sous-titres + audio)...")
    final = render(video, srt, voiceover, slug)

    source_text = " ".join(s.text_src for s in segments)
    return final, source_text


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python dubbing.py <video.mp4>")
        sys.exit(1)

    src = Path(sys.argv[1])
    out, transcript = dub_to_french(src, src.stem)
    print(f"\nVidéo française : {out}")
