import { TOUCH } from './config.js';
import { $, clamp } from './util.js';

export const KEYS = {};
const PRESS = {};
let lastTap = { k: '', t: 0 };
let runLatch = false;
let pads = null;
let stick = { x: 0, y: 0, on: false };
let onFirstInput = () => {};

const MAP = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyJ: 'atk', KeyX: 'atk', KeyK: 'hvy', KeyC: 'hvy', Space: 'jump', KeyL: 'roll', ShiftLeft: 'roll', ShiftRight: 'roll',
  KeyQ: 'q', KeyE: 'e', Escape: 'pause', KeyP: 'pause', Enter: 'enter',
};

const typing = e => e.target && e.target.tagName === 'INPUT';

export function setupKeyboard(firstInput) {
  onFirstInput = firstInput;
  addEventListener('keydown', e => {
    if (typing(e)) return;
    const a = MAP[e.code];
    if (!a) return;
    e.preventDefault();
    onFirstInput();
    if (!KEYS[a]) {
      PRESS[a] = true;
      if (a === 'left' || a === 'right') {
        const now = performance.now();
        runLatch = lastTap.k === a && now - lastTap.t < 260;
        lastTap = { k: a, t: now };
      }
    }
    KEYS[a] = true;
  });
  addEventListener('keyup', e => {
    if (typing(e)) return;
    const a = MAP[e.code];
    if (!a) return;
    KEYS[a] = false;
    if (a === 'left' || a === 'right') runLatch = runLatch && (KEYS.left || KEYS.right);
  });
}

export function pressed(a) {
  const v = PRESS[a];
  PRESS[a] = false;
  return v;
}

export function readMove() {
  let x = (KEYS.right ? 1 : 0) - (KEYS.left ? 1 : 0);
  let y = (KEYS.down ? 1 : 0) - (KEYS.up ? 1 : 0);
  if (stick.on) { x = stick.x; y = stick.y; }
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p) : null;
  if (gp) {
    if (Math.abs(gp.axes[0]) > .25) x = gp.axes[0];
    if (Math.abs(gp.axes[1]) > .25) y = gp.axes[1];
    const down = i => gp.buttons[i] && gp.buttons[i].pressed;
    const prev = pads || [];
    [[2, 'atk'], [3, 'hvy'], [0, 'jump'], [1, 'roll'], [4, 'q'], [5, 'e'], [9, 'pause']].forEach(([i, a]) => {
      if (down(i) && !prev[i]) PRESS[a] = true;
      KEYS[a] = down(i) || KEYS[a];
    });
    pads = gp.buttons.map(b => b.pressed);
  }
  return { x: clamp(x, -1, 1), y: clamp(y, -1, 1), run: runLatch || (Math.abs(x) > .92 && stick.on) };
}

export function setupTouch() {
  if (!TOUCH) return;
  $('touch').classList.add('on');
  const st = $('stick');
  const kn = $('knob');
  let id = null;
  const move = t => {
    const r = st.getBoundingClientRect();
    let dx = (t.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    stick = { x: dx, y: dy, on: true };
    kn.style.transform = `translate(${-50 + dx * 60}%,${-50 + dy * 60}%)`;
  };
  st.addEventListener('touchstart', e => { onFirstInput(); id = e.changedTouches[0].identifier; move(e.changedTouches[0]); e.preventDefault(); }, { passive: false });
  st.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === id) move(t); e.preventDefault(); }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== id) continue;
      id = null;
      stick = { x: 0, y: 0, on: false };
      kn.style.transform = 'translate(-50%,-50%)';
    }
  };
  st.addEventListener('touchend', end);
  st.addEventListener('touchcancel', end);
  [['tbJ', 'atk'], ['tbK', 'hvy'], ['tbS', 'jump'], ['tbR', 'roll'], ['tbQ', 'q'], ['tbE', 'e']].forEach(([el, a]) => {
    const b = $(el);
    b.addEventListener('touchstart', e => { onFirstInput(); PRESS[a] = true; KEYS[a] = true; b.classList.add('on'); e.preventDefault(); }, { passive: false });
    const up = () => { KEYS[a] = false; b.classList.remove('on'); };
    b.addEventListener('touchend', up);
    b.addEventListener('touchcancel', up);
  });
  $('rot').classList.add('need');
}
