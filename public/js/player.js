import { GRAVITY, MOVES } from './config.js';
import { M } from './assets.js';
import { S, P, setAnim, inHit } from './state.js';
import { readMove, pressed } from './input.js';
import { sfx } from './audio.js';
import { toast } from './hud.js';
import { playerHits, lanternBurst, shake } from './combat.js';
import { clamp, lerp, sgn } from './util.js';

function startMove(name) {
  const m = MOVES[name];
  P.state = 'atk';
  P.combo = name;
  P.move = m;
  P.hitIds.clear();
  P.buffer = null;
  P.waved = P.burst = 0;
  if (!m.air && Math.abs(P.inX || 0) > .3) P.face = sgn(P.inX);
  setAnim(P, m.anim, m.speed);
  sfx(m.heavy ? 'heavy' : 'swish');
  if (!m.air) P.vx = P.face * (m.heavy ? 120 : 90);
}

function useSkill(id, label) {
  if (!S.owned[id]) return toast(`Unlock ${label} at the Shrine`);
  if (P.qi < MOVES[id].cost) return toast('Not enough Qi');
  P.qi -= MOVES[id].cost;
  startMove(id);
}

function tryAttack(kind) {
  if (P.h > 1 && kind === 'atk') { if (P.state !== 'atk') startMove('air'); return; }
  if (kind === 'q') return useSkill('whip', 'Mustache Whip');
  if (kind === 'e') return useSkill('whirl', 'Golden Whirlwind');
  if (kind === 'hvy') return startMove(P.combo === 'thrust' && P.state === 'atk' ? 'launcher' : 'heavy');
  startMove('slash');
}

const endAttack = () => { P.state = 'idle'; P.combo = null; P.waved = P.burst = 0; };

function updateAttack(dt, inp, grounded) {
  const m = P.move;
  const a = M.anims[m.anim];
  if (inHit(P)) playerHits(m);
  if (m.finisher && S.owned.wave && P.frame >= a.hit[0] && !P.waved) {
    P.waved = 1;
    S.proj.push({ kind: 'wave', from: 'p', x: P.x + P.face * 80, z: P.z, h: 110, vx: P.face * 900, dmg: 14, life: .9, hit: new Set() });
  }
  if (m.heavy && S.owned.lantern && P.frame >= a.hit[0] && !P.burst) { P.burst = 1; lanternBurst(); }
  const prog = P.frame / a.n;
  if (P.buffer && prog > .32 && !m.air) {
    const b = P.buffer;
    if (b === 'atk' && m.next) return startMove(m.next);
    if (b === 'hvy' && P.combo === 'thrust') return startMove('launcher');
    if (b === 'q' || b === 'e') { P.buffer = null; return tryAttack(b); }
  }
  P.vx *= .86;
  const pastHit = !a.hit || P.frame > a.hit[1];
  const moving = Math.abs(inp.x) > .3 || Math.abs(inp.y) > .3;
  if (!m.air && grounded && (P.jbuf > 0 || P.rbuf > 0) && (prog > .2 || pastHit)) endAttack();
  else if (!m.air && pastHit && prog > .62 && !P.buffer && moving) endAttack();
  else if (m.air && P.h <= 0 && P.vh <= 0) { endAttack(); setAnim(P, 'hero_jump_land', 2.2); P.landT = .18; }
  else if (P.done) { endAttack(); if (P.h > 0) P.state = 'jump'; }
}

function startRoll(inp) {
  P.rbuf = 0;
  P.state = 'roll';
  P.rollT = S.owned.shadow ? .46 : .34;
  P.inv = S.owned.shadow ? .45 : .3;
  if (inp.x) P.face = sgn(inp.x);
  setAnim(P, 'hero_roll', 1.9);
  sfx('roll');
}

function startJump(grounded) {
  P.jbuf = 0;
  P.vh = grounded ? 900 : 780;
  P.jumps = grounded ? 1 : 2;
  P.h = Math.max(P.h, 1);
  P.state = 'jump';
  setAnim(P, grounded ? 'hero_jump_up' : 'hero_jump_air', grounded ? 2.4 : 1.4);
  sfx('jump');
}

const isFree = () => P.state === 'idle' || P.state === 'walk' || P.state === 'run' || P.state === 'jump';

export function updatePlayer(dt) {
  const inp = readMove();
  P.inX = inp.x;
  P.inv = Math.max(0, P.inv - dt);
  if (P.dead) { P.vx *= .92; P.x += P.vx * dt; return; }
  const grounded = P.h <= 0;

  for (const k of ['atk', 'hvy', 'q', 'e']) if (pressed(k)) { P.buffer = k; P.bufT = .32; }
  if (pressed('jump')) P.jbuf = .15;
  if (pressed('roll')) P.rbuf = .2;
  P.bufT -= dt;
  P.jbuf = (P.jbuf || 0) - dt;
  P.rbuf = (P.rbuf || 0) - dt;
  if (P.bufT <= 0) P.buffer = null;

  if (P.state === 'atk') updateAttack(dt, inp, grounded);
  else if (P.state === 'roll') {
    P.rollT -= dt;
    P.vx = P.face * (S.owned.shadow ? 640 : 520) * (P.rollT > .1 ? 1 : .3);
    if (P.done || P.rollT <= 0) P.state = 'idle';
  } else if (P.state === 'hurt') {
    P.vx *= .88;
    if (P.done || (P.rbuf > 0 && P.frame / M.anims[P.anim].n > .45)) P.state = 'idle';
  }

  if (isFree()) {
    if (P.rbuf > 0 && grounded) startRoll(inp);
    else if (P.buffer) { const b = P.buffer; P.buffer = null; tryAttack(b); }
    else if (P.jbuf > 0 && (grounded || (S.owned.djump && P.jumps < 2))) startJump(grounded);
  }

  if (isFree()) {
    const run = inp.run && grounded;
    const speed = run ? 620 : 360;
    P.vx = lerp(P.vx, inp.x * speed, Math.min(1, dt * 14));
    P.vz = inp.y * 1.15;
    if (Math.abs(inp.x) > .1) P.face = sgn(inp.x);
    if (P.state !== 'jump') {
      if (P.landT > 0) P.landT -= dt;
      else if (Math.abs(inp.x) > .1 || Math.abs(inp.y) > .1) {
        P.state = run ? 'run' : 'walk';
        setAnim(P, run ? 'hero_run' : 'hero_walk', run ? 1.2 : 1.5, false);
      } else {
        P.state = 'idle';
        setAnim(P, 'hero_idle', 1, false);
      }
    }
  } else {
    P.vz = 0;
  }

  if (P.h > 0 || P.vh > 0) {
    P.vh -= GRAVITY * dt * (P.state === 'atk' && P.move && P.move.air ? .55 : 1);
    P.h += P.vh * dt;
    if (P.state === 'jump' && P.vh < 250 && P.anim === 'hero_jump_up') setAnim(P, 'hero_jump_air', 1.2);
    if (P.h <= 0) {
      P.h = 0;
      P.vh = 0;
      P.jumps = 0;
      if (P.state === 'jump') { P.state = 'idle'; setAnim(P, 'hero_jump_land', 2.4); P.landT = .16; shake(3); }
    }
  }
  P.x += P.vx * dt;
  P.z = clamp(P.z + P.vz * dt, 0, 1);
  const lo = S.lock ? S.lock[0] + 40 : 60;
  const hi = S.lock ? S.lock[1] - 40 : S.zone.len - 60;
  P.x = clamp(P.x, lo, hi);
}
