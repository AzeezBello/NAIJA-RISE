from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from pathlib import Path

BUILD_DIR = Path("unity/Builds/WebGL").resolve()

if not (BUILD_DIR / "index.html").exists():
    raise SystemExit(
        f"WebGL index.html not found in {BUILD_DIR}\n"
        "Update BUILD_DIR to the folder containing index.html."
    )

class UnityWebGLHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BUILD_DIR), **kwargs)

    def guess_type(self, path):
        if path.endswith(".gz"):
            path = path[:-3]
        if path.endswith(".wasm"):
            return "application/wasm"
        return super().guess_type(path)

    def end_headers(self):
        path = urlsplit(self.path).path
        if path.endswith(".gz"):
            self.send_header("Content-Encoding", "gzip")
        super().end_headers()

server = ThreadingHTTPServer(("127.0.0.1", 8080), UnityWebGLHandler)
print(f"Serving Unity WebGL build from {BUILD_DIR}")
print("Open http://127.0.0.1:8080")
server.serve_forever()
