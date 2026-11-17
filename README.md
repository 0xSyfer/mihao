# MI HAO: Warrior Cat

**Play now: [mihao.online](https://mihao.online)**

A free browser beat'em-up for the **$MIHAO** community. Play as Mi Hao, the legendary ni hao cat,
and fight across four lands of ancient China to face the Dragon Lord.

**$MIHAO (Solana)** · `4CxjZyMNoF1p6eXHXHv1TWpS2X47CuUmLwtGe18spump`
· [mihao.fun](https://mihao.fun/) · [X @iamnihaocat](https://x.com/iamnihaocat)
· [pump.fun](https://pump.fun/coin/4CxjZyMNoF1p6eXHXHv1TWpS2X47CuUmLwtGe18spump)

## The journey

| Land | Enemies | Boss |
|---|---|---|
| I · Temple of the Golden Sun | rat bandits, fox archers, haunted lanterns | Grandmaster Bai Hu |
| II · The Mahjong House | jiangshi, lanterns | Boss Chan Chu |
| III · The Great Wall | ox generals, archers | General Lang |
| IV · Dragon Peak | everything | Long Wang, the Dragon Lord |

Between lands, the **Shrine of the Jade Cat** sells new techniques for $MIHAO coins.

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move · double-tap to run | `A` `D` / `←` `→` | left stick |
| Move in depth | `W` `S` / `↑` `↓` | left stick |
| Sword combo · air slash | `J` | X |
| Heavy · launcher after 2 hits | `K` | Y |
| Jump | `Space` | A |
| Roll (invincible) | `L` / `Shift` | B |
| Skills | `Q` `E` | LB RB |
| Pause | `Esc` / `P` | Start |

Phones get on-screen controls and a lighter sprite set. Add `?hd` or `?lite` to the URL to force one.

## Project layout

```
public/                 the website, deployed as-is
  index.html
  css/style.css
  js/                   ES modules, entry point main.js
  assets/
    sprites/hd/         desktop sprite atlases + sprites.json
    sprites/lite/       phone sprite atlases + sprites.json
    images/             backgrounds, props, icons, logo, poster, share card
    audio/              music
tools/                  asset pipeline (Python)
  key.py                green-screen keyer
  build_sprites.py      video clips → sprite atlases
  prep_assets.py        source images → web images
.github/workflows/      deploys public/ to GitHub Pages on every push to main
source/                 original art, clips and audio (not in the repository)
```

## Run locally

```bash
python3 -m http.server 8777 -d public
```

Open http://localhost:8777

## Rebuild assets

```bash
python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
.venv/bin/python tools/prep_assets.py
.venv/bin/python tools/build_sprites.py
SPRITES_PROFILE=lite .venv/bin/python tools/build_sprites.py
```

## World leaderboard

Set `LEADERBOARD.url` and `LEADERBOARD.key` in `public/js/config.js` to a Supabase project
(publishable key only). Without them the game keeps a local Hall of Warriors.
