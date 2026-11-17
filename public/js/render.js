import { W, H, SIZE, NATIVE, SPRITE_DIR, POSE_BLEND } from './config.js';
import { M, img, imagePath } from './assets.js';
import { S, P, dispScale, zy, zs, bodyY } from './state.js';
import { rnd, clamp, sgn, $ } from './util.js';

const cv = $('game');
const ctx = cv.getContext('2d');

function drawLayer(im, parallax) {
  if (!im) return;
  const w = im.width * H / im.height;
  let off = -(S.camX * parallax) % w;
  if (off > 0) off -= w;
  let idx = Math.floor((S.camX * parallax) / w);
  for (let x = off; x < W; x += w, idx++) {
    if (idx % 2) {
      ctx.save();
      ctx.translate(x + w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(im, 0, 0, w, H);
      ctx.restore();
    } else {
      ctx.drawImage(im, x, 0, w, H);
    }
  }
}

function drawFrame(a, f, s, alpha) {
  const im = img(SPRITE_DIR + a.src);
  if (!im) return;
  f = Math.min(f, a.n - 1);
  ctx.globalAlpha = alpha;
  ctx.drawImage(im, (f % a.cols) * a.fw, Math.floor(f / a.cols) * a.fh, a.fw, a.fh, -a.ax * s, -a.ay * s, a.fw * s, a.fh * s);
}

function drawSprite(e) {
  const a = M.anims[e.anim];
  if (!a) return;
  const im = img(SPRITE_DIR + a.src);
  if (!im) return;
  const f = Math.min(e.frame, a.n - 1);
  const s = dispScale(a.char) * zs(e.z);
  ctx.save();
  ctx.translate(e.x - S.camX, zy(e.z) - e.h);
  if (e.face !== (NATIVE[a.char] || -1)) ctx.scale(-1, 1);
  drawFrame(a, f, s, e.alpha);
  if (e.prev && M.anims[e.prev.anim]) drawFrame(M.anims[e.prev.anim], e.prev.frame, s, e.alpha * .9 * (e.prev.t / POSE_BLEND));
  if (e.nframe !== undefined && e.nframe !== f && e.frac > .08) drawFrame(a, e.nframe, s, e.alpha * e.frac);
  const blink = e === P && P.inv > 0 && P.state !== 'roll' && Math.floor(S.time * 20) % 2;
  if (e.flash > 0 || blink) {
    ctx.globalCompositeOperation = 'lighter';
    drawFrame(a, f, s, e.flash > 0 ? .55 : .25);
  }
  ctx.restore();
}

function drawLantern(e) {
  const im = img(imagePath('lantern'));
  if (!im) return;
  const s = .62 * zs(e.z);
  const w = im.width * s;
  const h = im.height * s;
  ctx.save();
  ctx.globalAlpha = e.alpha;
  ctx.translate(e.x - S.camX, zy(e.z) - e.h);
  ctx.rotate(Math.sin(e.bob * .8) * .12);
  if (e.face > 0) ctx.scale(-1, 1);
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = .25 + .15 * Math.sin(S.time * 9) + (e.flash > 0 ? .5 : 0);
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function shadow(x, z, h, r) {
  const k = clamp(1 - h / 500, .25, 1);
  ctx.fillStyle = `rgba(20,8,4,${.38 * k})`;
  ctx.beginPath();
  ctx.ellipse(x - S.camX + 10, zy(z), r * k, r * .2 * k, 0, 0, 7);
  ctx.fill();
}

function drawProp(p) {
  const im = img(imagePath('prop_' + p.kind));
  if (!im) return;
  const s = .34 * zs(p.z);
  shadow(p.x, p.z, 0, im.width * s * .45);
  ctx.drawImage(im, p.x - S.camX - im.width * s / 2, zy(p.z) - im.height * s, im.width * s, im.height * s);
}

function drawDrop(d) {
  const coin = d.kind === 'coin';
  const im = img(imagePath(coin ? 'prop_coin' : 'prop_peach'));
  if (!im) return;
  const s = coin ? .26 : .3;
  const spin = coin ? Math.abs(Math.cos(S.time * 6 + d.x)) : 1;
  const w = im.width * s * spin;
  const h = im.height * s;
  ctx.drawImage(im, d.x - S.camX - w / 2, zy(d.z) - d.h - h, w, h);
}

function drawActor(e) {
  if (e.fly) {
    shadow(e.x, e.z, e.h, 40);
    drawLantern(e);
  } else {
    if (e.alpha > 0) shadow(e.x, e.z, e.h, (e.boss ? 120 : 62) * SIZE[e.ch]);
    drawSprite(e);
  }
  if (e.state === 'atk' && e.tele > 0) {
    ctx.fillStyle = '#ff4a36';
    ctx.font = '800 34px Cinzel,serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', e.x - S.camX, bodyY(e) - 120 * SIZE[e.ch]);
  }
}

function glow(x, y, r, inner, mid, outer) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(.4, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
}

function drawProjectile(p) {
  const x = p.x - S.camX;
  const y = zy(p.z) - p.h;
  if (p.kind === 'arrow') {
    ctx.strokeStyle = '#3a2412';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - sgn(p.vx) * 46, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(x + sgn(p.vx) * 12, y);
    ctx.lineTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.fill();
  } else if (p.kind === 'fire') {
    glow(x, y, 26, '#fff3b0', '#ff8a2a', 'rgba(255,60,0,0)');
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sgn(p.vx), 1);
    const g = ctx.createLinearGradient(-60, 0, 30, 0);
    g.addColorStop(0, 'rgba(255,220,120,0)');
    g.addColorStop(1, 'rgba(255,240,180,.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-70, -10);
    ctx.quadraticCurveTo(30, -70, 34, 0);
    ctx.quadraticCurveTo(30, 70, -70, 10);
    ctx.quadraticCurveTo(0, 0, -70, -10);
    ctx.fill();
    ctx.restore();
  }
}

function drawTelegraphs() {
  for (const m of S.meteors) {
    if (m.t <= 0 || m.t >= m.fall) continue;
    const k = m.t / m.fall;
    ctx.strokeStyle = `rgba(255,80,30,${.4 + .5 * k})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(m.x - S.camX, zy(m.z), 95 * k, 20 * k, 0, 0, 7);
    ctx.stroke();
  }
  for (const q of S.quakes) {
    ctx.strokeStyle = q.fire ? 'rgba(255,140,40,.8)' : 'rgba(255,220,160,.7)';
    ctx.lineWidth = 6 * (1 - q.r / q.max) + 1;
    ctx.beginPath();
    ctx.ellipse(q.x - S.camX, zy(.5), q.r, q.r * .12, 0, 0, 7);
    ctx.stroke();
  }
}

function drawMeteors() {
  for (const m of S.meteors) {
    if (m.t <= m.fall - .5 || m.t >= m.fall) continue;
    const k = (m.fall - m.t) / .5;
    glow(m.x - S.camX + k * 160, zy(m.z) - k * 700, 34, '#fff6c0', '#ff7a1a', 'rgba(255,40,0,0)');
  }
}

function drawParticles() {
  ctx.globalCompositeOperation = 'lighter';
  for (const f of S.fx) {
    ctx.fillStyle = f.col;
    ctx.globalAlpha = 1 - f.t / f.life;
    ctx.fillRect(f.x - S.camX - f.size / 2, f.y - f.size / 2, f.size, f.size);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawNumbers() {
  ctx.textAlign = 'center';
  for (const n of S.nums) {
    const k = n.t / .9;
    ctx.globalAlpha = 1 - k * k;
    ctx.font = `800 ${n.big ? 34 : 24}px Cinzel,serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.strokeText(n.v, n.x - S.camX, n.y - k * 60);
    ctx.fillStyle = n.col;
    ctx.fillText(n.v, n.x - S.camX, n.y - k * 60);
  }
  ctx.globalAlpha = 1;
}

function drawOverlays() {
  ctx.fillStyle = S.zone.tint;
  ctx.fillRect(0, 0, W, H);
  if (S.flash > 0) {
    const low = P.hp < 30;
    ctx.fillStyle = `rgba(255,${low ? 60 : 240},${low ? 40 : 200},${S.flash * .7})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (P.hp < 30 && !P.dead) {
    ctx.fillStyle = `rgba(160,0,0,${.12 + .08 * Math.sin(S.time * 6)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export function render() {
  const key = S.zone.key;
  ctx.save();
  if (S.shake > .3) ctx.translate(rnd(-S.shake, S.shake), rnd(-S.shake, S.shake) * .6);
  drawLayer(img(imagePath(key + '_far')), .12);
  drawLayer(img(imagePath(key + '_mid')), .5);
  drawLayer(img(imagePath(key + '_ground')), 1);
  drawTelegraphs();
  const list = [];
  for (const p of S.props) if (p.hp > 0) list.push([p.z, () => drawProp(p)]);
  for (const d of S.drops) list.push([d.z, () => drawDrop(d)]);
  for (const e of S.actors) list.push([e.z, () => drawActor(e)]);
  list.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => draw());
  S.proj.forEach(drawProjectile);
  drawMeteors();
  drawParticles();
  drawNumbers();
  ctx.restore();
  drawOverlays();
}

export function canvasSnapshot() {
  return cv.toDataURL('image/png');
}
