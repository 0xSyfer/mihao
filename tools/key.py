import sys
import numpy as np
from PIL import Image, ImageFilter

GREEN = (4, 247, 5)


def sample_bg(a):
    h, w = a.shape[:2]
    p = np.concatenate([a[:24, :24], a[:24, -24:], a[-24:, :24], a[-24:, -24:]]).reshape(-1, 3)
    return tuple(np.median(p, 0))


def cut(img, t0=None, t1=None, choke=1, bg=None):
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    if bg is None:
        bg = sample_bg(a)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    gness = g - np.maximum(r, b)
    gb = max(bg[1] - max(bg[0], bg[2]), 30)
    t0 = 0.08 * gb if t0 is None else t0
    t1 = 0.70 * gb if t1 is None else t1
    alpha = 1 - np.clip((gness - t0) / (t1 - t0), 0, 1)
    if choke:
        am = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(1 + 2 * choke))
        am = am.filter(ImageFilter.GaussianBlur(0.6))
        alpha = np.minimum(alpha, np.asarray(am).astype(np.float32) / 255)
    bg = np.array(bg, np.float32)
    al = np.maximum(alpha, 1e-3)[..., None]
    unmix = ((a - (1 - al) * bg) / al).clip(0, 255)
    simple = a.copy()
    simple[..., 1] = np.minimum(simple[..., 1], np.maximum(simple[..., 0], simple[..., 2]))
    w = np.clip((alpha - 0.35) / 0.45, 0, 1)[..., None]
    fg = w * unmix + (1 - w) * simple
    fg = np.where(alpha[..., None] > 0.97, a, fg)
    R, Gc, B = fg[..., 0], fg[..., 1], fg[..., 2]
    warm = np.clip((R - B - 20) / 60, 0, 1)
    cap = warm * ((R + B) / 2 + 6) + (1 - warm) * np.maximum(R, B)
    fg[..., 1] = np.minimum(Gc, cap)
    rgba = np.dstack([fg.clip(0, 255), alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def bbox(rgba, thr=40):
    al = np.asarray(rgba)[..., 3]
    ys, xs = np.where(al > thr)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def pad(img, pct=60, W=2560, H=1440):
    c = cut(img)
    x0, y0, x1, y1 = bbox(c)
    sub = c.crop((x0, y0, x1, y1))
    s = (H * pct / 100) / sub.height
    sub = sub.resize((round(sub.width * s), round(sub.height * s)), Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), GREEN + (255,))
    feet = int(H * 0.84)
    canvas.alpha_composite(sub, ((W - sub.width) // 2, feet - sub.height))
    return canvas.convert("RGB")


def proof(img):
    c = cut(img)
    W, H = c.size
    out = Image.new("RGB", (W * 2, H))
    for i, col in enumerate([(22, 18, 30), (236, 214, 170)]):
        plate = Image.new("RGBA", (W, H), col + (255,))
        plate.alpha_composite(c)
        out.paste(plate.convert("RGB"), (i * W, 0))
    return out


if __name__ == "__main__":
    mode, src, dst = sys.argv[1:4]
    im = Image.open(src)
    if mode == "cut":
        cut(im).save(dst)
    elif mode == "pad":
        pad(im, float(sys.argv[4]) if len(sys.argv) > 4 else 60).save(dst)
    elif mode == "proof":
        proof(im).save(dst)
    print("ok", dst)
