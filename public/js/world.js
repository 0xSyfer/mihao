import { W, GRAVITY } from './config.js';
import { S, P, setAnim, inHit, zy, bodyY } from './state.js';
import { sfx } from './audio.js';
import { banner, toast, showGo } from './hud.js';
import { hurtEnemy, hurtPlayer, shake, spark, dmgNum } from './combat.js';
import { spawnEnemy, spawnBoss } from './enemies.js';
import { zoneCleared } from './screens.js';
import { rnd, sgn } from './util.js';

export function updateLevel(dt) {
  if (!S.lock) {
    const enc = S.encounters.find(c => !c.done && P.x > c.x);
    if (enc) {
      enc.done = true;
      S.lock = [S.camX, S.camX + W];
      S.waveLeft = enc.types.slice();
      S.spawnT = .3;
      showGo(false);
    } else if (!S.bossDone && !S.boss && P.x > S.bossX) {
      S.lock = [S.camX, S.camX + W];
      spawnBoss();
    }
  }
  if (S.lock && S.waveLeft && S.waveLeft.length) {
    S.spawnT -= dt;
    if (S.spawnT <= 0) {
      spawnEnemy(S.waveLeft.shift(), Math.random() < .62 ? 1 : -1);
      S.spawnT = rnd(.45, 1.1);
    }
  }
  const alive = S.actors.some(a => a !== P && !a.dead);
  if (S.lock && !alive && (!S.waveLeft || !S.waveLeft.length) && !S.boss) {
    S.lock = null;
    S.waveLeft = null;
    showGo(true);
    S.goT = 2.5;
    toast('AREA CLEARED');
  }
  if (S.goT > 0) { S.goT -= dt; if (S.goT <= 0) showGo(false); }
  if (S.bossDone && !S.endT) S.endT = 4.2;
  if (!S.endT) return;
  const prev = S.endT;
  S.endT -= dt;
  if (prev > 3 && S.endT <= 3 && !P.dead) {
    P.state = 'win';
    setAnim(P, 'hero_victory', 1.1);
    sfx('gong');
    banner('VICTORY', S.zone.name.toUpperCase());
  }
  if (S.endT <= 0 && prev > 0) {
    S.score += Math.round(P.hp * 20);
    S.endT = -1;
    zoneCleared();
  }
}

function updateProjectiles(dt) {
  for (const p of S.proj) {
    p.x += p.vx * dt;
    p.life -= dt;
    if (p.vh !== undefined) p.h += p.vh * dt;
    if (p.from === 'e') {
      if (Math.abs(p.x - P.x) < 50 && Math.abs(p.z - P.z) < .16 && Math.abs(p.h - (P.h + 100)) < 110 && hurtPlayer(p.dmg, sgn(p.vx), 220)) p.life = 0;
      const parry = P.state === 'atk' && P.move && !P.move.air && inHit(P);
      if (parry && p.kind === 'arrow' && Math.abs(p.x - (P.x + P.face * 120)) < 90 && Math.abs(p.z - P.z) < .2) {
        p.life = 0;
        spark(p.x, zy(p.z) - p.h, 8, '#fff');
        sfx('hit');
        toast('DEFLECTED');
      }
    } else {
      for (const e of S.actors) {
        if (e === P || e.dead || p.hit.has(e)) continue;
        if (Math.abs(e.x - p.x) < 70 && Math.abs(e.z - p.z) < .25) {
          p.hit.add(e);
          hurtEnemy(e, p.dmg, sgn(p.vx), 260, 0, { qi: 2 });
        }
      }
    }
    if (p.kind === 'fire' && p.h <= 0) p.life = 0;
  }
  S.proj = S.proj.filter(p => p.life > 0);
}

function updateQuakes(dt) {
  for (const q of S.quakes) {
    q.t += dt;
    q.r = q.t * 1100;
    if (q.from === 'e') {
      if (!q.hit.has(P) && Math.abs(Math.abs(P.x - q.x) - q.r) < 60 && P.h < 30) {
        q.hit.add(P);
        hurtPlayer(q.dmg, sgn(P.x - q.x), 380);
      }
      continue;
    }
    for (const e of S.actors) {
      if (e === P || e.dead || q.hit.has(e)) continue;
      const d = Math.abs(e.x - q.x);
      if (d < q.r && d > q.r - 120) {
        q.hit.add(e);
        hurtEnemy(e, 22, sgn(e.x - q.x), 360, 0, { qi: 2 });
      }
    }
  }
  S.quakes = S.quakes.filter(q => q.r < q.max);
}

function updateMeteors(dt) {
  for (const m of S.meteors) {
    m.t += dt;
    if (m.t < m.fall || m.hit) continue;
    m.hit = 1;
    sfx('boom');
    shake(10);
    spark(m.x, zy(m.z), 26, '#ff7a2a', 620, .6, 6);
    if (Math.abs(P.x - m.x) < 95 && Math.abs(P.z - m.z) < .22) hurtPlayer(14 + S.zi * 2, sgn(P.x - m.x), 300);
  }
  S.meteors = S.meteors.filter(m => m.t < m.fall + .4);
}

function updateDrops(dt) {
  for (const d of S.drops) {
    d.t += dt;
    d.vh -= GRAVITY * dt;
    d.h = Math.max(0, d.h + d.vh * dt);
    if (d.h === 0) { d.vh = Math.abs(d.vh) > 200 ? -d.vh * .35 : 0; d.vx *= .8; }
    d.x += d.vx * dt;
    const dx = P.x - d.x;
    const dz = P.z - d.z;
    const near = S.bossDone || (Math.abs(dx) < 150 && Math.abs(dz) < .3);
    if (near && d.t > .35 && !P.dead) { d.x += dx * dt * 8; d.z += dz * dt * 8; }
    if (Math.abs(dx) < 34 && Math.abs(dz) < .12 && d.t > .35 && !P.dead) {
      d.gone = 1;
      if (d.kind === 'coin') {
        S.coins++;
        S.score += 10;
        sfx('coin');
      } else {
        P.hp = Math.min(P.maxhp, P.hp + 30);
        sfx('heal');
        dmgNum(P.x, bodyY(P) - 50, '+30', '#7dffb5', true);
      }
    }
  }
  S.drops = S.drops.filter(d => !d.gone && d.t < 14);
}

export function updateWorldFx(dt) {
  updateProjectiles(dt);
  updateQuakes(dt);
  updateMeteors(dt);
  updateDrops(dt);
  for (const f of S.fx) { f.t += dt; f.vy += f.g * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
  S.fx = S.fx.filter(f => f.t < f.life);
  for (const n of S.nums) n.t += dt;
  S.nums = S.nums.filter(n => n.t < .9);
  S.actors = S.actors.filter(a => a === P || a.alpha > 0);
}
