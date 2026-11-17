import json, os, subprocess, sys, glob
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from key import cut

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIPS = os.path.join(ROOT, "source", "clips")
OUT = os.environ.get("SPRITES_OUT") or os.path.join(ROOT, "public", "assets", "sprites", "lite" if os.environ.get("SPRITES_PROFILE") == "lite" else "hd")
WORK = os.path.join(ROOT, "_work", "raw")

SCALE = 0.6
CHAR_SCALE = {"hero": 0.38, "rat": 0.33, "fox": 0.33, "jiangshi": 0.33, "ox": 0.37,
              "tiger": 0.41, "panda": 0.41, "toad": 0.41, "wolf": 0.41, "dragon": 0.43}
MAX_FRAMES = 999
FULL_RATE = True
if os.environ.get("SPRITES_PROFILE") == "lite":
    CHAR_SCALE = {k: round(v * 0.8, 3) for k, v in CHAR_SCALE.items()}
    FULL_RATE, MAX_FRAMES = False, 22
    MAX_FRAMES_CHAR = {"hero": 44}
MAX_FRAMES_CHAR = {"hero": 99}
QUALITY = 78
COLS = 8
GROUND = 603
REF_CX = 573
REF_CY = 415
MARGIN = 14

FIXED_CROP = {"hero": (250, 40, 1110, 620)}

R = lambda a, b, s=1: list(range(a, b, s))
SL = "Cat_performs_sword_slash.mp4"
RUN, JUMP = "Cat_running_with_sword.mp4", "Cat_jumps_with_sword.mp4"

