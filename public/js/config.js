export const W = 1280;
export const H = 720;
export const CA = '4CxjZyMNoF1p6eXHXHv1TWpS2X47CuUmLwtGe18spump';
export const GY0 = 606;
export const LANE = 92;
export const HERO_H = 236;
export const SRC_H = 430;
export const GRAVITY = 2300;
export const POSE_BLEND = .1;

const query = location.search;
export const LITE = /[?&]lite\b/.test(query) || (!/[?&]hd\b/.test(query) &&
  (matchMedia('(pointer:coarse)').matches || (navigator.deviceMemory && navigator.deviceMemory <= 4)));
export const DEBUG = /[?&]debug\b/.test(query);
export const TOUCH = matchMedia('(pointer:coarse)').matches;

export const SPRITE_DIR = LITE ? 'assets/sprites/lite/' : 'assets/sprites/hd/';
export const IMAGE_DIR = 'assets/images/';
export const AUDIO_DIR = 'assets/audio/';

export const SIZE = { hero: .86, rat: .92, fox: .95, jiangshi: 1.02, ox: 1.28, tiger: 1.42, toad: 1.38, wolf: 1.48, dragon: 1.62 };
export const NATIVE = { hero: 1 };

export const EDEF = {
  rat: { hp: 48, spd: 165, dmg: 9, reach: 210, cd: [1.1, 2.0], poise: 0, coins: 3, score: 100, atk: 'rat_attack' },
  fox: { hp: 40, spd: 150, dmg: 11, ranged: 1, keep: [380, 560], cd: [1.7, 2.6], poise: 0, coins: 4, score: 140, atk: 'fox_attack' },
  jiangshi: { hp: 76, spd: 130, dmg: 13, reach: 200, cd: [1.3, 2.2], poise: 14, coins: 5, score: 180, atk: 'jiangshi_attack' },
  ox: { hp: 150, spd: 100, dmg: 21, reach: 320, cd: [1.9, 2.9], poise: 34, coins: 9, score: 320, atk: 'ox_attack' },
  lantern: { hp: 32, spd: 120, dmg: 10, fly: 1, cd: [2.0, 3.0], poise: 0, coins: 3, score: 120 },
};

export const BDEF = {
  tiger: {
    hp: 950, spd: 150, poise: 70, name: 'Grandmaster Bai Hu', title: 'Guardian of the Temple', cd: [1.0, 1.8],
    atks: [{ a: 'tiger_attack', dmg: 16, reach: 340 }, { a: 'tiger_combo', dmg: 9, reach: 350, multi: .2 },
      { a: 'tiger_combo2', dmg: 9, reach: 350, multi: .2 }, { a: 'tiger_slam', dmg: 20, reach: 420, quake: 1 }],
    rage: 'tiger_roar',
  },
  toad: {
    hp: 1150, spd: 120, poise: 80, name: 'Boss Chan Chu', title: 'King of the Mahjong House', cd: [1.0, 1.7],
    atks: [{ a: 'toad_attack', dmg: 14, reach: 520 }, { a: 'toad_swing', dmg: 19, reach: 360 },
      { a: 'toad_belly', dmg: 18, reach: 330, charge: 520 }],
    rage: null,
  },
  wolf: {
    hp: 1350, spd: 165, poise: 90, name: 'General Lang', title: 'Warden of the Great Wall', cd: [.9, 1.6],
    atks: [{ a: 'wolf_attack', dmg: 17, reach: 380 }, { a: 'wolf_thrust', dmg: 9, reach: 440, multi: .18 }],
    rage: 'wolf_howl', summon: ['rat', 'fox'],
  },
  dragon: {
    hp: 1750, spd: 150, poise: 110, name: 'Long Wang', title: 'The Dragon Lord', cd: [.85, 1.5],
    atks: [{ a: 'dragon_attack', dmg: 19, reach: 430 }, { a: 'dragon_sweep', dmg: 21, reach: 400 }],
    rage: 'dragon_roar', meteors: 1,
  },
};

