import { CA, ZONES, SKILLS } from './config.js';
import { loadList, zoneAssets, releaseExcept, imagePath } from './assets.js';
import { S, P, resetPlayer, setAnim } from './state.js';
import { track, pauseMusic, resumeMusic, sfx, setSound, isSoundOn, audioInit } from './audio.js';
import { banner, tips, hideTips, setHud, show, hideScreens, showBossBar, showGo, CONTROL_TIPS } from './hud.js';
import { playerName, setPlayerName, PID, renderBoard, saveLocal, submitWorld } from './profile.js';
import { resetClock } from './main.js';
import { $, rnd, store } from './util.js';

export function toTitle() {
  S.mode = 'title';
  setHud(false);
  show('title');
  track('title');
  $('pname').value = playerName;
  renderBoard();
  const best = store.get('best', null);
  $('best').textContent = best
    ? `BEST · ${best.score.toLocaleString('en-US')} pts · reached ${best.zone}`
    : 'The $MIHAO cat picks up a sword. The road to Dragon Peak is long.';
}

function resetRun() {
  Object.assign(S, { zi: 0, score: 0, coins: 0, kills: 0, maxCombo: 0, owned: {}, time: 0 });
  resetPlayer();
}

function placeProps(len) {
  const kinds = ['vase', 'barrel', 'crates'];
  for (let x = 650; x < len - 900; x += rnd(420, 760)) {
    S.props.push({ kind: kinds[Math.floor(Math.random() * kinds.length)], x, z: rnd(.05, .95), hp: 1 });
  }
}

export async function startZone(i) {
  S.zi = i;
  const z = S.zone = ZONES[i];
  const need = new Set(zoneAssets(z));
  releaseExcept(need);
  await loadList([...need], 'Travelling to ' + z.name + '…');
  Object.assign(S, {
    actors: [P], props: [], drops: [], proj: [], fx: [], nums: [], quakes: [], meteors: [],
    camX: 0, lock: null, boss: null, endT: 0, combo: 0, tokens: 0, waveLeft: null, bossDone: false, bossX: z.len - 700,
  });
  showBossBar(false);
  showGo(false);
  Object.assign(P, { x: 260, z: .55, h: 0, vx: 0, vz: 0, vh: 0, state: 'idle', face: 1, dead: false, inv: 1, alpha: 1 });
  setAnim(P, 'hero_idle');
  placeProps(z.len);
  S.encounters = z.waves.map((types, k) => ({ x: 900 + k * ((z.len - 2100) / z.waves.length), types, done: false }));
  setHud(true);
  banner(z.name, z.sub);
  S.mode = 'play';
  $('pnameHud').textContent = playerName;
  if (i === 0) setTimeout(() => S.mode === 'play' && tips(CONTROL_TIPS, 10), 1800);
  track('explore');
  resetClock();
}

export async function startRun() {
  if (S.mode === 'title') setPlayerName($('pname').value);
  audioInit();
  hideScreens();
  hideTips();
  resetRun();
  await startZone(0);
}

export function togglePause() {
  if (S.mode === 'play') {
    S.mode = 'pause';
    show('pause');
    pauseMusic();
  } else if (S.mode === 'pause') {
    S.mode = 'play';
    hideScreens();
    resumeMusic();
    resetClock();
  }
}

function openShop() {
  setHud(false);
  show('shop');
  sfx('gong');
  const pool = SKILLS.filter(s => s.repeat || !S.owned[s.id]);
  const heal = pool.find(s => s.id === 'heal');
  const pick = pool.filter(s => s.id !== 'heal').sort(() => Math.random() - .5).slice(0, 3);
  if (heal) pick.push(heal);
  const cards = $('cards');
  cards.innerHTML = '';
  const paint = () => {
    $('shopcoins').innerHTML = `You have <b class="gold">${S.coins}</b> coins.`;
    [...cards.children].forEach(c => c.classList.toggle('off', S.coins < +c.dataset.price || c.dataset.sold === '1'));
  };
  for (const s of pick) {
    const price = Math.round(s.price * (1 + S.zi * .35));
    const c = document.createElement('div');
    c.className = 'card';
    c.dataset.price = price;
    c.innerHTML = `<img src="${imagePath(s.icon)}" alt=""><h3>${s.name}</h3><p>${s.desc}</p><div class="price"><img src="${imagePath('prop_coin')}" alt="">${price}</div>`;
    c.onclick = () => {
      if (S.coins < price) return;
      S.coins -= price;
      sfx('buy');
      if (s.id === 'heal') {
        P.maxhp += 20;
        P.hp = P.maxhp;
      } else {
        S.owned[s.id] = 1;
        c.dataset.sold = '1';
        c.querySelector('h3').textContent = s.name + ' ✓';
      }
      paint();
    };
    cards.appendChild(c);
  }
  paint();
}

