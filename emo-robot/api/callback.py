from http.server import BaseHTTPRequestHandler
import urllib.parse
import os
import requests
import json


def env(name: str) -> str:
    """Lit une variable d'env en retirant le BOM UTF-8 que Python ne strip() pas."""
    return os.environ.get(name, "").strip().lstrip("﻿").strip()


CLIENT_KEY = env("TIKTOK_CLIENT_KEY")
CLIENT_SECRET = env("TIKTOK_CLIENT_SECRET")

# Le code_verifier est passé en paramètre state étendu ou stocké côté session
# Pour simplifier sur Vercel, on stocke le verifier dans une variable d'env
CODE_VERIFIER = env("TIKTOK_CODE_VERIFIER")

REDIRECT_URI = env("TIKTOK_REDIRECT_URI")


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        code = params.get("code", [None])[0]
        error = params.get("error", [None])[0]

        if error:
            self._send_html(f"""
            <h2>❌ Erreur TikTok : {params.get('error_description', ['Inconnue'])[0]}</h2>
            <p>Retourne sur le portail développeur TikTok et vérifie tes paramètres.</p>
            """, 400)
            return

        if not code:
            self._send_html("<h2>⚠️ Pas de code reçu.</h2>", 400)
            return

        # Échange le code contre un access token (sans PKCE — flow serveur)
        resp = requests.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            data={
                "client_key": CLIENT_KEY,
                "client_secret": CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": REDIRECT_URI,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        data = resp.json()

        if "access_token" not in data:
            self._send_html(f"""
            <h2>❌ Erreur échange token</h2>
            <pre>{json.dumps(data, indent=2)}</pre>
            """, 400)
            return

        access_token = data["access_token"]
        refresh_token = data.get("refresh_token", "")

        self.send_response(302)
        self.send_header("Location", f"/dashboard?access_token={urllib.parse.quote(access_token)}&refresh_token={urllib.parse.quote(refresh_token)}")
        self.end_headers()

    def _send_html(self, body, status=200):
        encoded = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, *args):
        pass
