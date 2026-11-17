import { SPRITE_DIR, IMAGE_DIR } from './config.js';
import { $ } from './util.js';

export let M = null;
const IMG = {};

export async function loadManifest() {
  M = await fetch(SPRITE_DIR + 'sprites.json').then(r => r.json());
}

export function loadImg(src) {
  if (IMG[src]) return IMG[src].p;
  const im = new Image();
  const rec = { im, ok: false };
  rec.p = new Promise(res => {
    im.onload = () => {
      (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { rec.ok = true; res(); });
    };
    im.onerror = () => res();
  });
  im.src = src;
  IMG[src] = rec;
  return rec.p;
}

export const img = src => (IMG[src] && IMG[src].ok ? IMG[src].im : null);
export const imagePath = name => IMAGE_DIR + name + '.webp';
export const charAtlases = ch => Object.values(M.anims).filter(a => a.char === ch).map(a => SPRITE_DIR + a.src);

export async function loadList(list, label) {
  $('loading').classList.add('on');
  $('loadtxt').textContent = label;
  let done = 0;
  const bar = $('loadbar').firstElementChild;
  bar.style.width = '0';
  await Promise.all(list.map(s => loadImg(s).then(() => { done++; bar.style.width = (100 * done / list.length) + '%'; })));
  const wc = document.createElement('canvas');
  wc.width = wc.height = 2;
  const wx = wc.getContext('2d');
  list.forEach(s => { const i = img(s); if (i) wx.drawImage(i, 0, 0, 2, 2); });
  $('loading').classList.remove('on');
}

export function zoneAssets(z) {
  const chars = new Set(['hero', z.boss]);
  z.waves.flat().forEach(c => chars.add(c));
  const list = [imagePath(z.key + '_far'), imagePath(z.key + '_mid'), imagePath(z.key + '_ground'), imagePath('lantern'),
    ...['vase', 'barrel', 'crates', 'coin', 'peach'].map(p => imagePath('prop_' + p))];
  chars.forEach(c => { if (c !== 'lantern') list.push(...charAtlases(c)); });
  return list;
}

export function releaseExcept(keep) {
  Object.keys(IMG).forEach(k => {
    const zoneFile = k.startsWith(SPRITE_DIR) || /_(far|mid|ground)\.webp$/.test(k);
    if (zoneFile && !keep.has(k) && !k.includes('/hero_')) {
      IMG[k].im.src = '';
      delete IMG[k];
    }
  });
}
