"""
Publie une vidéo sur TikTok via l'API Content Posting v2.
"""
import os
import json
import time
import requests
from pathlib import Path
from dotenv import load_dotenv, set_key

load_dotenv()

ENV_FILE = os.path.join(os.path.dirname(__file__), ".env")
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "tokens.json")

CLIENT_KEY = os.getenv("TIKTOK_CLIENT_KEY")
CLIENT_SECRET = os.getenv("TIKTOK_CLIENT_SECRET")


def _get_access_token() -> str:
    token = os.getenv("TIKTOK_ACCESS_TOKEN", "").strip()
    if not token:
        raise RuntimeError(
            "Pas de TIKTOK_ACCESS_TOKEN dans .env\n"
            "Lance d'abord : python auth.py"
        )
    return token


def refresh_token_if_needed() -> str:
    """Rafraîchit le token si nécessaire (durée de vie ~24h)."""
    refresh = os.getenv("TIKTOK_REFRESH_TOKEN", "").strip()
    if not refresh:
        return _get_access_token()

    resp = requests.post(
        "https://open.tiktokapis.com/v2/oauth/token/",
        data={
            "client_key": CLIENT_KEY,
            "client_secret": CLIENT_SECRET,
            "grant_type": "refresh_token",
            "refresh_token": refresh,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    data = resp.json()
    if "access_token" in data:
        set_key(ENV_FILE, "TIKTOK_ACCESS_TOKEN", data["access_token"])
        if "refresh_token" in data:
            set_key(ENV_FILE, "TIKTOK_REFRESH_TOKEN", data["refresh_token"])
        # Reload
        load_dotenv(override=True)
        return data["access_token"]

    return _get_access_token()


def post_video_to_tiktok(
    video_path: str,
    caption: str,
    post_to_draft: bool = False,
) -> dict:
    """
    Publie une vidéo sur TikTok.

    Args:
        video_path: Chemin vers le fichier MP4
        caption: Légende (max 2200 chars)
        post_to_draft: Si True, envoie dans les brouillons (inbox) au lieu de publier directement

    Returns:
        dict avec publish_id et status
    """
    access_token = refresh_token_if_needed()
    video_file = Path(video_path)

    if not video_file.exists():
        raise FileNotFoundError(f"Vidéo introuvable : {video_path}")

    file_size = video_file.stat().st_size
    print(f"  Upload vidéo : {video_file.name} ({file_size / 1024 / 1024:.1f} MB)")

    # Étape 1 : Initialiser l'upload
    post_mode = "INBOX" if post_to_draft else "DIRECT_POST"
    init_payload = {
        "post_info": {
            "title": caption[:2200],
            "privacy_level": "PUBLIC_TO_EVERYONE",
            "disable_duet": False,
            "disable_comment": False,
            "disable_stitch": False,
        },
        "source_info": {
            "source": "FILE_UPLOAD",
            "video_size": file_size,
            "chunk_size": file_size,
            "total_chunk_count": 1,
        },
        "post_mode": post_mode,
        "media_type": "VIDEO",
    }

    init_resp = requests.post(
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
        json=init_payload,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
    )
    init_data = init_resp.json()

    if init_data.get("error", {}).get("code") != "ok":
        raise RuntimeError(f"Erreur init upload TikTok : {init_data}")

    publish_id = init_data["data"]["publish_id"]
    upload_url = init_data["data"]["upload_url"]

    print(f"  Publish ID : {publish_id}")
    print(f"  Upload en cours...")

    # Étape 2 : Uploader le fichier vidéo
    with open(video_path, "rb") as f:
        video_data = f.read()

    upload_resp = requests.put(
        upload_url,
        data=video_data,
        headers={
            "Content-Type": "video/mp4",
            "Content-Range": f"bytes 0-{file_size - 1}/{file_size}",
            "Content-Length": str(file_size),
        },
    )

    if upload_resp.status_code not in (200, 201, 206):
        raise RuntimeError(f"Erreur upload vidéo : {upload_resp.status_code} {upload_resp.text}")

    print("  Vidéo uploadée ! Vérification du statut...")

    # Étape 3 : Vérifier le statut de publication
    for attempt in range(10):
        time.sleep(5)
        status_resp = requests.post(
            "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
            json={"publish_id": publish_id},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
        )
        status_data = status_resp.json()
        status = status_data.get("data", {}).get("status", "UNKNOWN")
        print(f"  Statut : {status} (tentative {attempt + 1}/10)")

        if status in ("PUBLISH_COMPLETE", "SEND_TO_USER_INBOX"):
            print(f"  ✅ Publication réussie ! Statut final : {status}")
            return {"publish_id": publish_id, "status": status}

        if status in ("FAILED", "CANCELLED"):
            fail_code = status_data.get("data", {}).get("fail_reason", "inconnue")
            raise RuntimeError(f"Publication échouée : {fail_code}")

    raise RuntimeError("Timeout : la vidéo n'a pas été publiée dans les délais")


if __name__ == "__main__":
    # Test rapide
    import sys
    if len(sys.argv) < 2:
        print("Usage: python poster.py <chemin_video.mp4>")
    else:
        result = post_video_to_tiktok(
            sys.argv[1],
            "Test de publication depuis Emo Robot FR 🤖 #EMORobot #test",
            post_to_draft=True,  # Brouillon pour tester
        )
        print(result)
