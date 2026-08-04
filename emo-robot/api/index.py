from http.server import BaseHTTPRequestHandler
import urllib.parse
import os
import secrets


def env(name: str) -> str:
    return os.environ.get(name, "").strip().lstrip("﻿").strip()


CLIENT_KEY = env("TIKTOK_CLIENT_KEY")
REDIRECT_URI = env("TIKTOK_REDIRECT_URI")
# video.publish = post direct | video.upload = brouillon (sandbox)
SCOPES = "user.info.basic,video.upload"


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        state = secrets.token_urlsafe(16)
        params = {
            "client_key": CLIENT_KEY,
            "response_type": "code",
            "scope": SCOPES,
            "redirect_uri": REDIRECT_URI,
            "state": state,
        }
        auth_url = "https://www.tiktok.com/v2/auth/authorize/?" + urllib.parse.urlencode(params)
        self.send_response(302)
        self.send_header("Location", auth_url)
        self.end_headers()

    def log_message(self, *args):
        pass
