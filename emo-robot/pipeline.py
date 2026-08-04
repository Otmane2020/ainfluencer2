"""
Pipeline complet : URL Facebook -> vidéo française -> brouillon TikTok.

  URL  ->  téléchargement  ->  transcription  ->  traduction
       ->  voix off FR + sous-titres  ->  légende FR  ->  TikTok
"""
import hashlib
import json
from datetime import datetime
from pathlib import Path

QUEUE_FILE = Path(__file__).parent / "queue.json"
HISTORY_FILE = Path(__file__).parent / "published.json"


def slug_for(url: str) -> str:
    """Identifiant court et stable dérivé de l'URL, pour nommer les fichiers."""
    digest = hashlib.sha1(url.encode()).hexdigest()[:10]
    return f"{datetime.now():%Y%m%d}_{digest}"


def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return default


def save_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def process(url: str, caption_override: str = "", post_to_draft: bool = True) -> dict:
    """
    Traite une URL de bout en bout. Retourne un dict avec le résultat.
    Lève une exception si une étape échoue.
    """
    from downloader import probe, download
    from dubbing import dub_to_french
    from translator import translate_and_caption
    from pathlib import Path as _Path

    # Playwright si session disponible, API TikTok sinon
    _session = _Path(__file__).parent / "tiktok_session"
    if _session.exists():
        from poster_playwright import post_video_playwright as _post
        def post_video_to_tiktok(video_path, caption, post_to_draft=True):
            return _post(video_path, caption)
    else:
        from poster import post_video_to_tiktok

    slug = slug_for(url)
    print(f"\n=== {url}")

    print("[1] Analyse de la source...")
    info = probe(url)
    if info["title"]:
        print(f"    Titre : {info['title']}")

    print("[2] Téléchargement...")
    original = download(url, slug)
    print(f"    {original.name} ({original.stat().st_size / 1024 / 1024:.1f} Mo)")

    print("[3] Doublage français...")
    french_video, transcript = dub_to_french(original, slug)
    print(f"    {french_video.name}")

    print("[4] Rédaction de la légende...")
    if caption_override.strip():
        caption = caption_override.strip()
    else:
        source_text = "\n".join(
            part for part in (info["title"], info["description"], transcript) if part
        )
        caption = translate_and_caption(source_text)
    print(f"    {caption[:120]}...")

    print("[5] Envoi vers TikTok...")
    result = post_video_to_tiktok(str(french_video), caption, post_to_draft=post_to_draft)

    history = load_json(HISTORY_FILE, [])
    history.append({
        "url": url,
        "slug": slug,
        "caption": caption,
        "video": str(french_video),
        "publish_id": result.get("publish_id"),
        "status": result.get("status"),
        "processed_at": datetime.now().isoformat(timespec="seconds"),
    })
    save_json(HISTORY_FILE, history)

    return {"slug": slug, "caption": caption, "video": str(french_video), **result}


def already_processed(url: str) -> bool:
    return any(entry.get("url") == url for entry in load_json(HISTORY_FILE, []))


def enqueue(url: str, caption: str = "", when: str = ""):
    """Ajoute une URL à la file d'attente (utilisé par le dashboard)."""
    queue = load_json(QUEUE_FILE, [])
    queue.append({
        "url": url,
        "caption": caption,
        "when": when or datetime.now().isoformat(timespec="seconds"),
        "added_at": datetime.now().isoformat(timespec="seconds"),
    })
    save_json(QUEUE_FILE, queue)


def next_due() -> dict | None:
    """Retourne le prochain élément dont l'heure est passée, sans le retirer."""
    now = datetime.now().isoformat(timespec="seconds")
    queue = load_json(QUEUE_FILE, [])
    due = [item for item in queue if item.get("when", "") <= now
           and not already_processed(item["url"])]
    return due[0] if due else None


def mark_done(url: str):
    queue = [item for item in load_json(QUEUE_FILE, []) if item.get("url") != url]
    save_json(QUEUE_FILE, queue)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python pipeline.py <url_video_facebook> [légende]")
        sys.exit(1)

    url = sys.argv[1]
    caption = sys.argv[2] if len(sys.argv) > 2 else ""
    outcome = process(url, caption_override=caption)
    print(f"\nTerminé : {outcome['status']}")