ANIMS = {
    "hero_idle":    ("Cat_holding_sword_stance.mp4", R(11, 68), 24, True, {}, None),
    "hero_walk":    ("Cat_walking_with_sword.mp4", R(34, 64), 24, True, {}, None),
    "hero_slash":   (SL, R(18, 30, 3) + R(30, 40) + R(40, 50, 3), 24, False, {"hit": [5, 11]}, None),
    "hero_thrust":  (SL, R(62, 78, 3) + R(78, 89), 24, False, {"hit": [7, 13]}, None),
    "hero_recover": (SL, R(88, 110, 2), 24, False, {}, None),
    "hero_run":     (RUN, R(155, 187), 34, True, {}, {"scale": 0.62, "mode": "ground"}),
    "hero_jump_up":   (JUMP, R(24, 41, 2), 24, False, {}, {"scale": 0.76, "mode": "ground"}),
    "hero_jump_air":  (JUMP, R(132, 147, 2), 16, False, {}, {"scale": 0.76, "mode": "air"}),
    "hero_jump_land": (JUMP, R(146, 191, 3), 24, False, {}, {"scale": 0.76, "mode": "ground"}),
    "hero_roll":    ("hero_roll.mp4", R(12, 56, 2), 26, False, {}, None),
    "hero_hurt":    ("hero_hurt_b.mp4", R(10, 36, 2), 24, False, {}, None),
    "hero_ko":      ("hero_hurt_a.mp4", R(4, 58, 2), 20, False, {}, None),
    "hero_combo3":  ("hero_combo3.mp4", R(18, 50, 2) + R(50, 82, 3), 24, False, {"hit": [9, 15]}, None),
    "hero_heavy":   ("hero_heavy.mp4", R(16, 40, 2) + R(40, 54) + R(54, 68, 2), 24, False, {"hit": [14, 22]}, None),
    "hero_launcher": ("hero_launcher.mp4", R(20, 30, 2) + R(30, 46) + R(46, 92, 3), 24, False, {"hit": [6, 18]}, None),
    "rat_idle":     ("rat_idle.mp4", R(13, 87), 24, True, {}, None),
    "rat_walk":     ("rat_walk.mp4", R(69, 110), 24, True, {}, None),
    "rat_attack":   ("rat_attack.mp4", R(8, 22, 2) + R(22, 42) + R(42, 58, 2), 24, False, {"hit": [9, 22]}, None),
    "rat_hurt":     ("rat_hurt.mp4", R(14, 42, 2), 24, False, {}, None),
    "rat_death":    ("rat_death.mp4", R(4, 50, 2), 20, False, {}, None),
    "tiger_idle":   ("tiger_idle.mp4", R(10, 84), 24, True, {}, None),
    "tiger_walk":   ("tiger_walk.mp4", R(76, 118), 24, True, {}, None),
    "tiger_attack": ("tiger_attack.mp4", R(20, 40, 2) + R(40, 66) + R(66, 92, 3), 24, False, {"hit": [12, 30]}, None),
    "tiger_combo":  ("tiger_combo.mp4", R(14, 90, 2), 22, False, {"hit": [5, 33]}, None),
    "tiger_combo2": ("tiger_combo2.mp4", R(14, 90, 2), 22, False, {"hit": [12, 33]}, None),
    "tiger_slam":   ("tiger_slam.mp4", R(16, 64, 2) + R(64, 100, 3), 22, False, {"hit": [22, 26]}, None),
    "tiger_roar":   ("tiger_roar.mp4", R(18, 80, 2), 16, False, {}, None),
    "tiger_hurt":   ("tiger_hurt.mp4", R(12, 58, 2), 24, False, {}, None),
    "tiger_death":  ("tiger_death.mp4", R(8, 98, 3), 16, False, {}, None),
    "hero_air":       ("hero_air.mp4", R(20, 40, 2) + R(40, 56) + R(56, 84, 3), 24, False, {"hit": [10, 22]}, None),
    "hero_mustache":  ("hero_mustache.mp4", R(20, 40, 2) + R(40, 80, 2) + R(80, 104, 3), 22, False, {"hit": [8, 26]}, None),
    "hero_whirlwind": ("hero_whirlwind.mp4", R(24, 100, 2), 24, False, {"hit": [6, 34]}, None),
    "hero_victory":   ("hero_victory.mp4", R(20, 118, 3), 12, False, {}, None),
    "fox_idle":   ("fox_idle.mp4", R(8, 90), 24, True, {}, None),
    "fox_walk":   ("fox_walk.mp4", R(59, 109), 24, True, {}, None),
    "fox_attack": ("fox_attack.mp4", R(15, 90, 2), 20, False, {"shoot": 18}, None),
    "fox_hurt":   ("fox_hurt.mp4", R(10, 62, 2), 24, False, {}, None),
    "fox_death":  ("fox_death.mp4", R(5, 72, 2), 20, False, {}, None),
    "jiangshi_idle":   ("jiangshi_idle.mp4", R(8, 74), 24, True, {}, None),
    "jiangshi_walk":   ("jiangshi_walk.mp4", R(73, 108), 24, True, {}, None),
    "jiangshi_attack": ("jiangshi_attack.mp4", R(20, 80, 2), 20, False, {"hit": [11, 19]}, None),
    "jiangshi_hurt":   ("jiangshi_hurt.mp4", R(15, 75, 2), 24, False, {}, None),
    "jiangshi_death":  ("jiangshi_death.mp4", R(20, 86, 2), 20, False, {}, None),
    "ox_idle":   ("ox_idle.mp4", R(61, 114), 24, True, {}, None),
    "ox_walk":   ("ox_walk.mp4", R(57, 90), 24, True, {}, None),
    "ox_attack": ("ox_attack.mp4", R(20, 100, 2), 20, False, {"hit": [17, 27]}, None),
    "ox_hurt":   ("ox_hurt.mp4", R(10, 70, 2), 24, False, {}, None),
    "ox_death":  ("ox_death.mp4", R(8, 100, 3), 16, False, {}, None),
    "toad_idle":   ("toad_idle.mp4", R(8, 96), 24, True, {}, None),
    "toad_walk":   ("toad_walk.mp4", R(32, 67), 24, True, {}, None),
    "toad_attack": ("toad_attack.mp4", R(15, 75, 2), 20, False, {"hit": [7, 22]}, None),
    "toad_swing":  ("toad_swing.mp4", R(15, 62, 2), 20, False, {"hit": [3, 15]}, None),
    "toad_belly":  ("toad_belly.mp4", R(15, 72, 2), 20, False, {"hit": [15, 25]}, None),
    "toad_hurt":   ("toad_hurt.mp4", R(10, 80, 2), 24, False, {}, None),
    "toad_death":  ("toad_death.mp4", R(10, 110, 3), 16, False, {}, None),
    "wolf_idle":   ("wolf_idle.mp4", R(54, 100), 24, True, {}, None),
    "wolf_walk":   ("wolf_walk.mp4", R(63, 107), 24, True, {}, None),
    "wolf_attack": ("wolf_attack.mp4", R(15, 75, 2), 20, False, {"hit": [5, 15]}, None),
    "wolf_thrust": ("wolf_thrust.mp4", R(15, 100, 2), 22, False, {"hit": [5, 32]}, None),
    "wolf_howl":   ("wolf_howl.mp4", R(10, 105, 3), 14, False, {}, None),
    "wolf_hurt":   ("wolf_hurt.mp4", R(10, 80, 2), 24, False, {}, None),
    "wolf_death":  ("wolf_death.mp4", R(10, 115, 3), 16, False, {}, None),
    "dragon_idle":   ("dragon_idle.mp4", R(44, 98), 24, True, {}, None),
    "dragon_walk":   ("dragon_walk.mp4", R(42, 83), 24, True, {}, None),
    "dragon_attack": ("dragon_attack.mp4", R(15, 75, 2), 20, False, {"hit": [5, 17]}, None),
    "dragon_sweep":  ("dragon_sweep.mp4", R(15, 80, 2), 20, False, {"hit": [5, 20]}, None),
    "dragon_roar":   ("dragon_roar.mp4", R(15, 100, 3), 14, False, {}, None),
    "dragon_hurt":   ("dragon_hurt.mp4", R(10, 80, 2), 24, False, {}, None),
    "dragon_death":  ("dragon_death.mp4", R(10, 115, 3), 16, False, {}, None),
}


