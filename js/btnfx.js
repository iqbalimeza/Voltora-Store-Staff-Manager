/* ==========================================================================
   VOLTORA - Button effects
   1. Particle burst: key buttons disintegrate into particles and re-form
      (Particles by Luis Manuel / Codrops, running on anime.js).
   2. Rolling label: on hover the button text rolls up and a copy rolls in.

   The particle effect never touches the real button. It draws a visual copy
   on top of it, so layouts, forms and click handlers keep working; the real
   button is only hidden for the ~1.2 s the copy is animating.
   Disabled for "reduce motion" (OS setting or the Settings switch).
   ========================================================================== */
const BtnFx = (() => {
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || (() => { try { return JSON.parse(localStorage.getItem('vt_rm')) === true; } catch { return false; } })();
  /* the particle animation is frame based, so on a very slow device it would drag on: skip it there */
  let lastT = 0, delta = 16, limit = 120;
  (function tick(t) { if (lastT) delta = delta * .85 + Math.min(500, t - lastT) * .15; lastT = t; requestAnimationFrame(tick); })(0);
  const can = () => typeof Particles === 'function' && typeof anime === 'function' && !still() && delta < limit;

  /* buttons that burst when pressed (primary actions) */
  const BURST = '#loginBtn, [data-req], #rqForm button[type="submit"], .ring-cta, .btn-v[data-particles], #regForm button[type="submit"]';
  const busy = new WeakSet();

  function burst(btn) {
    if (!can() || busy.has(btn) || btn.disabled) return;
    const r = btn.getBoundingClientRect(); if (r.width < 24 || r.height < 16) return;
    const cs = getComputedStyle(btn);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2563eb';
    const bg = cs.backgroundColor, solid = bg && !/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/.test(bg);
    busy.add(btn);

    /* overlay box that carries a copy of the button */
    const box = document.createElement('div');
    box.className = 'fx-pbox'; box.setAttribute('aria-hidden', 'true');
    box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    const copy = document.createElement('div');
    copy.className = 'fx-pcopy';
    copy.style.cssText = `width:${r.width}px;height:${r.height}px;border-radius:${cs.borderRadius};color:${cs.color};font:${cs.font};letter-spacing:${cs.letterSpacing};` +
      `background:${solid ? bg : 'transparent'};${solid ? '' : `border:${cs.borderTopWidth} solid ${cs.borderTopColor};`}`;
    copy.innerHTML = btn.innerHTML.replace(/id="[^"]*"/g, '');
    box.append(copy); document.body.append(box);
    const prevVis = btn.style.visibility; btn.style.visibility = 'hidden';

    const p = new Particles(copy, {
      color: solid ? bg : accent, type: 'circle', duration: 560, easing: 'easeInOutCubic', direction: 'right',
      canvasPadding: 90, particlesAmountCoefficient: 4,
      size: () => 1 + Math.random() * 2.6
    });
    const finish = () => { box.remove(); btn.style.visibility = prevVis; busy.delete(btn); };
    p.disintegrate({
      complete: () => {                       /* particles are gone: bring the button back together */
        p.integrate({ duration: 520, direction: 'left', complete: () => setTimeout(finish, 40) });
      }
    });
    setTimeout(() => { if (busy.has(btn)) finish(); }, 3500);   /* safety net: the real button always comes back */
  }

  /* ---------- rolling label ---------- */
  const SKIP = '.btn-close, .dropdown-toggle, .ring-cta, .sv-tab, .nav-link, .demo-chip, .accent-opt, .icon-btn, [data-bs-toggle="dropdown"]';
  function wrapLabel(btn) {
    if (btn.dataset.lbl || btn.matches(SKIP)) return;
    btn.dataset.lbl = '1';
    const nodes = [...btn.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    if (nodes.length !== 1) return;                         /* only plain "icon + text" buttons */
    const n = nodes[0], text = n.textContent.trim();
    const span = document.createElement('span');
    span.className = 'lbl'; span.dataset.t = text; span.innerHTML = '<span class="lt"></span>'; span.firstChild.textContent = text;
    btn.insertBefore(span, n); n.remove();
    btn.classList.add('has-lbl');
  }

  function init() {
    /* label roll is wrapped lazily the first time a button is hovered or focused, so pages that redraw their buttons never fight with it */
    const hook = e => { const b = e.target.closest && e.target.closest('.btn'); if (b) wrapLabel(b); };
    document.addEventListener('pointerover', hook, { passive: true });
    document.addEventListener('focusin', hook);
    /* on "click", not on pointerdown: hiding the button while the mouse is still down would make the browser drop the click.
       Enter / Space on a focused button also produce a click, so keyboard users get the same effect. */
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest(BURST);
      if (b) burst(b);
    }, true);
  }
  return { init, burst, setLimit: v => { limit = v; } };
})();
document.addEventListener('DOMContentLoaded', () => setTimeout(BtnFx.init, 0));
