import { W, GRAVITY, SIZE, EDEF, BDEF } from './config.js';
import { M } from './assets.js';
import { S, P, newActor, setAnim, inHit, zy } from './state.js';
import { sfx, track } from './audio.js';
import { banner, toast, tips, BOSS_TIPS, showBossBar } from './hud.js';
import { hurtPlayer, shake, spark } from './combat.js';
import { $, rnd, clamp, lerp, sgn } from './util.js';

export function spawnEnemy(type, side) {
  const x = side > 0 ? S.camX + W + 80 : S.camX - 80;
  const z = rnd(.08, .95);
  if (type === 'lantern') {
    const d = EDEF.lantern;
    const e = newActor('lantern', x, z, { type, hp: d.hp, maxhp: d.hp, h: rnd(130, 210), fly: 1, bob: rnd(0, 6) });
    S.actors.push(e);
    return e;
  }
  const d = EDEF[type];
  const hp = Math.round(d.hp * (1 + S.zi * .22));
  const e = newActor(type, x, z, { type, hp, maxhp: hp, poise: d.poise, poiseMax: d.poise, state: 'walk' });
  setAnim(e, type + '_walk');
  S.actors.push(e);
  return e;
}

export function spawnBoss() {
  const k = S.zone.boss;
  const d = BDEF[k];
  const e = newActor(k, S.camX + W + 160, .5, { type: k, boss: 1, hp: d.hp, maxhp: d.hp, poise: d.poise, poiseMax: d.poise, state: 'enter', phase: 1, cd: 1.6 });
  setAnim(e, k + '_walk');
  S.actors.push(e);
  S.boss = e;
  $('bossname').innerHTML = d.name + ' <span class="bosstitle">· ' + d.title + '</span>';
  showBossBar(true);
  banner(d.name, d.title.toUpperCase());
  tips(BOSS_TIPS, 8);
  sfx('gong');
  track('title', 1.06);
}

function meteorRain(n) {
  for (let i = 0; i < n; i++) {
    S.meteors.push({ x: clamp(P.x + rnd(-500, 500), S.camX + 60, S.camX + W - 60), z: rnd(0, 1), t: -i * .22, fall: 1.0 });
  }
}

function enrage(e, d) {
  e.phase = 2;
  e.state = 'rage';
  S.flash = .3;
  sfx('roar');
  shake(18);
  if (d.rage) setAnim(e, d.rage, 1.1);
  else e.state = 'idle';
  toast(d.name.toUpperCase() + ' IS ENRAGED');
  if (d.summon) {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => S.mode === 'play' && !e.dead && spawnEnemy(d.summon[i % 2], i % 2 ? -1 : 1), 400 + i * 500);
    }
  }
  if (d.meteors) meteorRain(9);
  if (e.type === 'tiger') S.quakes.push({ x: e.x, r: 0, max: 700, from: 'e', t: 0, dmg: 10, hit: new Set() });
}

function bossDecide(e, dist, dz) {
  const d = BDEF[e.type];
  if (e.phase === 1 && e.hp < e.maxhp * .5) return enrage(e, d);
  if (Math.abs(dz) > .12) e.z = clamp(e.z + sgn(dz) * .9 / 60, 0, 1);
  const options = d.atks.filter(a => dist < a.reach * 1.05 || a.quake || a.charge);
  if (!options.length) return;
  const atk = options[Math.floor(Math.random() * options.length)];
  if (!atk.quake && !atk.charge && dist > atk.reach) return;
  e.state = 'atk';
  e.atk = atk;
  e.hitDone = 0;
  e.quaked = 0;
  e.face = sgn(P.x - e.x);
  setAnim(e, atk.a, e.phase > 1 ? 1.3 : 1.12);
  e.tele = .35;
  if (e.phase > 1 && d.meteors && Math.random() < .3) meteorRain(4);
}

