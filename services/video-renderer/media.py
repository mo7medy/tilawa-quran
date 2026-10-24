"""Bounded downloads and actual decoder inspection. No user-supplied commands or paths."""
import hashlib
import json
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from PIL import Image

ALLOWED_AUDIO = {"download.quranicaudio.com", "audio.qurancdn.com", "verses.quran.com", "static.qurancdn.com"}


def download(url: str, destination: Path, limit: int, origin: str, digest: str | None = None):
    parsed = urlsplit(url)
    trusted = urlsplit(origin)
    if parsed.scheme != "https" or parsed.username or parsed.password or not (
        (parsed.netloc == trusted.netloc and parsed.path.startswith("/api/video-studio/"))
        or (parsed.hostname in ALLOWED_AUDIO and parsed.port in (None, 443))
    ):
        raise ValueError("INVALID_ASSET_URL")
    size = 0
    checksum = hashlib.sha256()
    with httpx.stream("GET", url, timeout=90, follow_redirects=False) as response:
        response.raise_for_status()
        if int(response.headers.get("content-length", 0)) > limit:
            raise ValueError("FILE_TOO_LARGE")
        with destination.open("wb") as output:
            for chunk in response.iter_bytes(65536):
                size += len(chunk)
                if size > limit:
                    raise ValueError("FILE_TOO_LARGE")
                checksum.update(chunk)
                output.write(chunk)
    if not size or (digest and checksum.hexdigest() != digest):
        raise ValueError("ASSET_VERIFICATION_FAILED")


def inspect_media(file: Path, mime: str, expected_duration: float | None = None):
    if mime.startswith("image/"):
        Image.MAX_IMAGE_PIXELS = 4096 * 4096
        expected = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}[mime]
        with Image.open(file) as image:
            width, height = image.size
            if image.format != expected or not 0 < width <= 4096 or not 0 < height <= 4096:
                raise ValueError("INVALID_FILE")
            image.verify()
        with Image.open(file) as image:
            image.load()
        return {"width": width, "height": height, "mime": mime}
    result = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(file)], capture_output=True, timeout=30, check=True)
    data = json.loads(result.stdout)
    videos = [s for s in data["streams"] if s["codec_type"] == "video"]
    if len(videos) != 1:
        raise ValueError("INVALID_FILE")
    video = videos[0]
    duration = float(data["format"].get("duration", 0))
    if "mp4" not in data["format"].get("format_name", "") or video["codec_name"] != "h264" or not 0 < duration <= 180.1 or not 0 < video["width"] <= 4096 or not 0 < video["height"] <= 4096:
        raise ValueError("INVALID_FILE")
    # Decode all frames, including malformed/truncated streams that a header-only probe misses.
    subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", str(file), "-map", "0:v:0", "-f", "null", "-"], capture_output=True, check=True, timeout=180)
    if expected_duration is not None:
        audio = [s for s in data["streams"] if s["codec_type"] == "audio"]
        if abs(duration - expected_duration) > 1 / 30 + 0.001 or len(audio) != 1 or audio[0]["codec_name"] != "aac":
            raise ValueError("INVALID_OUTPUT")
    return {"width": video["width"], "height": video["height"], "duration": duration, "codec": "h264", "mime": mime}
