/* ==========================================================================
   VOLTORA - Theme engine (loaded in <head> so the theme is applied before paint)
   Display mode : 'dark' | 'light' | 'system'  (system follows the device, default on first visit)
   Accent       : one of ACCENTS below (default 'blue' = Voltora Electric Blue)
   Both are saved in localStorage (vt_theme, vt_accent) and applied with CSS custom properties,
   so every page, including the public Services pages and the login page, uses the same theme.
   ========================================================================== */
const ACCENTS = {
  blue:     { name: 'Voltora Electric Blue', p: '#2563eb', h: '#1d4ed8', od: '#7aa7ff', a2: '#38bdf8' },
  purple:   { name: 'Cyber Purple',          p: '#7c3aed', h: '#6d28d9', od: '#b79bff', a2: '#e879f9' },
  green:    { name: 'Emerald Green',         p: '#059669', h: '#047857', od: '#4ade80', a2: '#a3e635' },
  orange:   { name: 'Sunset Orange',         p: '#ea580c', h: '#c2410c', od: '#fb923c', a2: '#fbbf24' },
  red:      { name: 'Crimson Red',           p: '#dc2626', h: '#b91c1c', od: '#f87171', a2: '#fb7185' },
  teal:     { name: 'Teal',                  p: '#0d9488', h: '#0f766e', od: '#2dd4bf', a2: '#22d3ee' },
  pink:     { name: 'Rose Pink',             p: '#db2777', h: '#be185d', od: '#f472b6', a2: '#fb7185' },
  graphite: { name: 'Neutral Graphite',      p: '#475569', h: '#334155', od: '#cbd5e1', a2: '#94a3b8', pd: '#64748b' }
};
const Theme = (() => {
  const read = (k, d) => { try { const v = localStorage.getItem('vt_' + k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem('vt_' + k, JSON.stringify(v)); } catch { /* storage blocked: theme just won't persist */ } };
  const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
  const get = () => ({ mode: read('theme', 'system'), accent: ACCENTS[read('accent', 'blue')] ? read('accent', 'blue') : 'blue' });
  const resolved = () => { const m = get().mode; return m === 'system' ? (mq && mq.matches ? 'dark' : 'light') : m; };
  function apply() {
    const { accent } = get(), r = document.documentElement, dark = resolved() === 'dark', A = ACCENTS[accent], p = dark && A.pd ? A.pd : A.p;
    r.setAttribute('data-theme', dark ? 'dark' : 'light'); r.setAttribute('data-bs-theme', dark ? 'dark' : 'light'); r.setAttribute('data-accent', accent);
    const s = r.style, rgb = hexRgb(p);
    s.setProperty('--accent', p); s.setProperty('--accent-600', A.h); s.setProperty('--accent-on-dark', A.od); s.setProperty('--accent-2', A.a2);
    s.setProperty('--accent-rgb', rgb); s.setProperty('--accent-soft', dark ? `rgba(${rgb},.18)` : `rgba(${rgb},.10)`);
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#0a1020' : '#0d1526';
  }
  function set(o) { if (o.mode) write('theme', o.mode); if (o.accent) write('accent', o.accent); apply(); document.dispatchEvent(new CustomEvent('vt-theme')); }
  function reset() { try { localStorage.removeItem('vt_theme'); localStorage.removeItem('vt_accent'); } catch { } apply(); document.dispatchEvent(new CustomEvent('vt-theme')); }
  if (mq) (mq.addEventListener ? mq.addEventListener('change', () => { if (get().mode === 'system') { apply(); document.dispatchEvent(new CustomEvent('vt-theme')); } }) : 0);
  apply();
  return { get, set, reset, apply, resolved };
})();
/** Read a CSS custom property (used by Chart.js, which cannot read var() itself). */
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
