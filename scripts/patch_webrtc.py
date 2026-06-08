#!/usr/bin/env python3
"""Patch flutter_webrtc's SurfaceTextureRenderer.java for Flutter 3.27+ compatibility.

Flutter 3.27 renamed onSurfaceCleanup() to onSurfaceDestroyed() in the
TextureRegistry.SurfaceProducer.Callback interface. This patch renames
the method in flutter_webrtc's SurfaceTextureRenderer.java to match.

Usage: python3 patch_webrtc.py <path-to-SurfaceTextureRenderer.java>
"""

import sys
import os


def patch_file(path: str) -> bool:
    with open(path, 'r') as f:
        content = f.read()

    # Flutter 3.27 renamed onSurfaceCleanup -> onSurfaceDestroyed in the
    # TextureRegistry.SurfaceProducer.Callback interface. Both methods
    # have the same body (calling surfaceDestroyed()), so a simple rename is safe.
    if "onSurfaceCleanup" in content:
        content = content.replace("public void onSurfaceCleanup()", "public void onSurfaceDestroyed()")
        with open(path, 'w') as f:
            f.write(content)
        print(f"Renamed onSurfaceCleanup -> onSurfaceDestroyed in {path}")
        return True

    print("onSurfaceCleanup not found — file may already be patched")
    return False


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <path-to-SurfaceTextureRenderer.java>")
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"Error: file not found: {path}")
        sys.exit(1)

    patch_file(path)


if __name__ == "__main__":
    main()