function bossAttackTick(e, dt) {
  const atk = e.atk;
  if (!atk) return;
  if (atk.charge && inHit(e)) e.x += e.face * atk.charge * dt;
  if (atk.quake) {
    if (inHit(e) && !e.quaked) {
      e.quaked = 1;
      sfx('boom');
      shake(20);
      S.quakes.push({ x: e.x + e.face * 120, r: 0, max: 900, from: 'e', t: 0, dmg: atk.dmg, hit: new Set() });
    }
    return;
  }
  if (!inHit(e)) return;
  if (atk.multi ? (e.mh || 0) > S.time : e.hitDone) return;
  const fdx = (P.x - e.x) * e.face;
  if (fdx > -60 && fdx < atk.reach * 1.05 && Math.abs(P.z - e.z) < .22 && P.h < 160) {
    if (atk.multi) e.mh = S.time + atk.multi;
    else e.hitDone = 1;
    hurtPlayer(atk.dmg + S.zi * 2, e.face, 360);
  }
}

function updateLantern(e, dt) {
  e.bob += dt * 2.4;
  const dx = P.x - e.x;
  e.face = sgn(dx);
  const tx = P.x - sgn(dx) * 260;
  e.x += clamp(tx - e.x, -1, 1) * EDEF.lantern.spd * dt;
  e.z = lerp(e.z, P.z, dt * .6);
  if (S.lock) {
    if (e.x > S.lock[0] + 80 && e.x < S.lock[1] - 80) e.inside = 1;
    if (e.inside) e.x = clamp(e.x, S.lock[0] + 80, S.lock[1] - 80);
  }
  e.h = 170 + Math.sin(e.bob) * 26;
  e.vx *= .9;
  e.x += e.vx * dt;
  e.cd -= dt;
  if (e.cd > 0 || Math.abs(dx) >= 700) return;
  e.cd = rnd(...EDEF.lantern.cd);
  sfx('arrow');
  const tx2 = P.x - e.x;
  const th = (P.h + 90) - e.h;
  const len = Math.hypot(tx2, th) || 1;
  S.proj.push({ kind: 'fire', from: 'e', x: e.x, z: e.z, h: e.h, vx: tx2 / len * 520, vh: th / len * 520, dmg: EDEF.lantern.dmg + S.zi * 2, life: 2.2 });
}

function updateDead(e, dt) {
  if (e.h > 0 || e.vh > 0) {
    e.vh -= GRAVITY * dt;
    e.h = Math.max(0, e.h + e.vh * dt);
    if (e.h === 0) e.vh = 0;
  }
  e.vx *= .9;
  e.x += e.vx * dt;
  if (e.done || e.fly) {
    e.deadT = (e.deadT || 0) + dt;
    if (e.deadT > (e.boss ? 3 : 1.1)) e.alpha = Math.max(0, e.alpha - dt * 1.6);
  }
}

function approach(e, def, dist, dx, dz, spd, dt) {
  e.face = sgn(dx);
  const reach = e.boss ? 260 : def.ranged ? 0 : def.reach * .8;
  let want = 0;
  let wantZ = Math.abs(dz) > .06 ? sgn(dz) : 0;
  if (def.ranged) {
    if (dist < def.keep[0]) want = -sgn(dx);
    else if (dist > def.keep[1]) want = sgn(dx);
  } else if (dist > reach) {
    want = sgn(dx);
  }
  if (!e.boss && !def.ranged && dist < reach * 1.6 && !e.tok && S.tokens >= 2) {
    want = dist < reach * 1.3 ? -sgn(dx) * .4 : 0;
    wantZ = 0;
  }
  e.x += want * spd * dt;
  e.z = clamp(e.z + wantZ * .55 * dt, 0, 1);
  const moving = want || wantZ;
  setAnim(e, e.ch + (moving ? '_walk' : '_idle'), 1, false);
  e.state = moving ? 'walk' : 'idle';
  if (e.cd > 0 || P.dead) return;
  if (e.boss) return bossDecide(e, dist, dz);
  if (def.ranged) {
    if (Math.abs(dz) < .3 && dist < 760) { e.state = 'atk'; e.shot = 0; setAnim(e, def.atk, 1.5); }
    return;
  }
  if (dist < def.reach * 1.05 && Math.abs(dz) < .14 && (e.tok || S.tokens < 2)) {
    if (!e.tok) { e.tok = 1; S.tokens++; }
    e.state = 'atk';
    e.hitDone = 0;
    setAnim(e, def.atk, e.type === 'ox' ? 1.2 : 1.45);
    e.tele = .25;
  }
}

