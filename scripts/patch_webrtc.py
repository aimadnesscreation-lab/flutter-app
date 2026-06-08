#!/usr/bin/env python3
"""Patch flutter_webrtc's SurfaceTextureRenderer.java for Flutter 3.27+ compatibility.

Flutter 3.27 added onSurfaceDestroyed() to the TextureRegistry.SurfaceProducer.Callback
interface, but flutter_webrtc from git main hasn't implemented it yet. This patch
adds the missing method.

Usage: python3 patch_webrtc.py <path-to-SurfaceTextureRenderer.java>
"""

import sys
import os


def patch_file(path: str) -> bool:
    with open(path, 'r') as f:
        content = f.read()

    # The anonymous Callback class in surfaceCreated() only has onSurfaceAvailable().
    # We need to add onSurfaceDestroyed() after it.
    old = '''              @Override
              public void onSurfaceAvailable() {
              }
            }'''

    new = '''              @Override
              public void onSurfaceAvailable() {
              }

              @Override
              public void onSurfaceDestroyed() {
                surfaceDestroyed();
              }
            }'''

    if old in content:
        content = content.replace(old, new)
        with open(path, 'w') as f:
            f.write(content)
        return True

    # Already patched or different version — that's fine
    return False


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <path-to-SurfaceTextureRenderer.java>")
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"Error: file not found: {path}")
        sys.exit(1)

    if patch_file(path):
        print(f"Patched {path}")
    else:
        print("Pattern not found — file may already be patched or version differs")


if __name__ == "__main__":
    main()
