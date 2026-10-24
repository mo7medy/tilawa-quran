"""Modal deployment: private HTTP dispatcher, independently scaled export and probe workers."""
import hashlib
import hmac
import json
import os
from pathlib import Path
import select
import subprocess
import tempfile
import time

import modal

ROOT = Path(__file__).resolve().parents[2]
SERVICE = ROOT / "services/video-renderer"
APP_NAME = os.environ.get("STUDIO_MODAL_APP", "tilawa-video-studio-staging")
SECRET_NAME = os.environ.get("STUDIO_MODAL_SECRET_NAME", "tilawa-video-studio-staging")
image = (
    modal.Image.from_registry("node:24-bookworm-slim", add_python="3.13")
    .apt_install("ffmpeg", "libnss3", "libatk1.0-0", "libatk-bridge2.0-0", "libcups2", "libdrm2", "libxkbcommon0", "libxcomposite1", "libxdamage1", "libxrandr2", "libgbm1", "libasound2", "fonts-noto-cjk")
    .pip_install("fastapi==0.115.12", "httpx==0.28.1", "pillow==11.2.1")
    .add_local_file(SERVICE / "package.json", "/opt/studio/services/video-renderer/package.json", copy=True)
    .add_local_file(SERVICE / "package-lock.json", "/opt/studio/services/video-renderer/package-lock.json", copy=True)
    .run_commands("cd /opt/studio/services/video-renderer && npm ci --ignore-scripts")
    .add_local_dir(ROOT / "src/features/video-studio/scene", "/opt/studio/src/features/video-studio/scene", copy=True)
    .add_local_file(ROOT / "src/features/video-studio/contracts.ts", "/opt/studio/src/features/video-studio/contracts.ts", copy=True)
    .add_local_file(ROOT / "src/features/video-studio/typography.ts", "/opt/studio/src/features/video-studio/typography.ts", copy=True)
    .add_local_file(ROOT / "src/features/video-studio/validation.ts", "/opt/studio/src/features/video-studio/validation.ts", copy=True)
    .add_local_file(ROOT / "types/QuranReader.ts", "/opt/studio/types/QuranReader.ts", copy=True)
    .add_local_dir(SERVICE, "/opt/studio/services/video-renderer", copy=True, ignore=["node_modules", "bundle", "__pycache__", ".env", "*.sqlite*"])
    .run_commands("cd /opt/studio/services/video-renderer && npm run bundle")
    .workdir("/opt/studio/services/video-renderer")
)
app = modal.App(APP_NAME, image=image)
secrets = [modal.Secret.from_name(SECRET_NAME)]


def callback(path, payload):
    import httpx
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
    timestamp = str(int(time.time() * 1000))
    signature = hmac.new(os.environ["STUDIO_SIGNING_SECRET"].encode(), timestamp.encode() + b"." + raw, hashlib.sha256).hexdigest()
    response = httpx.post(os.environ["STUDIO_ORIGIN"].rstrip("/") + "/api/video-studio/internal/" + path, content=raw, headers={"Content-Type": "application/json", "x-studio-time": timestamp, "x-studio-signature": signature}, timeout=20)
    response.raise_for_status()
    return response.json()


