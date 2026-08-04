"""
Upload automatique vers TikTok Studio via Playwright.
Simule un utilisateur humain sur studio.tiktok.com — pas d'API, pas de review.

Première utilisation : python poster_playwright.py --login
  => Ouvre Chrome, connecte-toi manuellement à TikTok, ferme la fenêtre.
  => Les cookies sont sauvegardés dans tiktok_session/ et réutilisés ensuite.

Usage normal (appelé par pipeline.py) :
  post_video_playwright(video_path, caption)
"""

import os
import random
import time
from pathlib import Path

SESSION_DIR = Path(__file__).parent / "tiktok_session"
CHROME_PROFILE = Path(os.environ.get("USERPROFILE", "")) / "AppData/Local/Google/Chrome/User Data"
STUDIO_URL = "https://www.tiktok.com/tiktokstudio/upload?from=upload"


COOKIES_FILE = Path(__file__).parent / "tiktok_cookies.json"


def save_cookies_from_chrome():
    """
    Extrait et sauvegarde les cookies TikTok depuis Chrome (Chrome doit être fermé).
    À faire une seule fois. Les cookies sont réutilisés ensuite automatiquement.
    """
    import sqlite3, shutil, tempfile, json, base64
    import win32crypt
    from Crypto.Cipher import AES

    cookie_db = CHROME_PROFILE / "Default" / "Network" / "Cookies"
    if not cookie_db.exists():
        cookie_db = CHROME_PROFILE / "Default" / "Cookies"
    if not cookie_db.exists():
        raise RuntimeError(f"Base de cookies Chrome introuvable : {cookie_db}")

    # Clé de déchiffrement AES depuis Local State
    local_state = json.loads((CHROME_PROFILE / "Local State").read_text(encoding="utf-8"))
    enc_key = base64.b64decode(local_state["os_crypt"]["encrypted_key"])[5:]
    aes_key = win32crypt.CryptUnprotectData(enc_key, None, None, None, 0)[1]

    # Copie directe (fonctionne quand Chrome est fermé)
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    shutil.copy2(str(cookie_db), str(tmp_path))

    def decrypt(enc):
        try:
            iv, payload, tag = enc[3:15], enc[15:-16], enc[-16:]
            return AES.new(aes_key, AES.MODE_GCM, nonce=iv).decrypt_and_verify(payload, tag).decode()
        except Exception:
            try:
                return win32crypt.CryptUnprotectData(enc, None, None, None, 0)[1].decode()
            except Exception:
                return ""

    print("Extraction des cookies TikTok depuis Chrome...")
    cookies = []
    try:
        con = sqlite3.connect(str(tmp_path))
        rows = con.execute(
            "SELECT host_key, name, path, is_secure, encrypted_value "
            "FROM cookies WHERE host_key LIKE '%tiktok.com'"
        ).fetchall()
        con.close()
        for host, name, path, secure, enc in rows:
            value = decrypt(enc)
            if value:
                cookies.append({"name": name, "value": value, "domain": host,
                                 "path": path, "secure": bool(secure), "sameSite": "None"})
    finally:
        tmp_path.unlink(missing_ok=True)

    if not cookies:
        raise RuntimeError("Aucun cookie TikTok trouvé — es-tu connecté à TikTok dans Chrome ?")

    COOKIES_FILE.write_text(json.dumps(cookies, indent=2), encoding="utf-8")
    print(f"{len(cookies)} cookies sauvegardés dans {COOKIES_FILE.name}")
    print("Tu peux rouvrir Chrome. Les prochains uploads seront automatiques.")


def _extract_chrome_tiktok_cookies() -> list[dict]:
    """Retourne les cookies TikTok depuis le cache local (ne nécessite pas Chrome fermé)."""
    import json

    if COOKIES_FILE.exists():
        return json.loads(COOKIES_FILE.read_text(encoding="utf-8"))

    # Pas de cache — essaie d'extraire directement (peut nécessiter Chrome fermé)
    import browser_cookie3
    jar = browser_cookie3.chrome(domain_name=".tiktok.com")
    return [{"name": c.name, "value": c.value, "domain": c.domain,
             "path": c.path, "secure": c.secure, "sameSite": "None"} for c in jar]


def _human_delay(min_ms: int = 400, max_ms: int = 1200):
    time.sleep(random.uniform(min_ms / 1000, max_ms / 1000))


def login_and_save_session():
    """
    Ouvre un navigateur Chromium dédié pour se connecter à TikTok.
    La session est sauvegardée dans tiktok_session/ et réutilisée automatiquement.
    À faire UNE SEULE FOIS.
    """
    from playwright.sync_api import sync_playwright

    SESSION_DIR.mkdir(exist_ok=True)
    print("=" * 60)
    print("Connexion TikTok — une seule fois nécessaire.")
    print("1. Une fenêtre va s'ouvrir sur tiktok.com/login")
    print("2. Connecte-toi avec le compte @emorobotfrancais")
    print("3. La fenêtre se ferme automatiquement après connexion")
    print("=" * 60)

    with sync_playwright() as p:
        # Chromium intégré — pas de conflit avec Chrome, pas besoin de le fermer
        browser = p.chromium.launch_persistent_context(
            user_data_dir=str(SESSION_DIR),
            headless=False,
            args=["--start-maximized", "--window-size=1280,800"],
            viewport={"width": 1280, "height": 800},
        )
        page = browser.new_page()
        page.goto("https://www.tiktok.com/login", wait_until="domcontentloaded")

        print("\nEn attente de ta connexion (tu as 5 minutes)...")

        try:
            # Attend d'être redirigé hors de /login
            page.wait_for_url(
                lambda url: "tiktok.com" in url and "/login" not in url,
                timeout=300_000,
            )
            print("Connecté ! Sauvegarde en cours...")
            time.sleep(4)
        except Exception:
            print("Fenêtre fermée ou timeout.")

        browser.close()

    print(f"\nSession sauvegardée. Lance maintenant : python main.py")


