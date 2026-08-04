from http.server import BaseHTTPRequestHandler
import json


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Vérification TikTok (challenge)
        from urllib.parse import urlparse, parse_qs
        params = parse_qs(urlparse(self.path).query)
        challenge = params.get("challenge", [None])[0]

        if challenge:
            self._json({"challenge": challenge})
        else:
            self._json({"status": "ok"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
            print(f"Webhook TikTok reçu : {data}")
        except Exception:
            pass
        self._json({"status": "received"})

    def _json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