@app.function(cpu=2, memory=4096, timeout=1200, max_containers=2, secrets=secrets)
def render(job_id: str, attempt: int):
    import httpx
    from media import download, inspect_media
    payload = {"jobId": job_id, "attempt": attempt}
    try:
        claimed = callback("claim", payload)
    except httpx.HTTPStatusError as error:
        if error.response.status_code == 409:
            return {"accepted": False}
        raise
    process = None
    try:
        with tempfile.TemporaryDirectory(prefix="tilawa-") as directory:
            folder = Path(directory)
            manifest = claimed["manifest"]
            origin = os.environ["STUDIO_ORIGIN"]
            for index, asset in enumerate(manifest["fonts"]):
                name = f"font-{index}.woff2" if asset["family"] != "StudioTranslationFallback" else f"font-{index}.ttf"
                download(asset["url"], folder / name, 12 * 1024 * 1024, origin, asset["sha256"])
                asset["url"] = name
                if callback("progress", {**payload, "status": "preparing", "progress": 0}).get("cancel"):
                    return
            download(manifest["audio"]["url"], folder / "audio.mp3", 256 * 1024 * 1024, origin)
            manifest["audio"]["url"] = "audio.mp3"
            background = manifest["background"]
            if background["type"] != "color":
                name = "background.mp4" if background["type"] == "video" else "background.png"
                download(background["url"], folder / name, 50 * 1024 * 1024, origin)
                background["url"] = name
            (folder / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
            if callback("progress", {**payload, "status": "rendering", "progress": 0}).get("cancel"):
                return
            process = subprocess.Popen(["node", "render.mjs", directory], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            status = "rendering"
            progress = 0
            last_update = 0
            code = "RENDER_FAILED"
            while process.poll() is None:
                readable, _, _ = select.select([process.stdout], [], [], 1)
                if readable:
                    line = process.stdout.readline()
                    try:
                        event = json.loads(line)
                        status = event.get("status", status)
                        progress = max(progress, event.get("progress", 0))
                        code = event.get("error", code)
                    except (ValueError, TypeError):
                        pass
                if time.monotonic() - last_update >= 10:
                    if callback("progress", {**payload, "status": status, "progress": progress}).get("cancel"):
                        process.kill()
                        process.wait()
                        return
                    last_update = time.monotonic()
            # Read the final structured error even if the child exited between loop iterations.
            for line in process.stdout:
                try:
                    code = json.loads(line).get("error", code)
                except ValueError:
                    pass
            if process.returncode:
                raise ValueError(code)
            output = folder / "output.mp4"
            inspect_media(output, "video/mp4", manifest["durationMs"] / 1000)
            if callback("progress", {**payload, "status": "uploading", "progress": 97}).get("cancel"):
                return
            size = output.stat().st_size
            if size > 100 * 1024 * 1024:
                raise ValueError("OUTPUT_TOO_LARGE")
            with output.open("rb") as file:
                response = httpx.put(claimed["outputUrl"], content=file, headers={"Content-Length": str(size), "Content-Type": "video/mp4"}, timeout=90)
                response.raise_for_status()
            callback("finish", {**payload, "success": True})
    except Exception as error:
        code = str(error) if isinstance(error, ValueError) and str(error).isupper() else "RENDER_FAILED"
        retryable = isinstance(error, (httpx.TransportError, TimeoutError)) or isinstance(error, httpx.HTTPStatusError) and error.response.status_code >= 500
        try:
            callback("finish", {**payload, "success": False, "error": code, "retryable": retryable})
        except Exception:
            pass  # The durable D1 watchdog reconciles lost callbacks.
    finally:
        if process and process.poll() is None:
            process.kill()
            process.wait()


@app.function(cpu=1, memory=1024, timeout=240, max_containers=2, secrets=secrets)
def probe(asset_id: str, url: str, mime: str, size: int):
    from media import download, inspect_media
    metadata = {}
    valid = False
    try:
        with tempfile.TemporaryDirectory(prefix="tilawa-probe-") as directory:
            file = Path(directory) / "upload"
            download(url, file, min(size, 50 * 1024 * 1024), os.environ["STUDIO_ORIGIN"])
            metadata = inspect_media(file, mime)
            valid = file.stat().st_size == size
    except Exception:
        pass
    callback("asset", {"assetId": asset_id, "valid": valid, "metadata": metadata})


@app.function(secrets=secrets, max_containers=2, timeout=60)
@modal.asgi_app(requires_proxy_auth=True)
def api():
    from fastapi import FastAPI
    from pydantic import BaseModel, Field
    web = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    class Job(BaseModel):
        jobId: str = Field(pattern=r"^[0-9a-f-]{36}$")
        attempt: int = Field(ge=1, le=2)

    class Upload(BaseModel):
        assetId: str = Field(pattern=r"^[0-9a-f-]{36}$")
        url: str = Field(max_length=2048)
        mime: str = Field(pattern=r"^(image/(jpeg|png|webp)|video/mp4)$")
        size: int = Field(gt=0, le=50 * 1024 * 1024)

    class Cancel(BaseModel):
        callId: str = Field(pattern=r"^fc-[a-zA-Z0-9]+$")

    @web.post("/jobs", status_code=202)
    async def create_job(body: Job):
        call = await render.spawn.aio(body.jobId, body.attempt)
        return {"callId": call.object_id}

    @web.post("/probe", status_code=202)
    async def create_probe(body: Upload):
        call = await probe.spawn.aio(body.assetId, body.url, body.mime, body.size)
        return {"callId": call.object_id}

    @web.post("/cancel")
    async def cancel_job(body: Cancel):
        await modal.FunctionCall.from_id(body.callId).cancel.aio()
        return {"ok": True}

    return web