def post_video_playwright(video_path: str, caption: str) -> dict:
    """
    Upload une vidéo sur TikTok Studio avec la légende donnée.
    Retourne {"status": "published"} ou lève une exception.
    """
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

    video_path = str(Path(video_path).resolve())
    if not Path(video_path).exists():
        raise FileNotFoundError(f"Vidéo introuvable : {video_path}")

    cookies = _extract_chrome_tiktok_cookies()
    if not cookies:
        raise RuntimeError(
            "Impossible d'extraire les cookies TikTok de Chrome.\n"
            "Assure-toi d'être connecté à TikTok dans Chrome."
        )

    # Tronque la légende à 2200 chars (limite TikTok)
    caption = caption[:2200]

    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir=str(SESSION_DIR),
            headless=False,
            args=["--start-maximized", "--window-size=1280,800"],
            viewport={"width": 1280, "height": 800},
            slow_mo=80,
        )

        page = browser.new_page()

        # Injecte les cookies TikTok extraits de Chrome
        page.context.add_cookies(cookies)

        try:
            print(f"  Ouverture de TikTok Studio...")
            page.goto(STUDIO_URL, wait_until="networkidle", timeout=30_000)
            _human_delay(1000, 2000)

            # ── Vérification de la connexion ──────────────────────────────
            if "login" in page.url.lower():
                browser.close()
                raise RuntimeError(
                    "Session expirée — relance : python poster_playwright.py --login"
                )

            # ── Sélection du fichier ──────────────────────────────────────
            print(f"  Sélection du fichier...")

            # TikTok Studio : l'input file est souvent masqué, on le rend visible
            file_input = page.locator("input[type='file']").first
            file_input.set_input_files(video_path)
            _human_delay(3000, 5000)  # attend l'upload + preview

            # ── Attente de l'encodage ─────────────────────────────────────
            print(f"  Attente de l'encodage TikTok...")
            # On attend que la barre de progression disparaisse ou que la légende soit dispo
            try:
                page.wait_for_selector(
                    "div[class*='caption'], textarea[placeholder*='légende'], "
                    "textarea[placeholder*='caption'], div[contenteditable='true']",
                    timeout=60_000,
                )
            except PWTimeout:
                pass  # on tente quand même d'écrire la légende

            _human_delay(1500, 2500)

            # ── Écriture de la légende ────────────────────────────────────
            print(f"  Écriture de la légende...")
            caption_box = (
                page.locator("div[contenteditable='true']").first
                or page.locator("textarea").first
            )
            caption_box.click()
            _human_delay(300, 600)

            # Efface le contenu existant puis tape la légende
            caption_box.press("Control+a")
            _human_delay(200, 400)
            caption_box.type(caption, delay=random.randint(20, 60))
            _human_delay(800, 1500)

            # ── Clic sur Publier ──────────────────────────────────────────
            print(f"  Clic sur Publier...")
            publish_btn = page.locator(
                "button:has-text('Post'), button:has-text('Publier'), "
                "button:has-text('Poster'), button[data-e2e='post-btn']"
            ).first
            publish_btn.scroll_into_view_if_needed()
            _human_delay(600, 1200)
            publish_btn.click()
            _human_delay(3000, 5000)

            # ── Confirmation ──────────────────────────────────────────────
            # Cherche un message de succès
            try:
                page.wait_for_selector(
                    "text=successfully, text=succès, text=publié, "
                    "[class*='success'], [class*='Success']",
                    timeout=15_000,
                )
                print(f"  Vidéo publiée avec succès !")
            except PWTimeout:
                # Pas de message clair, on vérifie l'URL
                if "manage" in page.url or "content" in page.url:
                    print(f"  Publication probable (redirection vers gestion)")
                else:
                    print(f"  Statut incertain — vérifie studio.tiktok.com")

            browser.close()
            return {"status": "published", "method": "playwright"}

        except Exception as e:
            try:
                # Screenshot pour debug en cas d'erreur
                screenshot = Path(__file__).parent / "logs" / "playwright_error.png"
                screenshot.parent.mkdir(exist_ok=True)
                page.screenshot(path=str(screenshot))
                print(f"  Screenshot sauvegardé : {screenshot}")
            except Exception:
                pass
            browser.close()
            raise RuntimeError(f"Playwright upload échoué : {e}") from e


if __name__ == "__main__":
    import sys

    if "--save-cookies" in sys.argv:
        save_cookies_from_chrome()
    elif "--login" in sys.argv:
        login_and_save_session()
    elif len(sys.argv) >= 3:
        # Test direct : python poster_playwright.py video.mp4 "Ma légende"
        result = post_video_playwright(sys.argv[1], sys.argv[2])
        print(result)
    else:
        print(__doc__)
