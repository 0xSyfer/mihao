import { TOUCH } from './config.js';
import { S, P } from './state.js';
import { $ } from './util.js';

export const CONTROL_TIPS = TOUCH
  ? '<span><b>Joystick</b> move</span><span><b>ATK</b> combo</span><span><b>HVY</b> heavy · after 2 hits: launcher</span><span><b>JMP</b> jump</span><span><b>ROLL</b> dodge (invincible)</span>'
  : '<span><b>A D</b> move · double-tap to run</span><span><b>W S</b> depth</span><span><b>J</b> combo</span><span><b>K</b> heavy · after 2 hits: launcher</span><span><b>Space</b> jump</span><span><b>L / Shift</b> roll (invincible)</span>';

export const BOSS_TIPS = TOUCH
  ? '<span>Red <b>!</b> = attack coming → <b>ROLL</b> through it</span><span><b>JMP</b> over shockwave rings</span><span>Punish with full combos</span>'
  : '<span>Red <b>!</b> = attack coming → <b>roll</b> through it (L / Shift)</span><span><b>Space</b>: jump over shockwave rings</span><span>Then punish with <b>J J J</b> or <b>J J K</b></span>';

const timers = {};
function flashText(id, ms, apply) {
  const el = $(id);
  apply(el);
  el.style.opacity = 1;
  clearTimeout(timers[id]);
  timers[id] = setTimeout(() => { el.style.opacity = 0; }, ms);
}

export const banner = (title, sub) => flashText('zone', 2600, el => { el.innerHTML = title + '<small>' + sub + '</small>'; });
export const toast = text => flashText('toast', 1600, el => { el.textContent = text; });

export function tips(html, secs) {
  const el = $('tips');
  el.innerHTML = html;
  el.classList.add('on');
  clearTimeout(timers.tips);
  timers.tips = setTimeout(() => el.classList.remove('on'), secs * 1000);
}

export const hideTips = () => $('tips').classList.remove('on');
export const setHud = on => $('hud').classList.toggle('on', on);
export const show = id => document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
export const hideScreens = () => document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
export const showBossBar = on => { $('bossbar').style.display = on ? 'block' : 'none'; };
export const showGo = on => { $('go').style.display = on ? 'block' : 'none'; };

const RANKS = [[30, 'LEGENDARY'], [20, 'UNSTOPPABLE'], [10, 'FEROCIOUS'], [0, 'HITS']];

export function updateHUD() {
  $('hpbar').style.transform = `scaleX(${P.hp / P.maxhp})`;
  $('qibar').style.transform = `scaleX(${P.qi / 100})`;
  $('coinN').textContent = S.coins;
  $('scoreN').textContent = Math.floor(S.score).toLocaleString('en-US');
  const combo = $('combo');
  if (S.combo >= 3) {
    combo.style.opacity = 1;
    $('comboN').textContent = S.combo;
    $('comboT').textContent = RANKS.find(([n]) => S.combo >= n)[1];
  } else {
    combo.style.opacity = 0;
  }
  if (S.boss && !S.boss.dead) $('bosshp').style.transform = `scaleX(${Math.max(0, S.boss.hp / S.boss.maxhp)})`;
}
