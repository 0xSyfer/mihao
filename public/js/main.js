import { W, ZONES, DEBUG } from './config.js';
import { loadManifest, loadList, charAtlases, imagePath } from './assets.js';
import { S, P, updAnim } from './state.js';
import { audioInit, track, muteWhenHidden } from './audio.js';
import { setupKeyboard, setupTouch, pressed } from './input.js';
import { updateHUD } from './hud.js';
import { updatePlayer } from './player.js';
import { updateEnemy } from './enemies.js';
import { updateLevel, updateWorldFx } from './world.js';
import { render, canvasSnapshot } from './render.js';
import { toTitle, togglePause, startRun, startZone, setupUI, paintGrain } from './screens.js';
import { clamp, lerp } from './util.js';

let last = performance.now();
export const resetClock = () => { last = performance.now(); };

function step(dt) {
  if (S.slow > 0) { S.slow -= dt; dt *= .35; }
  S.time += dt;
  S.shake *= Math.pow(.0006, dt);
  S.flash = Math.max(0, S.flash - dt);
  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
  updatePlayer(dt);
  updAnim(P, dt);
  for (const e of S.actors) {
    if (e === P) continue;
    updateEnemy(e, dt);
    if (!e.fly) updAnim(e, dt);
    if (e.tele > 0) e.tele -= dt;
  }
  updateLevel(dt);
  updateWorldFx(dt);
  const target = clamp(P.x - W * .42 + P.face * 60, 0, S.zone.len - W);
  S.camX = S.lock ? clamp(lerp(S.camX, target, dt * 4), S.lock[0], S.lock[1] - W) : lerp(S.camX, target, dt * 4);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  if (S.mode !== 'play') { if (S.zone && P) render(); return; }
  if (pressed('pause')) return togglePause();
  if (S.hitstop > 0) { S.hitstop -= dt; render(); return; }
  step(dt);
  render();
  updateHUD();
}

async function boot() {
  paintGrain();
  setupUI();
  setupKeyboard(() => audioInit(() => S.mode === 'title' && track('title')));
  setupTouch();
  muteWhenHidden(() => S.mode !== 'pause');
  await loadManifest();
  await loadList([imagePath('poster'), imagePath('logo'), imagePath('portrait_mihao'), ...charAtlases('hero')], 'Sharpening the sword…');
  toTitle();
  requestAnimationFrame(frame);
  if (DEBUG) window.__mh = { S, get P() { return P; }, startRun, startZone, ZONES, snapshot: canvasSnapshot };
}

boot();