def raw_frames(clip):
    key = os.path.splitext(clip)[0]
    d = os.path.join(WORK, key)
    if not glob.glob(os.path.join(d, "*.png")):
        os.makedirs(d, exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(CLIPS, clip), os.path.join(d, "%04d.png")], check=True)
    return d


def body_stats(rgba):
    al = np.asarray(rgba)[..., 3].astype(np.float32) / 255
    ys, xs = np.where(al > 0.6)
    if len(xs) == 0:
        return None
    return float(xs.mean()), float(ys.mean()), float(ys.max())


def normalise(rgba, norm):
    s = norm["scale"]
    cx, cy, feet = body_stats(rgba)
    W, H = rgba.size
    small = rgba.resize((round(W * s), round(H * s)), Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if norm["mode"] == "ground":
        dx, dy = REF_CX - cx * s, GROUND - feet * s
    else:
        dx, dy = REF_CX - cx * s, REF_CY - cy * s
    canvas.alpha_composite(small, (round(dx), round(dy)))
    return canvas


def keyed(clip, f, norm):
    c = cut(Image.open(os.path.join(raw_frames(clip), f"{f:04d}.png")))
    return normalise(c, norm) if norm else c


def char_of(name):
    return name.split("_")[0]


def char_crop(char):
    if char in FIXED_CROP:
        return FIXED_CROP[char]
    U = [9e9, 9e9, 0, 0]
    for name, (clip, frames, *_rest) in ANIMS.items():
        if char_of(name) != char:
            continue
        norm = _rest[-1]
        for f in frames[::2]:
            c = keyed(clip, f, norm)
            al = np.asarray(c)[..., 3]
            ys, xs = np.where(al > 40)
            if len(xs):
                U = [min(U[0], xs.min()), min(U[1], ys.min()), max(U[2], xs.max()), max(U[3], ys.max())]
    x0, y0 = max(0, int(U[0]) - MARGIN), max(0, int(U[1]) - MARGIN)
    x1, y1 = min(1280, int(U[2]) + MARGIN), min(720, max(int(U[3]), GROUND) + MARGIN)
    return (x0, y0, x1, y1)


MAX_TEX = 4096


def main(only=None):
    os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, "sprites.json")
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
    manifest.setdefault("anims", {})
    manifest.setdefault("chars", {})
    todo = [n for n in ANIMS if not only or n in only or char_of(n) in only]
    for char in sorted({char_of(n) for n in todo}):
        SCALE = CHAR_SCALE.get(char, 0.6)
        names = [n for n in ANIMS if char_of(n) == char]
        clip, frames, fps, loop, ev, norm = ANIMS[names[0]]
        al = np.asarray(keyed(clip, frames[0], norm))[..., 3]
        ys, xs = np.where(al[GROUND - 50:GROUND] > 128)
        feet_x = float(xs.mean())
        for name in names:
            if name not in todo:
                continue
            clip, frames, fps, loop, ev, norm = ANIMS[name]
            ev = dict(ev)
            if FULL_RATE and not loop:
                full = list(range(frames[0], frames[-1] + 1))
                dur = len(frames) / fps
                remap = lambda i: full.index(frames[min(i, len(frames) - 1)])
                if "hit" in ev:
                    ev["hit"] = [remap(ev["hit"][0]), remap(ev["hit"][1])]
                if "shoot" in ev:
                    ev["shoot"] = remap(ev["shoot"])
                frames, fps = full, max(8, round(len(full) / dur))
            if len(frames) > MAX_FRAMES_CHAR.get(char, MAX_FRAMES):
                keep = list(range(0, len(frames), 2))
                if keep[-1] != len(frames) - 1:
                    keep.append(len(frames) - 1)
                frames = [frames[i] for i in keep]
                fps = max(8, round(fps / 2))
                if "hit" in ev:
                    ev["hit"] = [ev["hit"][0] // 2, max(ev["hit"][0] // 2, ev["hit"][1] // 2)]
                if "shoot" in ev:
                    ev["shoot"] = ev["shoot"] // 2
            imgs = [keyed(clip, f, norm) for f in frames]
            U = [9e9, 9e9, 0, 0]
            for c in imgs:
                a = np.asarray(c)[..., 3]
                ys, xs = np.where(a > 24)
                if len(xs):
                    U = [min(U[0], xs.min()), min(U[1], ys.min()), max(U[2], xs.max()), max(U[3], ys.max())]
            x0, y0 = max(0, int(U[0]) - MARGIN), max(0, int(U[1]) - MARGIN)
            x1, y1 = min(1280, int(U[2]) + MARGIN), min(720, max(int(U[3]), GROUND) + MARGIN)
            fw, fh = round((x1 - x0) * SCALE), round((y1 - y0) * SCALE)
            n = len(frames)
            cols = max(1, min(n, MAX_TEX // fw))
            rows = (n + cols - 1) // cols
            if rows * fh > MAX_TEX:
                print(f"!! {name} atlas {cols * fw}x{rows * fh} exceeds {MAX_TEX}")
            atlas = Image.new("RGBA", (cols * fw, rows * fh), (0, 0, 0, 0))
            for i, c in enumerate(imgs):
                atlas.paste(c.crop((x0, y0, x1, y1)).resize((fw, fh), Image.LANCZOS), ((i % cols) * fw, (i // cols) * fh))
            fn = f"{name}.webp"
            atlas.save(os.path.join(OUT, fn), "WEBP", quality=QUALITY, method=6)
            manifest["anims"][name] = {"src": fn, "char": char, "n": n, "cols": cols, "fps": fps, "loop": loop,
                                       "fw": fw, "fh": fh, "ax": round((feet_x - x0) * SCALE), "ay": round((GROUND - y0) * SCALE), **ev}
            print(f"{name:15s} {n:3d} fr  {fw}x{fh}  atlas {atlas.size}  {os.path.getsize(os.path.join(OUT, fn)) // 1024} KB")
        manifest["chars"][char] = {"srcScale": SCALE}
    with open(mpath, "w") as f:
        json.dump(manifest, f, indent=1)


if __name__ == "__main__":
    main(sys.argv[1:] or None)
