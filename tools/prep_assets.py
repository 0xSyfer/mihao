import os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from key import cut, bbox

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "source")
OUT = os.path.join(ROOT, "public", "assets", "images")
ZONES = ["temple", "mahjong", "wall", "dragon"]
BG_W = 1920


def save(im, name, q=82):
    p = os.path.join(OUT, name)
    im.save(p, "WEBP", quality=q, method=6)
    print(f"{name:28s} {im.size}  {os.path.getsize(p) // 1024} KB")


def trimmed(path, max_side):
    c = cut(Image.open(path))
    c = c.crop(bbox(c, 20))
    c.thumbnail((max_side, max_side), Image.LANCZOS)
    return c


def main():
    os.makedirs(OUT, exist_ok=True)
    for z in ZONES:
        far = Image.open(f"{A}/backgrounds/bg_{z}_far.png").convert("RGB")
        h = round(far.height * BG_W / far.width)
        save(far.resize((BG_W, h), Image.LANCZOS), f"{z}_far.webp", 80)
        for layer in ("mid", "ground"):
            c = cut(Image.open(f"{A}/backgrounds/bg_{z}_{layer}.png")).resize((BG_W, h), Image.LANCZOS)
            save(c, f"{z}_{layer}.webp", 82)
    for p in ["vase", "barrel", "crates", "coin", "peach"]:
        save(trimmed(f"{A}/props/prop_{p}.png", 256 if p != "coin" else 128), f"prop_{p}.webp", 85)
    save(trimmed(f"{A}/characters/enemy_lantern.png", 360), "lantern.webp", 85)
    save(trimmed(f"{A}/ui/logo.png", 900), "logo.webp", 88)
    for f in sorted(os.listdir(f"{A}/icons")):
        im = Image.open(f"{A}/icons/{f}").convert("RGB").resize((192, 192), Image.LANCZOS)
        save(im, f.replace(".png", ".webp"), 84)
    for f in ["portrait_mihao"]:
        im = Image.open(f"{A}/ui/{f}.png").convert("RGB")
        s = min(im.size)
        im = im.crop(((im.width - s) // 2, 0, (im.width - s) // 2 + s, s)).resize((256, 256), Image.LANCZOS)
        save(im, f"{f}.webp", 84)
    poster = Image.open(f"{A}/ui/poster.png").convert("RGB")
    save(poster.resize((1600, round(poster.height * 1600 / poster.width)), Image.LANCZOS), "poster.webp", 82)
    og = poster.resize((1200, round(poster.height * 1200 / poster.width)), Image.LANCZOS)
    og = og.crop((0, (og.height - 630) // 2, 1200, (og.height - 630) // 2 + 630)) if og.height > 630 else og
    og.save(os.path.join(ROOT, "public", "assets", "images", "share.jpg"), "JPEG", quality=84)
    print("share.jpg", og.size)


if __name__ == "__main__":
    main()