export function zoneCleared() {
  if (S.zi >= ZONES.length - 1) return endScreen(true);
  S.mode = 'shop';
  openShop();
}

export function gameOver() {
  if (S.mode === 'play') endScreen(false);
}

function shareText(won, zone, score) {
  const pts = score.toLocaleString('en-US');
  return won
    ? `I defeated the Dragon Lord in MI HAO: Warrior Cat ⚔️🐱 Score ${pts}. $MIHAO @iamnihaocat`
    : `I reached ${zone} in MI HAO: Warrior Cat ⚔️🐱 Score ${pts}. Can you beat the Dragon Lord? $MIHAO @iamnihaocat`;
}

function endScreen(won) {
  S.mode = 'over';
  setHud(false);
  track('title');
  showBossBar(false);
  hideTips();
  const zone = S.zone.name;
  const score = Math.floor(S.score);
  const best = store.get('best', null);
  const record = !best || score > best.score;
  if (record) store.set('best', { score, zone });
  const rank = saveLocal(score, zone, won);
  const story = won ? 'The Dragon Lord is defeated. The $MIHAO cat stands alone on Dragon Peak.' : `Fallen in ${zone}.` + (record ? ' New personal best!' : '');
  $('overt').textContent = won ? 'Legend of Mi Hao' : 'Mi Hao has fallen';
  $('overs').textContent = `${playerName} · #${rank} in your Hall of Warriors. ${story}`;
  submitWorld({ pid: PID, name: playerName, score, zone, won: !!won, secs: Math.max(10, Math.round(S.time)) }).then(world => {
    if (world === 'taken') $('overs').textContent = `"${playerName}" already belongs to another warrior on the world ranking. Pick another name on the title screen to enter it.`;
    else if (world) $('overs').textContent = `${playerName} · #${world.toLocaleString('en-US')} in the WORLD. ${story}`;
  });
  const rows = [['Score', score.toLocaleString('en-US')], ['Reached', zone], ['Enemies defeated', S.kills], ['Best combo', S.maxCombo],
    ['Coins', S.coins], ['Time', `${Math.floor(S.time / 60)}m ${Math.floor(S.time % 60)}s`]];
  $('stats').innerHTML = rows.map(([a, b]) => `<div>${a}</div><div>${b}</div>`).join('');
  show('over');
  $('share').onclick = () => {
    const url = location.href.split('#')[0].split('?')[0];
    open('https://x.com/intent/tweet?text=' + encodeURIComponent(shareText(won, zone, score)) + '&url=' + encodeURIComponent(url), '_blank', 'noopener');
  };
}

function copyCA() {
  const el = $('ca');
  const done = () => {
    const html = el.innerHTML;
    el.innerHTML = '<b>Contract address copied ✓</b>';
    setTimeout(() => { el.innerHTML = html; }, 1400);
  };
  if (navigator.clipboard) return navigator.clipboard.writeText(CA).then(done, done);
  const ta = document.createElement('textarea');
  ta.value = CA;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  ta.remove();
  done();
}

export function paintGrain() {
  const c = $('grain').getContext('2d');
  const d = c.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  c.putImageData(d, 0, 0);
}

export function setupUI() {
  $('play').onclick = startRun;
  $('howbtn').onclick = () => show('how');
  document.querySelectorAll('[data-back]').forEach(b => { b.onclick = toTitle; });
  $('resume').onclick = togglePause;
  $('quit').onclick = toTitle;
  $('sndbtn').onclick = () => setSound(!isSoundOn());
  setSound(isSoundOn());
  $('pausebtn').onclick = togglePause;
  $('again').onclick = startRun;
  $('menu').onclick = toTitle;
  $('ca').onclick = copyCA;
  $('shopgo').onclick = async () => { hideScreens(); await startZone(S.zi + 1); };
  addEventListener('blur', () => { if (S.mode === 'play') togglePause(); });
  addEventListener('keydown', e => {
    if (e.code === 'Enter' && S.mode === 'title' && $('title').classList.contains('on')) { e.preventDefault(); startRun(); }
  });
  $('pname').addEventListener('keydown', e => e.stopPropagation());
  $('pname').addEventListener('keyup', e => { if (e.code === 'Enter') startRun(); });
  $('title').style.backgroundImage = `url(${imagePath('poster')})`;
}