export const ZONES = [
  {
    key: 'temple', name: 'Temple of the Golden Sun', sub: 'LAND I', len: 5600, boss: 'tiger', tint: 'rgba(255,170,90,.10)',
    waves: [['rat', 'rat'], ['rat', 'fox', 'rat'], ['rat', 'rat', 'fox', 'lantern'], ['rat', 'fox', 'rat', 'rat']],
  },
  {
    key: 'mahjong', name: 'The Mahjong House', sub: 'LAND II', len: 5800, boss: 'toad', tint: 'rgba(255,90,60,.10)',
    waves: [['rat', 'jiangshi'], ['lantern', 'lantern', 'rat'], ['jiangshi', 'fox', 'rat'], ['jiangshi', 'jiangshi', 'lantern', 'fox']],
  },
  {
    key: 'wall', name: 'The Great Wall', sub: 'LAND III', len: 6000, boss: 'wolf', tint: 'rgba(150,170,255,.10)',
    waves: [['fox', 'fox', 'rat'], ['ox', 'rat'], ['ox', 'jiangshi', 'fox'], ['fox', 'fox', 'ox', 'rat']],
  },
  {
    key: 'dragon', name: 'Dragon Peak', sub: 'FINAL LAND', len: 6200, boss: 'dragon', tint: 'rgba(255,60,20,.13)',
    waves: [['ox', 'ox'], ['jiangshi', 'lantern', 'lantern', 'fox'], ['ox', 'fox', 'jiangshi', 'rat'], ['ox', 'ox', 'lantern', 'fox']],
  },
];

export const MOVES = {
  slash: { anim: 'hero_slash', dmg: 10, reach: [10, 250], zr: .2, kb: 160, speed: 1.8, next: 'thrust', qi: 4 },
  thrust: { anim: 'hero_thrust', dmg: 11, reach: [10, 280], zr: .2, kb: 190, speed: 1.8, next: 'combo3', qi: 4 },
  combo3: { anim: 'hero_combo3', dmg: 18, reach: [-40, 270], zr: .22, kb: 460, speed: 1.7, qi: 6, finisher: 1 },
  launcher: { anim: 'hero_launcher', dmg: 14, reach: [0, 230], zr: .2, kb: 60, launch: 760, speed: 1.75, qi: 6 },
  heavy: { anim: 'hero_heavy', dmg: 26, reach: [10, 250], zr: .24, kb: 380, speed: 1.6, qi: 7, heavy: 1 },
  air: { anim: 'hero_air', dmg: 13, reach: [-20, 230], zr: .22, kb: 140, speed: 1.75, qi: 4, air: 1 },
  whip: { anim: 'hero_mustache', dmg: 20, reach: [40, 470], zr: .26, kb: 300, speed: 1.45, cost: 30 },
  whirl: { anim: 'hero_whirlwind', dmg: 9, reach: [-230, 230], zr: .3, kb: 220, speed: 1.45, cost: 45, multi: .14 },
};

export const SKILLS = [
  { id: 'whip', name: 'Mustache Whip', icon: 'icon_mustache', price: 30, desc: 'Q · lash out with the legendary mustache. Huge reach. 30 Qi.' },
  { id: 'whirl', name: 'Golden Whirlwind', icon: 'icon_whirlwind', price: 45, desc: 'E · spin through a crowd, hitting everything around you. 45 Qi.' },
  { id: 'wave', name: 'Blade Wave', icon: 'icon_wave', price: 35, desc: 'The 3rd hit of your combo fires a flying golden blade.' },
  { id: 'lantern', name: 'Lantern Burst', icon: 'icon_lantern', price: 40, desc: 'Heavy strikes explode in fire around you.' },
  { id: 'shadow', name: 'Shadow Step', icon: 'icon_shadowstep', price: 30, desc: 'Longer roll and invincibility. Dodge at the last moment to slow time.' },
  { id: 'shield', name: 'Jade Shield', icon: 'icon_shield', price: 35, desc: 'Take 25% less damage from everything.' },
  { id: 'djump', name: 'Cloud Wings', icon: 'icon_doublejump', price: 25, desc: 'Jump again in mid-air.' },
  { id: 'heal', name: 'Peach of Immortality', icon: 'icon_heal', price: 20, desc: '+20 max HP and a full heal. Can be bought again.', repeat: 1 },
];

export const LEADERBOARD = { url: 'https://hgwvsljuclrbrfrmangi.supabase.co', key: 'sb_publishable_Oy2Uw8prtntW908kAJUswg_ZetaALpE' };
