import { GY0, LANE, HERO_H, SRC_H, SIZE, POSE_BLEND } from './config.js';
import { M } from './assets.js';
import { rnd } from './util.js';

export const S = {
  mode: 'title', zi: 0, zone: null, camX: 0, lock: null, actors: [], props: [], drops: [], proj: [], fx: [], nums: [], quakes: [], meteors: [],
  shake: 0, hitstop: 0, slow: 0, flash: 0, time: 0, score: 0, coins: 0, kills: 0, maxCombo: 0, combo: 0, comboT: 0,
  owned: {}, boss: null, tokens: 0, goT: 0, endT: 0, encounters: [], bossX: 0, bossDone: false, waveLeft: null, spawnT: 0,
};

export let P = null;

export function newActor(ch, x, z, extra = {}) {
  return Object.assign({
    ch, x, z, h: 0, vx: 0, vz: 0, vh: 0, face: -1, anim: null, at: 0, frame: 0, aspeed: 1, done: false,
    state: 'idle', hp: 1, maxhp: 1, flash: 0, hitIds: new Set(), dead: false, alpha: 1, cd: rnd(.6, 1.4), poise: 0, poiseMax: 0,
  }, extra);
}

export function resetPlayer() {
  P = newActor('hero', 300, .55, { face: 1, hp: 100, maxhp: 100, qi: 0, inv: 0, jumps: 0, combo: null, buffer: null, bufT: 0 });
}

export function setAnim(e, name, speed = 1, restart = true) {
  if (!M.anims[name]) return;
  if (!restart && e.anim === name) { e.aspeed = speed; return; }
  if (e.anim && e.anim !== name) e.prev = { anim: e.anim, frame: e.frame, t: POSE_BLEND };
  e.anim = name;
  e.at = 0;
  e.frame = 0;
  e.done = false;
  e.aspeed = speed;
}

export function updAnim(e, dt) {
  if (e.prev) { e.prev.t -= dt; if (e.prev.t <= 0) e.prev = null; }
  if (!e.anim) return;
  const a = M.anims[e.anim];
  e.at += dt * e.aspeed;
  const ft = e.at * a.fps;
  let f = Math.floor(ft);
  let nf;
  e.frac = ft - f;
  if (a.loop) {
    f %= a.n;
    nf = (f + 1) % a.n;
  } else {
    if (f >= a.n) { f = a.n - 1; e.done = true; }
    nf = f + 1 < a.n ? f + 1 : f;
  }
  e.frame = f;
  e.nframe = nf;
}

export const inHit = (e, win) => {
  const w = win || (M.anims[e.anim] && M.anims[e.anim].hit);
  return w && e.frame >= w[0] && e.frame <= w[1];
};

export const dispScale = ch => SIZE[ch] * HERO_H / (SRC_H * M.chars[ch].srcScale);
export const zy = z => GY0 + z * LANE;
export const zs = z => .93 + z * .12;
export const bodyY = e => zy(e.z) - e.h - (e.ch === 'lantern' ? 0 : HERO_H * .45 * SIZE[e.ch] * zs(e.z));
