/* ==========================================================================
   VOLTORA - Visual effects and quick controls (no extra library, original code)
   1. Fx.particles : drifting particles, faint links and slow abstract hexagons on a <canvas>
   2. Fx.aurora    : blurred colour blobs that slowly move behind the whole page
   3. Fx.orbit     : animated orbit rings (SVG) used as a motion graphic in hero panels
   4. Card spotlight / tilt and button ripple (pointer driven)
   5. Quick controls in the top bar: whole-site colour popover + fullscreen button
   Motion is skipped for prefers-reduced-motion and for the "Reduce motion" setting.
   The canvases pause when the tab is hidden or the panel is off screen.
   ========================================================================== */
const Fx = (() => {
  const still = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.body.classList.contains('reduce-motion');
  const rgbOf = c => { const m = /#?([0-9a-f]{6})/i.exec(c || ''); if (!m) return '120,150,255'; const n = parseInt(m[1], 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; };
  const all = [];

  /* ---------- 1. particles ---------- */
  function particles(host, o = {}) {
    if (!host || host.querySelector(':scope > .fx-canvas')) return;
    const cv = document.createElement('canvas'); cv.className = 'fx-canvas' + (o.fixed ? ' fixed' : ''); cv.setAttribute('aria-hidden', 'true');
    host.prepend(cv);
    const ctx = cv.getContext('2d'), P = [], S = [];
    let W = 0, H = 0, dpr = 1, raf = 0, on = true, mx = -999, my = -999, c1 = '120,150,255', c2 = '255,255,255';
    const colours = () => {
      const a = rgbOf(cssv(o.stage ? '--accent-2' : '--accent')), b = o.stage ? '255,255,255' : rgbOf(cssv('--accent-2'));
      c1 = a; c2 = b;
    };
    const rnd = (a, b) => a + Math.random() * (b - a);
    function size() {
      const r = host.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(1, Math.round(o.fixed ? innerWidth : r.width)); H = Math.max(1, Math.round(o.fixed ? innerHeight : r.height));
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(16, Math.min(o.max || 70, Math.round(W * H / (o.density || 15000))));
      while (P.length < n) P.push({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-.25, .25), vy: rnd(-.25, .25), r: rnd(1, 2.6), k: Math.random() < .35 ? 1 : 0, ph: rnd(0, 6.28) });
      P.length = n;
      const hn = o.fixed ? 5 : 4; while (S.length < hn) S.push({ x: rnd(0, W), y: rnd(0, H), s: rnd(26, 70), a: rnd(0, 6.28), va: rnd(-.004, .004), vx: rnd(-.12, .12), vy: rnd(-.1, .1) });
      S.length = hn;
    }
    function hex(s) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + s.a; const x = s.x + Math.cos(a) * s.s, y = s.y + Math.sin(a) * s.s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke(); }
    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      const moving = !still(), link = o.link || 110, base = o.alpha || (o.stage ? .75 : .5);
      ctx.lineWidth = 1;
      for (const s of S) {
        if (moving) { s.x += s.vx; s.y += s.vy; s.a += s.va; if (s.x < -80) s.x = W + 80; if (s.x > W + 80) s.x = -80; if (s.y < -80) s.y = H + 80; if (s.y > H + 80) s.y = -80; }
        ctx.strokeStyle = `rgba(${c1},${(o.stage ? .16 : .1)})`; hex(s);
      }
      for (const p of P) {
        if (moving) {
          p.x += p.vx; p.y += p.vy + Math.sin(t / 1600 + p.ph) * .05;
          const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
          if (d2 < 9000) { const d = Math.sqrt(d2) || 1, f = (1 - d / 95) * 1.4; p.x += dx / d * f; p.y += dy / d * f; }
          if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        }
      }
      for (let i = 0; i < P.length; i++) {
        const a = P[i];
        for (let j = i + 1; j < P.length; j++) {
          const b = P[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
          if (d < link * link) { ctx.strokeStyle = `rgba(${c1},${(1 - Math.sqrt(d) / link) * .32 * base})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        ctx.fillStyle = `rgba(${a.k ? c2 : c1},${base * (.55 + .45 * Math.sin(t / 900 + a.ph))})`; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
      }
    }
    function loop(t) { raf = 0; if (!on || document.hidden) return; frame(t); if (!still()) raf = requestAnimationFrame(loop); }
    const start = () => { if (!raf && on) raf = requestAnimationFrame(loop); };
    const move = e => { const r = o.fixed ? { left: 0, top: 0 } : host.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; };
    (o.fixed ? window : host).addEventListener('pointermove', move, { passive: true });
    (o.fixed ? window : host).addEventListener('pointerleave', () => { mx = my = -999; }, { passive: true });
    if ('IntersectionObserver' in window && !o.fixed) new IntersectionObserver(es => { on = es[0].isIntersecting; if (on) start(); }, { threshold: 0 }).observe(host);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    document.addEventListener('vt-theme', () => { colours(); if (still()) frame(0); });
    if ('ResizeObserver' in window && !o.fixed) new ResizeObserver(() => { size(); if (still()) frame(0); }).observe(host); else addEventListener('resize', () => { size(); if (still()) frame(0); });
    colours(); size(); frame(0); start();
    all.push({ start });
  }

  /* ---------- 2. aurora (page background) ---------- */
  function aurora() {
    if (document.querySelector('.fx-aurora')) return;
    const a = document.createElement('div'); a.className = 'fx-aurora'; a.setAttribute('aria-hidden', 'true');
    a.innerHTML = '<i class="b1"></i><i class="b2"></i><i class="b3"></i>'; document.body.prepend(a);
  }

  /* ---------- 3. orbit motion graphic ---------- */
  function orbit(host) {
    if (!host || host.querySelector(':scope > .fx-orbit')) return;
    const d = document.createElement('div'); d.className = 'fx-orbit'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = `<svg viewBox="0 0 400 400" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.2">
      <circle cx="200" cy="200" r="60" opacity=".5"/><circle class="o1" cx="200" cy="200" r="100" stroke-dasharray="3 9" opacity=".6"/><circle class="o2" cx="200" cy="200" r="145" opacity=".3"/><circle class="o3" cx="200" cy="200" r="188" stroke-dasharray="1 12" opacity=".5"/></g>
      <g class="r1"><circle cx="200" cy="100" r="6" fill="var(--accent-2)"/></g><g class="r2"><circle cx="345" cy="200" r="4.5" fill="#fff"/><circle cx="55" cy="200" r="3" fill="var(--accent-2)"/></g><g class="r3"><circle cx="200" cy="12" r="5" fill="#fff" opacity=".8"/></g>
      <circle class="pulse" cx="200" cy="200" r="14" fill="var(--accent-2)"/></svg>`;
    host.prepend(d);
  }

  /* ---------- 4. pointer effects ---------- */
  function pointerFx() {
    const sel = '.sv-card, .card-v.lift, .kpi-card, .rp-sec, .sv-pill';
    document.addEventListener('pointermove', e => {
      if (still() || e.pointerType === 'touch') return;
      const c = e.target.closest && e.target.closest(sel); if (!c) return;
      const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px');
      if (c.classList.contains('sv-card')) { c.style.setProperty('--ry', ((x / r.width - .5) * 7).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((.5 - y / r.height) * 6).toFixed(2) + 'deg'); }
    }, { passive: true });
    document.addEventListener('pointerleave', e => { const c = e.target.closest && e.target.closest('.sv-card'); if (c) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); } }, true);
    document.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('.btn, .ring-cta, .sv-btn-ghost'); if (!b || still() || b.disabled) return;
      const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 1.6, rp = document.createElement('span');
      rp.className = 'fx-ripple'; rp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      b.append(rp); setTimeout(() => rp.remove(), 650);
    });
  }

  /* ---------- 5. quick controls: colour + fullscreen ---------- */
  const NAMES = () => Object.entries(ACCENTS);
  function applyAccent(k) {
    Theme.set({ accent: k });
    if (document.querySelector('canvas:not(.fx-canvas)')) location.reload();   /* charts read colours once, so redraw them */
  }
  function quickTools() {
    let box = document.getElementById('quickTools');
    if (!box) { box = document.createElement('div'); box.id = 'quickTools'; box.className = 'quick-tools floating'; document.body.append(box); }
    const fsOk = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
    /* the colour tools are a signed-in feature: public pages (home, services, track, login) do not get them */
    let authed = false;
    try { const raw = localStorage.getItem('vt_session') || sessionStorage.getItem('vt_session'); authed = !!(raw && JSON.parse(raw).role); } catch { authed = false; }
    box.dataset.authed = authed ? '1' : '0';
    box.innerHTML = `${authed ? `<div class="cp-strip" id="cpStrip" role="group" aria-label="Website colour"></div>
      <button type="button" class="icon-btn" id="colorBtn" aria-haspopup="true" aria-expanded="false" aria-label="Change website colour" title="Website colour"><i class="bi bi-palette2"></i></button>` : ''}
      ${fsOk ? '<button type="button" class="icon-btn" id="fsBtn" aria-label="Enter full screen" title="Full screen"><i class="bi bi-arrows-fullscreen"></i></button>' : ''}
      ${authed ? '<div class="color-pop" id="colorPop" role="dialog" aria-label="Website colour" hidden><p class="cp-t">Website colour</p><div class="cp-grid" role="group" aria-label="Colour"></div><p class="cp-n" id="cpName"></p></div>' : ''}`;
    if (authed) colourTools(box);
    fullscreenTool(box);
  }
  function colourTools(box) {
    const pop = box.querySelector('#colorPop'), grid = pop.querySelector('.cp-grid'), btn = box.querySelector('#colorBtn'), strip = box.querySelector('#cpStrip');
    /* the strip puts every colour straight in the top bar: one click changes the whole site */
    const drawStrip = () => {
      const cur = Theme.get().accent;
      strip.innerHTML = NAMES().map(([k, a]) => `<button type="button" class="cp-dot" data-k="${k}" style="--c:${a.p}" aria-label="Website colour: ${a.name}" aria-pressed="${k === cur}" title="${a.name}"></button>`).join('');
    };
    strip.onclick = e => { const d = e.target.closest('.cp-dot'); if (!d) return; applyAccent(d.dataset.k); drawStrip(); draw(); if (typeof toast === 'function') toast(`Website colour: ${ACCENTS[d.dataset.k].name}`); };
    const draw = () => {
      const cur = Theme.get().accent; grid.innerHTML = NAMES().map(([k, a]) => `<button type="button" class="cp-sw" data-k="${k}" style="--c:${a.p}" aria-label="${a.name}" aria-pressed="${k === cur}" title="${a.name}"><i class="bi bi-check2"></i></button>`).join('');
      pop.querySelector('#cpName').textContent = ACCENTS[cur].name;
    };
    drawStrip();
    const close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.onclick = e => { e.stopPropagation(); const open = pop.hidden; if (open) draw(); pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    pop.onclick = e => { e.stopPropagation(); const s = e.target.closest('.cp-sw'); if (s) { applyAccent(s.dataset.k); drawStrip(); } draw(); };
    document.addEventListener('click', close); document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
  function fullscreenTool(box) {
    const fs = box.querySelector('#fsBtn');
    if (fs) {
      const el = document.documentElement, isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
      const sync = () => { fs.querySelector('i').className = 'bi ' + (isFs() ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'); const t = isFs() ? 'Exit full screen' : 'Enter full screen'; fs.setAttribute('aria-label', t); fs.title = t; };
      fs.onclick = () => { try { if (isFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch { /* browser refused full screen */ } };
      document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync); sync();
    }
  }

  function init() {
    aurora(); particles(document.body, { fixed: true, max: 46, density: 26000, alpha: .5, link: 130 });
    document.querySelectorAll('.sv-hero, .land-hero, .auth-art, .hero-card, .trk-hero').forEach(h => { particles(h, { stage: true, density: 9000, max: 80 }); });
    document.querySelectorAll('.land-hero, .auth-art, .hero-card').forEach(orbit);
    pointerFx();
  }
  return { init, particles, aurora, orbit, quickTools };
})();
/* layout.js calls Fx.quickTools() after building the bars; pages without them get a floating pair. */
document.addEventListener('DOMContentLoaded', () => {
  const go = () => { Fx.init(); if (!document.getElementById('quickTools') || !document.getElementById('quickTools').children.length) Fx.quickTools(); };
  /* wait one tick so layout.js (loaded after this file) has built the header and footer first */
  setTimeout(go, 0);
});

/* ==========================================================================
   Extra motion (pure JS + CSS, no assets): popup pop-in, click bursts,
   toast slide-in, animated login logo and typewriter text. All of it is
   skipped when the visitor prefers reduced motion.
   ========================================================================== */
const Fx2 = (() => {
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hue = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3b82f6';

  /* 1. click burst: small coloured dots fly out of every button / link press */
  function burst(x, y, n = 9) {
    if (still()) return;
    const col = hue();
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i'), a = (Math.PI * 2 * i) / n + Math.random() * .5, r = 22 + Math.random() * 26;
      d.className = 'fx-dot'; d.style.cssText = `left:${x}px;top:${y}px;background:${i % 3 ? col : '#fff'};--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r}px`;
      document.body.append(d); setTimeout(() => d.remove(), 650);
    }
  }
  function clicks() {
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('.btn, .sv-tab, .icon-btn, .demo-chip, .nav-link, .cp-sw, .ring-cta');
      if (!b || b.disabled) return;
      burst(e.clientX, e.clientY, b.classList.contains('btn-v') ? 12 : 7);
      b.classList.remove('fx-press'); void b.offsetWidth; b.classList.add('fx-press');
    }, true);
  }

  /* 2. popups: Bootstrap modals pop in with a spring and their content staggers in */
  function modals() {
    document.addEventListener('shown.bs.modal', e => {
      const m = e.target; if (still() || !window.gsap) return;
      const kids = m.querySelectorAll('.modal-header, .modal-body > *, .modal-footer, .rq-ok > *');
      gsap.fromTo(m.querySelector('.modal-content'), { scale: .94, y: 18 }, { scale: 1, y: 0, duration: .45, ease: 'back.out(1.6)', clearProps: 'transform' });
      gsap.from([...kids].slice(0, 14), { opacity: 0, y: 12, duration: .35, stagger: .04, ease: 'power2.out', clearProps: 'opacity,transform' });
    });
    /* success message / toasts added later also pop */
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1 || still() || !window.gsap) return;
      if (n.matches && n.matches('.toast, .toast-v, .v-toast')) gsap.from(n, { x: 60, opacity: 0, scale: .92, duration: .45, ease: 'back.out(1.7)', clearProps: 'all' });
      const ok = n.querySelector && n.querySelector('.rq-ok .big'); if (ok) gsap.from(ok, { scale: 0, rotate: -90, duration: .7, ease: 'back.out(2)' });
    }))).observe(document.body, { childList: true, subtree: true });
  }

  /* 3. login page: floating, glowing logo with a sweeping shine, then a typewriter */
  function type(el, text, speed = 26) {
    return new Promise(res => {
      el.textContent = ''; el.classList.add('typing'); let i = 0;
      const t = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) { clearInterval(t); el.classList.remove('typing'); res(); } }, speed);
    });
  }
  async function loginArt() {
    const art = document.querySelector('.auth-art'); if (!art) return;
    const logo = art.querySelector('.auth-logo'); if (logo) { logo.parentElement.classList.add('logo-fx'); }
    const lines = [...art.querySelectorAll('h2, .lead, li')];
    if (still()) return;
    const texts = lines.map(l => l.textContent.trim());
    lines.forEach(l => { l.setAttribute('aria-label', l.textContent.trim()); });
    const icons = lines.map(l => { const i = l.querySelector('i'); if (i) i.remove(); return i; });
    lines.forEach(l => { l.textContent = ''; l.style.visibility = 'hidden'; });
    await new Promise(r => setTimeout(r, 700));
    for (let k = 0; k < lines.length; k++) {
      const l = lines[k]; l.style.visibility = 'visible';
      if (icons[k]) l.prepend(icons[k]);
      const span = document.createElement('span'); span.className = 'tw'; l.append(span);
      if (window.gsap) gsap.from(l, { y: 14, scale: .97, opacity: 0, duration: .4, ease: 'back.out(1.8)' });
      await type(span, texts[k], k === 0 ? 34 : 18); await new Promise(r => setTimeout(r, 160));
    }
    const last = art.querySelector('.tw:last-of-type'); if (last) last.classList.add('tw-done');
  }

  function init() { clicks(); modals(); loginArt(); }
  return { init, burst };
})();
document.addEventListener('DOMContentLoaded', () => setTimeout(Fx2.init, 0));
