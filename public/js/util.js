export const $ = id => document.getElementById(id);
export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sgn = v => (v < 0 ? -1 : 1);

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('mihao_' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('mihao_' + key, JSON.stringify(value));
    } catch (e) {}
  },
};
