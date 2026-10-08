"""Sprite sheet slicer for the Paper Mario sheets in this folder.

Usage:
  python tools/slice.py scan    # detect sprite boxes, write tools/boxes/*.json + labeled contact sheets
  python tools/slice.py build   # read tools/sprites.json, write public/sprites/*.png + src/generated/sprites.json

Sheets are loose-packed on a solid background (magenta for most). `scan` finds
connected blobs of non-background pixels and numbers them in reading order.
`tools/sprites.json` then picks blob numbers per animation for each character.
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
BOX_DIR = ROOT / "tools" / "boxes"
CONTACT_DIR = Path(os.environ.get("CONTACT_DIR", ROOT / "tools" / "contact"))
OUT_DIR = ROOT / "public" / "sprites"
GEN_DIR = ROOT / "src" / "generated"

# Extra background colors per sheet (beyond the top-left pixel and full transparency).
EXTRA_BG = {
    "Bombette": [(255, 0, 0)],
    "player sprite sheet": [(84, 165, 75)],
    "Items": [],
    "Battle Extras & HUD": [(255, 255, 255)],
}
# Dilation radius used to merge near-touching parts of one sprite.
DILATE = {
    "player sprite sheet": 0,
    "Items": 0,
    "Battle Extras & HUD": 0,
}
SKIP = {"Backgrounds", "Title Screen", "Fonts"}


def sheet_key(path: Path) -> str:
    return path.stem.split(" - ")[-1]


def all_sheets():
    for p in sorted(ROOT.glob("*/*.png")):
        if p.parent.name in ("public", "tools", "node_modules", "dist"):
            continue
        if sheet_key(p) in SKIP:
            continue
        yield p


def load_mask(path: Path):
    key = sheet_key(path)
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.int16)
    rgb, alpha = a[..., :3], a[..., 3]
    bgs = [tuple(int(v) for v in a[0, 0, :3])] + EXTRA_BG.get(key, [])
    mask = alpha > 0
    for c in bgs:
        mask &= ~np.all(rgb == np.array(c), axis=-1)
    # Credits footer: everything below the last row that still contains the main bg color.
    main = np.all(rgb == np.array(bgs[0]), axis=-1)
    rows = np.where(main.any(axis=1))[0]
    if len(rows) and a[0, 0, 3] > 0:
        last = rows.max()
        mask[last + 1 :, :] = False
    return im, mask


def find_boxes(path: Path):
    key = sheet_key(path)
    im, mask = load_mask(path)
    d = DILATE.get(key, 0)
    m = ndimage.binary_dilation(mask, iterations=d) if d else mask
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    boxes = []
    for sl in ndimage.find_objects(lab):
        y0, y1 = sl[0].start, sl[0].stop
        x0, x1 = sl[1].start, sl[1].stop
        sub = mask[y0:y1, x0:x1]
        if sub.sum() < 12:
            continue
        ys, xs = np.where(sub)
        boxes.append([int(x0 + xs.min()), int(y0 + ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)])
    # reading order: band rows by vertical overlap
    boxes.sort(key=lambda b: (b[1], b[0]))
    rows, cur = [], []
    for b in boxes:
        if cur and b[1] > max(c[1] + c[3] * 0.6 for c in cur):
            rows.append(cur)
            cur = []
        cur.append(b)
    if cur:
        rows.append(cur)
    ordered = [b for r in rows for b in sorted(r, key=lambda b: b[0])]
    return im, mask, ordered


def scan():
    BOX_DIR.mkdir(parents=True, exist_ok=True)
    CONTACT_DIR.mkdir(parents=True, exist_ok=True)
    for p in all_sheets():
        key = sheet_key(p)
        im, mask, boxes = find_boxes(p)
        (BOX_DIR / f"{key}.json").write_text(json.dumps({"sheet": str(p.relative_to(ROOT)).replace("\\", "/"), "boxes": boxes}))
        s = 3 if im.width < 700 else 2
        big = im.resize((im.width * s, im.height * s), Image.NEAREST).convert("RGB")
        dr = ImageDraw.Draw(big)
        for i, (x, y, w, h) in enumerate(boxes):
            dr.rectangle([x * s, y * s, (x + w) * s - 1, (y + h) * s - 1], outline=(0, 255, 255))
            dr.rectangle([x * s, y * s, x * s + 7 * len(str(i)) + 2, y * s + 11], fill=(0, 0, 0))
            dr.text((x * s + 1, y * s), str(i), fill=(255, 255, 0))
        big.save(CONTACT_DIR / f"{key}.png")
        print(f"{key}: {len(boxes)} boxes")


def cut(im, mask, box):
    x, y, w, h = box
    sprite = np.asarray(im)[y : y + h, x : x + w].copy()
    sprite[..., 3] = np.where(mask[y : y + h, x : x + w], sprite[..., 3], 0)
    return sprite


def render(im, mask, boxes, f):
    """Render one frame spec to an RGBA array. See tools/sprites.json for the spec forms."""
    if isinstance(f, int):
        return cut(im, mask, boxes[f])
    if isinstance(f, list):
        return render(im, mask, boxes, {"parts": [[i, boxes[i][0], boxes[i][1]] for i in f]})
    if "rect" in f:
        x, y, w, h = f["rect"]
        sub = cut(im, mask, [x, y, w, h])
        ys, xs = np.where(sub[..., 3] > 0)
        return sub[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    if "stack" in f:
        ids, ov = f["stack"], f.get("ov", 0)
        dxs = f.get("dx", [0] * len(ids))
        dys = f.get("dy", [0] * len(ids))
        sizes = [boxes[i][2:] for i in ids]
        wmax = max(w for w, _ in sizes)
        parts, y = [], 0
        for i, (w, h), dx, dy in zip(ids, sizes, dxs, dys):
            parts.append([i, (wmax - w) // 2 + dx, y + dy])
            y += h - ov
        if f.get("reverse"):
            parts.reverse()
        return render(im, mask, boxes, {"parts": parts})
    pieces = []
    for p in f["parts"]:
        i, dx, dy = p[0], p[1], p[2]
        piece = cut(im, mask, boxes[i])
        opts = p[3] if len(p) > 3 else ""
        if "x" in opts:
            piece = piece[:, ::-1]
        if "y" in opts:
            piece = piece[::-1]
        for _ in range(opts.count("r")):  # each r = 90 degrees clockwise
            piece = np.rot90(piece, -1)
        pieces.append((piece, dx, dy))
    x0 = min(dx for _, dx, _ in pieces)
    y0 = min(dy for _, _, dy in pieces)
    x1 = max(dx + pc.shape[1] for pc, dx, _ in pieces)
    y1 = max(dy + pc.shape[0] for pc, _, dy in pieces)
    out = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    for pc, dx, dy in pieces:
        region = out[dy - y0 : dy - y0 + pc.shape[0], dx - x0 : dx - x0 + pc.shape[1]]
        region[pc[..., 3] > 0] = pc[pc[..., 3] > 0]
    return out


def sheet_data(cache, sheet):
    if sheet not in cache:
        path = next(p for p in all_sheets() if sheet_key(p) == sheet)
        cache[sheet] = find_boxes(path)
    return cache[sheet]


def build():
    spec = json.loads((ROOT / "tools" / "sprites.json").read_text())
    only = set(sys.argv[2:])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    GEN_DIR.mkdir(parents=True, exist_ok=True)
    cache = {}
    out = {}
    previews = []
    for cid, c in spec["chars"].items():
        im, mask, boxes = sheet_data(cache, c["sheet"])
        # Unique frames in first-seen order; anims refer to frame indices.
        frames, index, anims = [], {}, {}
        for anim, seq in c["anims"].items():
            anims[anim] = []
            for f in seq:
                k = json.dumps(f)
                if k not in index:
                    index[k] = len(frames)
                    frames.append(f)
                anims[anim].append(index[k])
        cuts = [render(im, mask, boxes, f) for f in frames]
        cw = max(s.shape[1] for s in cuts)
        ch = max(s.shape[0] for s in cuts)
        atlas = np.zeros((ch, cw * len(cuts), 4), dtype=np.uint8)
        for i, s in enumerate(cuts):
            h, w = s.shape[:2]
            ox = i * cw + (cw - w) // 2
            atlas[ch - h : ch, ox : ox + w] = s  # bottom aligned, centered
        Image.fromarray(atlas, "RGBA").save(OUT_DIR / f"{cid}.png")
        if not only or cid in only:
            previews.append((cid, atlas))
        out[cid] = {"src": f"sprites/{cid}.png", "w": cw, "h": ch, "n": len(cuts), "anims": anims, "scale": c.get("scale", 3)}

    # Icons: individually sized frames shelf-packed into one atlas.
    icons, rects = spec["icons"], {}
    cuts = {}
    for name, ic in icons.items():
        im, mask, boxes = sheet_data(cache, ic["sheet"])
        cuts[name] = render(im, mask, boxes, ic["f"])
    W, x, y, rowh = 512, 0, 0, 0
    for name, a in cuts.items():
        h, w = a.shape[:2]
        if x + w > W:
            x, y, rowh = 0, y + rowh + 1, 0
        rects[name] = [x, y, w, h]
        x += w + 1
        rowh = max(rowh, h)
    sheet = np.zeros((y + rowh, W, 4), dtype=np.uint8)
    for name, a in cuts.items():
        rx, ry, w, h = rects[name]
        sheet[ry : ry + h, rx : rx + w] = a
    Image.fromarray(sheet, "RGBA").save(OUT_DIR / "icons.png")
    if not only or "icons" in only:
        previews.append(("icons", sheet))

    (GEN_DIR / "sprites.json").write_text(json.dumps({"chars": out, "icons": {"src": "sprites/icons.png", "w": W, "h": int(sheet.shape[0]), "rects": rects}}, indent=1))
    print(f"built {len(out)} sprites, {len(rects)} icons")
    write_preview(previews)


def write_preview(previews):
    s = 2
    rows = []
    for cid, a in previews:
        img = Image.fromarray(a, "RGBA")
        img = img.resize((img.width * s, img.height * s), Image.NEAREST)
        bg = Image.new("RGB", (max(img.width, 200) + 10, img.height + 16), (60, 90, 60))
        bg.paste(img, (5, 14), img)
        ImageDraw.Draw(bg).text((5, 1), cid, fill=(255, 255, 0))
        rows.append(bg)
    # wrap into columns up to 1800px tall
    cols, col, hsum = [], [], 0
    for r in rows:
        if col and hsum + r.height > 1800:
            cols.append(col)
            col, hsum = [], 0
        col.append(r)
        hsum += r.height
    if col:
        cols.append(col)
    W = sum(max(r.width for r in c) for c in cols)
    H = max(sum(r.height for r in c) for c in cols)
    out = Image.new("RGB", (W, H), (30, 30, 30))
    x = 0
    for c in cols:
        y = 0
        for r in c:
            out.paste(r, (x, y))
            y += r.height
        x += max(r.width for r in c)
    CONTACT_DIR.mkdir(parents=True, exist_ok=True)
    out.save(CONTACT_DIR / "preview.png")


if __name__ == "__main__":
    {"scan": scan, "build": build}[sys.argv[1]]()
