/* ==========================================================================
   VOLTORA - Motion (GSAP)
   Subtle, fast motion that supports the UI: staggered page entrance, animated
   counters, progress bars and rings, scroll reveals, sidebar link entrance.
   Everything degrades gracefully: if GSAP is unavailable, or the user prefers
   reduced motion (OS setting or Settings > Reduce motion), final values are
   shown immediately and nothing animates.
   ========================================================================== */
const Motion = (() => {
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || store.get('rm', false);
  const ok = () => !!window.gsap && !reduced();
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /** Order of the page entrance: header -> filters -> KPIs -> charts -> tables -> panels */
  const GROUPS = ['header', 'filter', 'kpi', 'chart', 'table', 'panel'];

  function page() {
    counters(document); progress(document);
    if (!ok()) return;
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    let at = 0;
    GROUPS.forEach(g => {
      const els = $$(`[data-anim="${g}"]`).filter(el => !el.hasAttribute('data-reveal') || el.getBoundingClientRect().top < innerHeight * .92);
      if (!els.length) return;
      tl.from(els, { opacity: 0, y: g === 'header' ? -8 : 16, duration: .4, stagger: g === 'kpi' ? .08 : .06, clearProps: 'opacity,transform' }, at);
      at += g === 'header' ? .08 : .12;
    });
    reveal();
    if (window.innerWidth > 991) sidebarIn(true);
  }

  /** Animate numbers from 0 to their real value: <span data-count="24" data-prefix="RM " data-decimals="0"> */
  function counters(root = document, dur = 1) {
    $$('[data-count]', root).forEach(el => {
      const end = parseFloat(el.dataset.count) || 0, dec = +el.dataset.decimals || 0, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      const fmt = v => pre + v.toLocaleString('en-MY', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (!ok()) { el.textContent = fmt(end); return; }
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: dur, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); }, onComplete: () => { el.textContent = fmt(end); } });
    });
  }

  /** Progress bars (0 -> real value) and SVG rings */
  function progress(root = document) {
    if (!ok()) return;
    $$('[data-progress]', root).forEach(el => gsap.fromTo(el, { width: '0%' }, { width: (+el.dataset.progress || 0) + '%', duration: .9, ease: 'power2.out', delay: .15 }));
    $$('[data-ring]', root).forEach(el => {
      const c = +el.getAttribute('stroke-dasharray'), pct = +el.dataset.ring || 0;
      gsap.fromTo(el, { strokeDashoffset: c }, { strokeDashoffset: c * (1 - pct / 100), duration: 1, ease: 'power2.out', delay: .15 });
    });
  }

  /** Scroll-triggered reveal for below-the-fold sections: <section data-reveal> */
  function reveal() {
    if (!ok() || !window.ScrollTrigger) return;
    $$('[data-reveal]').forEach(el => {
      if (el.getBoundingClientRect().top < innerHeight * .92) return;
      gsap.from(el, { opacity: 0, y: 24, duration: .5, ease: 'power2.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  /** Quick fade for the first table rows after (re)rendering */
  function rows(tbody) {
    if (!ok() || !tbody) return;
    gsap.from([...tbody.children].slice(0, 12), { opacity: 0, y: 6, duration: .25, stagger: .02, clearProps: 'opacity,transform' });
  }

  function sidebarIn(initial) {
    if (!ok()) return;
    gsap.from('.sb-link', { x: -14, opacity: 0, duration: .35, stagger: .035, ease: 'power2.out', clearProps: 'opacity,transform', delay: initial ? .05 : 0 });
  }

  /** Subtle pulse used to confirm a saved value */
  function pulse(el) { if (ok() && el) gsap.fromTo(el, { scale: .96 }, { scale: 1, duration: .35, ease: 'back.out(2)', clearProps: 'transform' }); }

  return { reduced, ok, page, counters, progress, rows, reveal, sidebarIn, pulse };
})();
