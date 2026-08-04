"""
Publication quotidienne automatique EMO Robot FR.

Chaque jour : prend la vidéo la plus récente non encore publiée du compte officiel
Living.ai, la double en français (voix off + sous-titres), rédige une légende FR
et l'envoie sur TikTok.

    python main.py            # cycle quotidien (utilisé par la tâche planifiée)
    python main.py once <url> # traite une URL précise immédiatement
    python main.py check      # liste les vidéos disponibles sans rien publier
"""
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

# Force UTF-8 pour les emojis dans les légendes (Windows utilise cp1252 par défaut)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

load_dotenv()

LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / f"{datetime.now():%Y%m%d}.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# Compte officiel Living.ai — même contenu que leur page Facebook, mais
# contrairement à Facebook, il peut être énuméré automatiquement.
SOURCE = os.getenv("EMO_SOURCE", "https://www.tiktok.com/@livingai")

# Sandbox TikTok : seul le brouillon est autorisé. Passe à "false" une fois
# "Direct Post" activé et l'app validée par TikTok.
POST_TO_DRAFT = os.getenv("POST_TO_DRAFT", "true").lower() == "true"


def require_token():
    if not os.getenv("TIKTOK_ACCESS_TOKEN", "").strip():
        log.error("Aucun TIKTOK_ACCESS_TOKEN dans .env")
        log.error("Connecte-toi sur https://emo-robot-tiktok.vercel.app/dashboard,")
        log.error("puis colle le token affiché dans le fichier .env")
        sys.exit(1)


def pick_next_video() -> dict | None:
    """Retourne la vidéo la plus récente qui n'a pas encore été publiée."""
    from downloader import latest_from_source
    from pipeline import already_processed

    videos = latest_from_source(SOURCE, count=15)
    log.info(f"{len(videos)} vidéos trouvées sur la source")

    for video in videos:
        if not already_processed(video["url"]):
            return video

    return None


def run_daily():
    log.info("=" * 62)
    log.info(f"EMO ROBOT FR — {datetime.now():%d/%m/%Y %H:%M}")
    log.info("=" * 62)

    require_token()

    video = pick_next_video()
    if not video:
        log.info("Toutes les vidéos disponibles ont déjà été publiées.")
        return

    log.info(f"Sélection : {video['title'][:70]}")

    from pipeline import process
    try:
        result = process(
            video["url"],
            caption_override="",
            post_to_draft=POST_TO_DRAFT,
        )
        log.info(f"Publié — statut {result['status']}")
        if POST_TO_DRAFT:
            log.info("La vidéo attend dans tes brouillons TikTok.")
    except Exception as e:
        log.error(f"Échec : {e}")
        sys.exit(1)


def run_check():
    """Affiche ce qui serait publié, sans rien faire."""
    from downloader import latest_from_source
    from pipeline import already_processed

    videos = latest_from_source(SOURCE, count=15)
    log.info(f"Source : {SOURCE}")
    for i, v in enumerate(videos, 1):
        mark = "déjà publié" if already_processed(v["url"]) else "à publier"
        log.info(f"  {i:2d}. [{mark:11s}] {v['title'][:60]}")


def main():
    if len(sys.argv) == 1:
        run_daily()
        return

    command = sys.argv[1]

    if command == "check":
        run_check()

    elif command == "once" and len(sys.argv) > 2:
        require_token()
        from pipeline import process
        caption = sys.argv[3] if len(sys.argv) > 3 else ""
        try:
            result = process(sys.argv[2], caption_override=caption,
                             post_to_draft=POST_TO_DRAFT)
            log.info(f"Publié — statut {result['status']}")
        except Exception as e:
            log.error(f"Échec : {e}")
            sys.exit(1)

    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