function attack(e, def, dt) {
  const a = M.anims[e.anim];
  if (e.boss) bossAttackTick(e, dt);
  else if (def.ranged) {
    if (e.frame >= a.shoot && !e.shot) {
      e.shot = 1;
      sfx('arrow');
      S.proj.push({ kind: 'arrow', from: 'e', x: e.x + e.face * 60, z: e.z, h: 120 * SIZE.fox, vx: e.face * 880, dmg: def.dmg + S.zi * 2, life: 1.6 });
    }
  } else if (inHit(e) && !e.hitDone) {
    const fdx = (P.x - e.x) * e.face;
    if (fdx > -30 && fdx < def.reach * 1.1 && Math.abs(P.z - e.z) < .18 && P.h < 120) {
      e.hitDone = 1;
      hurtPlayer(def.dmg + S.zi * 2, e.face);
    }
  }
  if (!e.done) return;
  e.state = 'idle';
  e.cd = rnd(...def.cd) * (e.boss && e.phase > 1 ? .7 : 1);
  if (e.tok) { e.tok = 0; S.tokens--; }
  setAnim(e, e.ch + '_idle');
}

function keepInArena(e, def) {
  if (!S.lock || e.state === 'enter') return;
  if (e.boss) e.x = clamp(e.x, S.lock[0] + 170, S.lock[1] - 230);
  else if (def.ranged) {
    if (e.x > S.lock[0] + 90 && e.x < S.lock[1] - 90) e.inside = 1;
    if (e.inside) e.x = clamp(e.x, S.lock[0] + 90, S.lock[1] - 90);
  } else {
    e.x = clamp(e.x, S.lock[0] - 200, S.lock[1] + 200);
  }
}

export function updateEnemy(e, dt) {
  if (e.flash > 0) e.flash -= dt;
  if (e.dead) return updateDead(e, dt);
  if (e.fly) return updateLantern(e, dt);
  const def = e.boss ? BDEF[e.type] : EDEF[e.type];
  const dx = P.x - e.x;
  const dist = Math.abs(dx);
  const dz = P.z - e.z;
  e.cd -= dt;
  if (e.boss && e.poise < e.poiseMax) {
    e.pRegen = (e.pRegen || 0) + dt;
    if (e.pRegen > 3) { e.poise = e.poiseMax; e.pRegen = 0; }
  }
  const spd = def.spd * (e.boss && e.phase > 1 ? 1.25 : 1) * (1 + S.zi * .05);
  switch (e.state) {
    case 'enter':
      e.face = -1;
      e.x -= spd * dt;
      if (e.x < S.camX + W - 260) { e.state = 'idle'; setAnim(e, e.ch + '_idle'); }
      break;
    case 'idle':
    case 'walk':
      approach(e, def, dist, dx, dz, spd, dt);
      break;
    case 'atk':
      attack(e, def, dt);
      break;
    case 'hurt':
      if (e.done) { e.state = 'idle'; e.cd = Math.max(e.cd, .35); }
      break;
    case 'air':
      if (e.h <= 0 && e.vh <= 0) {
        e.state = 'down';
        e.downT = .55;
        shake(5);
        spark(e.x, zy(e.z), 10, '#d8c7a6', 300, .4, 5);
      }
      break;
    case 'down':
      e.downT -= dt;
      if (e.downT <= 0) { e.state = 'idle'; setAnim(e, e.ch + '_idle'); e.cd = Math.max(e.cd, .4); }
      break;
    case 'rage':
      if (e.done) { e.state = 'idle'; e.cd = .6; }
      break;
  }
  if (e.h > 0 || e.vh > 0) {
    e.vh -= GRAVITY * dt * .85;
    e.h += e.vh * dt;
    if (e.h <= 0) { e.h = 0; e.vh = 0; }
  }
  e.vx *= .88;
  e.x += e.vx * dt;
  keepInArena(e, def);
}
