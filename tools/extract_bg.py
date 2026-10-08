"""Cut battle backgrounds and title art into public/bg/.

Usage: python tools/extract_bg.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "bg"

# Backgrounds sheet is a 4x5 grid of 298x202 tiles: (row, col) -> name
GRID = {
    (0, 0): "jungle", (0, 1): "desert", (0, 2): "castle", (0, 3): "flowers",
    (1, 0): "snow", (1, 1): "starway", (1, 2): "hills", (1, 3): "storm",
    (2, 1): "pastel", (2, 2): "forest",
    (3, 0): "candy", (3, 1): "sandstorm", (3, 2): "canyon",
    (4, 0): "dunes", (4, 1): "hedges", (4, 2): "stars",
}
# Title screen pieces: name -> approximate rect (x, y, w, h), trimmed to opaque pixels
TITLE = {
    "title_art": (0, 0, 300, 175),
    "logo": (300, 0, 190, 105),
    "haven1": (0, 452, 267, 164),
    "haven2": (269, 452, 267, 164),
    "haven3": (538, 452, 267, 164),
    "haven4": (807, 452, 266, 164),
}


def trim(im):
    a = np.asarray(im)
    ys, xs = np.where(a[..., 3] > 0)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(ROOT / "Backgrounds" / "Nintendo 64 - Paper Mario - Miscellaneous - Backgrounds.png").convert("RGBA")
    tw, th = sheet.width // 4, sheet.height // 5
    for (r, c), name in GRID.items():
        tile = sheet.crop((c * tw, r * th, (c + 1) * tw, (r + 1) * th))
        trim(tile).convert("RGB").save(OUT / f"{name}.png")
    title = Image.open(ROOT / "UI" / "Nintendo 64 - Paper Mario - Miscellaneous - Title Screen.png").convert("RGBA")
    for name, (x, y, w, h) in TITLE.items():
        trim(title.crop((x, y, x + w, y + h))).save(OUT / f"{name}.png")
    print("ok", len(GRID) + len(TITLE))


if __name__ == "__main__":
    main()
