"""Restore only the tracked assets needed for the five-font staging proof (never a production index)."""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
output = root / ".local-runtime/studio-proof-assets"
(output / "blobs").mkdir(parents=True, exist_ok=True)
paths = ["/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2", "/fonts/quran/hafs/nastaleeq/indopak/indopak-nastaleeq-waqf-lazim-v4.2.1.woff2", "/fonts/lang/arabic/NotoNaskhArabic-Regular.woff2", "/fonts/lang/Figtree/Figtree.ttf"]
paths += [f"/fonts/quran/hafs/{version}/woff2/p{page}.woff2" for version in ("v1", "v2", "v4/colrv1") for page in (1, 2, 3)]
files = {}
for source in paths:
    response = subprocess.run(["git", "show", f"HEAD:public{source}"], cwd=root, capture_output=True, check=True)
    checksum = hashlib.sha256(response.stdout).hexdigest()
    key = f"blobs/{checksum}"
    (output / key).write_bytes(response.stdout)
    files[source] = {"key": key, "sha256": checksum, "mime": "font/ttf" if source.endswith(".ttf") else "font/woff2"}
(output / "manifest.json").write_text(json.dumps({"renderVersion": "studio-1", "assetVersion": "staging-proof-only", "files": files}), encoding="utf-8")
print(json.dumps({"proofAssets": len(files), "productionIndex": False}))
