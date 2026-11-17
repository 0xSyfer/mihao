import { AUDIO_DIR } from './config.js';
import { $, store } from './util.js';

let ac = null;
let master = null;
let soundOn = store.get('sound', true);
let current = null;
const music = {};
const TRACKS = { title: ['music_mihao.m4a', .5], explore: ['music_explore.m4a', .42] };

export const isSoundOn = () => soundOn;

export function track(name, rate = 1) {
  if (!music[name]) {
    const a = new Audio(AUDIO_DIR + TRACKS[name][0]);
    a.loop = true;
    a.volume = TRACKS[name][1];
    music[name] = a;
  }
  if (current && current !== name) music[current].pause();
  current = name;
  const a = music[name];
  a.playbackRate = rate;
  a.muted = !soundOn;
  if (soundOn && !document.hidden) a.play().catch(() => {});
}

export const pauseMusic = () => current && music[current].pause();
export const resumeMusic = () => current && soundOn && !document.hidden && music[current].play().catch(() => {});

export function muteWhenHidden(mayResume) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      Object.values(music).forEach(a => a.pause());
      if (ac) ac.suspend().catch(() => {});
      return;
    }
    if (ac) ac.resume().catch(() => {});
    if (mayResume()) resumeMusic();
  });
  addEventListener('pagehide', () => Object.values(music).forEach(a => a.pause()));
}

export function audioInit(onFirst) {
  if (ac) return;
  if (onFirst) setTimeout(onFirst);
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = soundOn ? .55 : 0;
    master.connect(ac.destination);
  } catch (e) {}
}

export function setSound(on) {
  soundOn = on;
  store.set('sound', on);
  if (master) master.gain.value = on ? .55 : 0;
  Object.values(music).forEach(a => { a.muted = !on; });
  if (on) resumeMusic();
  $('sndbtn').textContent = 'SOUND: ' + (on ? 'ON' : 'OFF');
}

function noise(dur, f0, f1, vol, type = 'bandpass', q = 1) {
  if (!ac) return;
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + dur);
}

function tone(f0, f1, dur, vol, type = 'sine', delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur);
}

const SFX = {
  swish: () => noise(.16, 2500, 700, .35, 'bandpass', 1.4),
  heavy: () => { noise(.25, 1600, 300, .45, 'bandpass', 1); tone(140, 60, .25, .35, 'triangle'); },
  hit: () => { noise(.09, 3000, 600, .5, 'highpass', .7); tone(190, 70, .12, .5, 'triangle'); },
  big: () => { noise(.3, 900, 120, .6, 'lowpass', .8); tone(110, 40, .35, .6, 'sine'); },
  hurt: () => { tone(320, 120, .22, .35, 'sawtooth'); noise(.12, 1500, 400, .3); },
  coin: () => { tone(1320, 1320, .07, .18, 'square'); tone(1980, 1980, .12, .16, 'square', .06); },
  heal: () => { [660, 880, 1320].forEach((f, i) => tone(f, f, .18, .18, 'sine', i * .07)); },
  jump: () => tone(300, 620, .14, .18, 'triangle'),
  roll: () => noise(.2, 600, 200, .25, 'lowpass'),
  boom: () => { noise(.6, 600, 60, .7, 'lowpass', .5); tone(80, 30, .6, .6); },
  roar: () => { noise(.9, 300, 90, .55, 'lowpass', 2); tone(95, 55, .9, .4, 'sawtooth'); },
  arrow: () => noise(.12, 4000, 1800, .25, 'bandpass', 3),
  gong: () => { [196, 294, 392].forEach(f => tone(f, f * .98, 2.2, .22, 'sine')); },
  buy: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .16, .2, 'triangle', i * .08)); },
};

export const sfx = name => soundOn && SFX[name] && SFX[name]();
