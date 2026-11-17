import { LEADERBOARD as LB } from './config.js';
import { $, store } from './util.js';

export const cleanName = v => (v || '').replace(/[^\p{L}\p{N} _.\-$]/gu, '').trim().slice(0, 16);

export let playerName = cleanName(store.get('name', ''));

export const PID = (() => {
  let p = store.get('pid', '');
  if (!/^[0-9a-f]{32}$/.test(p)) {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    p = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    store.set('pid', p);
  }
  return p;
})();

export function setPlayerName(raw) {
  playerName = cleanName(raw) || 'Cat-' + PID.slice(0, 4).toUpperCase();
  store.set('name', playerName);
}

const online = () => !!(LB.url && LB.key);
const headers = extra => Object.assign({ apikey: LB.key }, LB.key.startsWith('eyJ') ? { Authorization: 'Bearer ' + LB.key } : {}, extra || {});

async function worldTop() {
  if (!online()) return null;
  try {
    const r = await fetch(`${LB.url}/rest/v1/leaderboard?select=name,score,zone,won&order=score.desc&limit=10`, { headers: headers() });
    return r.ok ? r.json() : null;
  } catch (e) {
    return null;
  }
}

export async function submitWorld(row) {
  if (!online()) return null;
  try {
    const r = await fetch(`${LB.url}/rest/v1/scores`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify(row),
    });
    if (!r.ok) return /name taken/.test(await r.text()) ? 'taken' : null;
    const c = await fetch(`${LB.url}/rest/v1/leaderboard?select=name&score=gt.${row.score}`, { headers: headers({ Prefer: 'count=exact', Range: '0-0' }) });
    const range = c.headers.get('content-range');
    return range ? +range.split('/')[1] + 1 : null;
  } catch (e) {
    return null;
  }
}

function fillBoard(rows, title) {
  $('boardTitle').textContent = title;
  const el = $('boardList');
  el.innerHTML = rows.length ? '' : '<li class="empty">No warriors yet. Be the first.</li>';
  rows.slice(0, 8).forEach((r, i) => {
    const li = document.createElement('li');
    if (r.name === playerName) li.className = 'me';
    const name = document.createElement('b');
    name.textContent = `${i + 1}. ${r.name}`;
    const score = document.createElement('span');
    score.textContent = r.score.toLocaleString('en-US') + (r.won ? ' 🐉' : '');
    score.title = r.zone;
    li.append(name, score);
    el.appendChild(li);
  });
}

export async function renderBoard() {
  const world = await worldTop();
  if (world) return fillBoard(world, '🌍 World Ranking');
  fillBoard(store.get('board', []).map(r => ({ name: r.n, score: r.s, zone: r.z, won: r.w })), '🏆 Hall of Warriors');
}

export function saveLocal(score, zone, won) {
  const b = store.get('board', []);
  b.push({ n: playerName, s: score, z: zone, w: won ? 1 : 0 });
  b.sort((x, y) => y.s - x.s);
  store.set('board', b.slice(0, 20));
  return b.findIndex(r => r.n === playerName && r.s === score) + 1;
}
