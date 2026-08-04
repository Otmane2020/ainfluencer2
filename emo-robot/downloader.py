"""
Télécharge une vidéo depuis une URL Facebook (post, vidéo, Reel) ou toute
source supportée par yt-dlp.

Note : lister automatiquement les posts d'une page Facebook n'est pas possible.
L'API Graph exige d'être administrateur de la Page, et yt-dlp ne gère que les
URLs de vidéos individuelles. On travaille donc à partir d'une URL fournie.
"""
import json
import subprocess
from pathlib import Path

DOWNLOAD_DIR = Path(__file__).parent / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)

COOKIES_FILE = Path(__file__).parent / "cookies.txt"


def _base_args() -> list[str]:
    """Arguments communs. Impersonate Chrome pour passer le bot-check TikTok CDN."""
    args = ["yt-dlp", "--no-warnings", "--no-playlist", "--impersonate", "Chrome-133"]
    if COOKIES_FILE.exists():
        args += ["--cookies", str(COOKIES_FILE)]
    return args


def latest_from_source(source: str, count: int = 10) -> list[dict]:
    """
    Liste les vidéos récentes d'un compte officiel EMO, la plus récente d'abord.

    Fonctionne sur le TikTok officiel Living.ai. Ne fonctionne PAS sur une page
    Facebook : Facebook n'expose aucune API de lecture pour une Page dont on n'est
    pas administrateur, et yt-dlp n'a pas d'extracteur de page.
    """
    cmd = _base_args() + [
        "--flat-playlist",
        "--print", "%(id)s\t%(url)s\t%(title)s",
        "--playlist-end", str(count),
        source,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)

    if result.returncode != 0 and not result.stdout.strip():
        raise RuntimeError(_explain_failure(result.stderr, source))

    videos = []
    for line in result.stdout.strip().split("\n"):
        parts = line.split("\t")
        if len(parts) < 2 or not parts[0].strip():
            continue
        videos.append({
            "id": parts[0].strip(),
            "url": parts[1].strip(),
            "title": parts[2].strip() if len(parts) > 2 else "",
        })
    return videos


def probe(url: str) -> dict:
    """Récupère les métadonnées sans télécharger. Lève une erreur si inaccessible."""
    cmd = _base_args() + ["--dump-json", "--skip-download", url]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    if result.returncode != 0:
        raise RuntimeError(_explain_failure(result.stderr, url))

    data = json.loads(result.stdout.strip().split("\n")[0])
    return {
        "title": data.get("title") or "",
        "description": data.get("description") or "",
        "duration": data.get("duration"),
        "language": data.get("language"),
    }


def download(url: str, slug: str) -> Path:
    """Télécharge la vidéo en MP4 et retourne le chemin du fichier."""
    output = DOWNLOAD_DIR / f"{slug}.mp4"
    if output.exists():
        return output

    cmd = _base_args() + [
        "-o", str(output),
        "--merge-output-format", "mp4",
        # TikTok veut du vertical ; on prend la meilleure qualité disponible
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

    if result.returncode != 0 or not output.exists():
        raise RuntimeError(_explain_failure(result.stderr, url))

    return output


def _explain_failure(stderr: str, url: str) -> str:
    """Traduit les erreurs yt-dlp en message actionnable."""
    low = stderr.lower()

    if "unsupported url" in low:
        return (
            f"URL non supportée : {url}\n"
            "yt-dlp ne sait pas lister une page Facebook entière. Fournis l'URL d'une "
            "vidéo ou d'un Reel précis, par exemple :\n"
            "  https://www.facebook.com/emorobot/videos/1234567890\n"
            "  https://www.facebook.com/reel/1234567890"
        )

    if "login" in low or "cookies" in low or "private" in low:
        return (
            "Facebook exige une session connectée pour cette vidéo.\n"
            "Exporte tes cookies depuis ton navigateur (extension « Get cookies.txt ») "
            f"et place le fichier ici :\n  {COOKIES_FILE}"
        )

    return f"Échec du téléchargement : {stderr.strip()[:400]}"


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python downloader.py <url_video_facebook>")
        sys.exit(1)

    info = probe(sys.argv[1])
    print(f"Titre       : {info['title']}")
    print(f"Durée       : {info['duration']}s")
    print(f"Description : {info['description'][:200]}")
