import { SIZE, EDEF, BDEF, MOVES } from './config.js';
import { S, P, setAnim, zy, zs, bodyY } from './state.js';
import { sfx } from './audio.js';
import { toast, showBossBar } from './hud.js';
import { gameOver } from './screens.js';
import { rnd, clamp } from './util.js';

export const hitstop = t => { S.hitstop = Math.max(S.hitstop, t); };
export const shake = v => { S.shake = Math.max(S.shake, v); };

export function spark(x, y, n, col, spd = 520, life = .35, size = 4) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2);
    const s = rnd(.3, 1) * spd;
    S.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life, t: 0, col, size: rnd(.6, 1.4) * size, g: 900 });
  }
}

export const dmgNum = (x, y, v, col = '#ffe7a3', big) => S.nums.push({ x, y, v, t: 0, col, big });

export function dropLoot(x, z, n, peach) {
  for (let i = 0; i < n; i++) {
    S.drops.push({ kind: 'coin', x: x + rnd(-30, 30), z: clamp(z + rnd(-.1, .1), 0, 1), h: 40, vx: rnd(-180, 180), vh: rnd(380, 720), t: 0 });
  }
  if (peach) S.drops.push({ kind: 'peach', x, z, h: 50, vx: rnd(-80, 80), vh: 500, t: 0 });
}

function releaseToken(e) {
  if (!e.tok) return;
  e.tok = 0;
  S.tokens--;
}

export function hurtEnemy(e, dmg, dir, kb, launch, src) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = .12;
  S.combo++;
  S.comboT = 1.8;
  S.maxCombo = Math.max(S.maxCombo, S.combo);
  P.qi = Math.min(100, P.qi + ((src && src.qi) || 3));
  const big = dmg >= 18;
  dmgNum(e.x, bodyY(e) - 40, dmg, big ? '#ffd166' : '#fff4dc', big);
  spark(e.x - dir * 20, bodyY(e), big ? 18 : 10, big ? '#ffcf5a' : '#fff6d6');
  sfx(big ? 'big' : 'hit');
  hitstop(big ? .055 : .025);
  shake(big ? 7 : 3);
  if (e.hp <= 0) return killEnemy(e, dir);
  if (e.fly) { e.vx = dir * kb * .8; return; }
  const def = e.boss ? BDEF[e.type] : EDEF[e.type];
  if (e.boss || def.poise) {
    e.poise -= dmg;
    if (e.poise > 0 && !launch) { e.vx += dir * kb * .15; return; }
    e.poise = e.poiseMax;
  }
  if (e.boss) {
    e.state = 'hurt';
    setAnim(e, e.ch + '_hurt', 1.6);
    e.vx = dir * kb * .3;
    e.cd = Math.max(e.cd, .5);
    return;
  }
  releaseToken(e);
  e.vx = dir * kb;
  if (launch && e.type !== 'ox') {
    e.vh = launch;
    e.h = Math.max(e.h, 1);
    e.state = 'air';
    setAnim(e, e.ch + '_hurt', .6);
  } else {
    e.state = 'hurt';
    setAnim(e, e.ch + '_hurt', 1.7);
  }
}

export function killEnemy(e, dir) {
  e.dead = true;
  e.state = 'dead';
  e.vx = dir * 260;
  S.kills++;
  releaseToken(e);
  const def = e.boss ? null : EDEF[e.type];
  S.score += (e.boss ? 5000 : def.score) * (1 + Math.floor(S.combo / 10) * .5);
  if (e.fly) {
    spark(e.x, bodyY(e), 30, '#ff9a3c', 600, .6, 5);
    sfx('boom');
    e.alpha = 0;
    dropLoot(e.x, e.z, def.coins);
    return;
  }
  setAnim(e, e.ch + '_death', 1.25);
  shake(e.boss ? 22 : 8);
  hitstop(e.boss ? .35 : .08);
  if (!e.boss) return dropLoot(e.x, e.z, def.coins, Math.random() < .14);
  S.slow = 1.6;
  sfx('boom');
  dropLoot(e.x, e.z, 40, true);
  S.bossDone = true;
  showBossBar(false);
  S.actors.filter(a => !a.dead && a !== P && a !== e).forEach(a => killEnemy(a, 1));
}

export function hurtPlayer(dmg, dir, kb = 280) {
  if (P.dead || P.inv > 0 || S.mode !== 'play') return false;
  if (P.state === 'roll') {
    if (S.owned.shadow) { S.slow = .7; toast('PERFECT DODGE'); }
    return false;
  }
  if (S.owned.shield) dmg = Math.round(dmg * .75);
  P.hp -= dmg;
  S.combo = 0;
  sfx('hurt');
  shake(12);
  hitstop(.07);
  S.flash = .25;
  dmgNum(P.x, bodyY(P) - 40, dmg, '#ff5a4a', true);
  spark(P.x, bodyY(P), 12, '#ff7a5a');
  if (P.hp <= 0) {
    P.hp = 0;
    P.dead = true;
    P.state = 'ko';
    setAnim(P, 'hero_ko', 1.1);
    P.vx = dir * 200;
    S.slow = 1.2;
    setTimeout(gameOver, 2200);
    return true;
  }
  P.state = 'hurt';
  setAnim(P, 'hero_hurt', 1.9);
  P.vx = dir * kb;
  P.vh = P.h > 0 ? 200 : 0;
  P.inv = .75;
  P.combo = null;
  return true;
}

export function breakProp(p) {
  p.hp = 0;
  sfx('hit');
  shake(4);
  spark(p.x, zy(p.z) - 60, 22, p.kind === 'vase' ? '#cfe0ff' : '#b0703a', 460, .7, 6);
  dropLoot(p.x, p.z, Math.floor(rnd(2, 6)), Math.random() < .2);
}

export function playerHits(move) {
  const reach = move.reach;
  const sc = zs(P.z);
  for (const e of S.actors) {
    if (e === P || e.dead) continue;
    if (move.multi ? (e.mh || 0) > S.time : P.hitIds.has(e)) continue;
    const dx = (e.x - P.x) * P.face;
    const dz = Math.abs(e.z - P.z);
    const w = (e.boss ? 90 : 40) * SIZE[e.ch === 'lantern' ? 'rat' : e.ch];
    if (dx < reach[0] * sc - w || dx > reach[1] * sc + w || dz > move.zr + (e.boss ? .12 : 0)) continue;
    if (e.fly && Math.abs(e.h - (P.h + 80)) > 220 && !move.air && move !== MOVES.launcher && move !== MOVES.whip) continue;
    if (move.multi) e.mh = S.time + move.multi;
    else P.hitIds.add(e);
    const dmg = S.combo > 15 ? Math.round(move.dmg * 1.15) : move.dmg;
    hurtEnemy(e, dmg, P.face, move.kb, move.launch, move);
  }
  for (const p of S.props) {
    if (p.hp <= 0) continue;
    const dx = (p.x - P.x) * P.face;
    if (dx > reach[0] - 40 && dx < reach[1] + 40 && Math.abs(p.z - P.z) < .3) breakProp(p);
  }
}

export function lanternBurst() {
  sfx('boom');
  shake(14);
  spark(P.x, zy(P.z) - 60, 40, '#ff8a3c', 760, .7, 7);
  S.quakes.push({ x: P.x, r: 0, max: 300, from: 'p', t: 0, fire: 1, hit: new Set() });
}
