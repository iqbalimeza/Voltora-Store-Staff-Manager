/* ==========================================================================
   VOLTORA - MotionFX
   Site-wide motion layer: things move when the page loads, when you scroll
   and when you click. Built on GSAP + ScrollTrigger where they are loaded,
   with a plain CSS / requestAnimationFrame fallback everywhere else, so no
   extra library is downloaded and the site still works offline.

   Everything here is switched off when the visitor asks for less motion
   (OS setting "reduce motion", or the Reduce motion switch in Settings).

   1. Page loader + entrance wipe
   2. Scroll progress bar and scroll-to-top button
   3. Scroll reveals, stagger grids and counters that start in view
   4. Parallax banners and headers
   5. Heading text that assembles word by word
   6. Magnetic buttons, card tilt, press feedback
   7. Soft page-to-page transition
   ========================================================================== */
const MotionFX = (() => {
  /* localStorage read directly: some pages (home) have an element with id="store", which would shadow a global called store */
  const rmSetting = () => { try { return JSON.parse(localStorage.getItem('vt_rm')) === true; } catch { return false; } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || rmSetting();
  const G = () => window.gsap;
  const ST = () => window.ScrollTrigger && window.gsap;
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- 1. loader + entrance ---------- */
  function loader() {
    if (sessionStorage.getItem('vt_seen') || reduced()) return done();
    const el = document.createElement('div');
    el.className = 'mx-load'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<div class="mx-load-in"><svg viewBox="0 0 120 120" class="mx-bolt" aria-hidden="true">
        <circle class="mx-ring" cx="60" cy="60" r="46"></circle>
        <path class="mx-spark" d="M66 24 L40 66 h16 l-6 30 26-42H60z"></path></svg>
      <span class="mx-load-t">VOLTORA</span></div>`;
    document.body.append(el);
    sessionStorage.setItem('vt_seen', '1');
    setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); done(); }, 520); }, 900);
  }
  function done() { document.body.classList.add('mx-ready'); }

  /* ---------- 2. scroll progress + back to top ---------- */
  function scrollUi() {
    const bar = document.createElement('div'); bar.className = 'mx-prog'; bar.setAttribute('aria-hidden', 'true');
    const top = document.createElement('button');
    top.className = 'mx-top'; top.type = 'button'; top.title = 'Back to top';
    top.setAttribute('aria-label', 'Back to top'); top.innerHTML = '<i class="bi bi-arrow-up"></i>';
    top.onclick = () => scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    document.body.append(bar, top);
    let tick = false;
    const draw = () => {
      const h = document.documentElement.scrollHeight - innerHeight, y = scrollY;
      bar.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
      top.classList.toggle('on', y > 420);
      document.body.classList.toggle('scrolled', y > 10);
      tick = false;
    };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(draw); } }, { passive: true });
    draw();
  }

  /* ---------- 3. reveals, stagger grids, counters ---------- */
  const REVEAL = '.card-v, .kpi-card, .rp-sec, .sv-block, .land-sec, .trk-sec, [data-mx]';
  function reveals(root = document) {
    /* IntersectionObserver rather than ScrollTrigger: it also covers cards that
       start inside a hidden tab or a collapsed section and appear later. */
    const els = qa(REVEAL, root).filter(e => !e.dataset.mxDone && !e.closest('.modal') && !e.hasAttribute('data-anim') && !e.closest('[data-anim]'));
    els.forEach(e => { e.dataset.mxDone = '1'; });
    if (!els.length) return;
    if (reduced()) return els.forEach(e => e.classList.add('mx-in'));
    const io = new IntersectionObserver(es => es.forEach(x => {
      if (!x.isIntersecting) return;
      x.target.classList.add('mx-in'); io.unobserve(x.target);
    }), { rootMargin: '0px 0px -6% 0px', threshold: .04 });
    els.forEach((e, i) => { e.classList.add('mx-pre'); e.style.transitionDelay = (i % 6) * 55 + 'ms'; io.observe(e); });
    /* safety net: nothing may stay invisible, whatever the browser does with the observer */
    setTimeout(() => els.forEach(e => e.classList.add('mx-in')), 2600);
  }

  /* numbers that count up the first time they scroll into view */
  function counters(root = document) {
    const els = qa('.kpi-value, .sv-stats b', root).filter(e => !e.dataset.mxN && !e.hasAttribute('data-count') && /\d/.test(e.textContent));
    els.forEach(e => {
      e.dataset.mxN = '1';
      const raw = e.textContent.trim(), m = raw.match(/-?[\d,]+(\.\d+)?/); if (!m) return;
      const end = parseFloat(m[0].replace(/,/g, '')), dec = (m[0].split('.')[1] || '').length;
      if (!isFinite(end) || end === 0 || reduced()) return;
      const pre = raw.slice(0, m.index), suf = raw.slice(m.index + m[0].length);
      const run = () => {
        const t0 = performance.now(), dur = 900;
        const step = now => {
          const k = Math.min(1, (now - t0) / dur), v = end * (1 - Math.pow(1 - k, 3));
          e.textContent = pre + v.toLocaleString('en-MY', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      const io = new IntersectionObserver(x => { if (x[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: .4 });
      io.observe(e);
    });
  }

  /* ---------- 4. parallax ---------- */
  function parallax() {
    if (reduced() || !ST()) return;
    qa('.sv-feature-img').forEach(img => gsap.to(img, {
      yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: img.closest('.sv-feature') || img, start: 'top bottom', end: 'bottom top', scrub: .6 }
    }));
    qa('.hero-card, .sv-hero, .land-hero').forEach(h => gsap.to(h.querySelector('.fx-orbit, .fx-aurora') || h, {
      yPercent: 6, ease: 'none', scrollTrigger: { trigger: h, start: 'top top', end: 'bottom top', scrub: .8 }
    }));
  }

  /* ---------- 5. headings assemble word by word ---------- */
  function headings() {
    if (reduced() || !ST()) return;
    qa('.page-head h1, .sv-result-head h2, .land-sec h2').forEach(h => {
      if (h.dataset.mxT || h.children.length) return;
      h.dataset.mxT = '1';
      const words = h.textContent.trim().split(/\s+/);
      h.innerHTML = words.map(w => `<span class="mx-w"><span>${w}</span></span>`).join(' ');
      gsap.from(h.querySelectorAll('.mx-w > span'), {
        yPercent: 110, opacity: 0, duration: .65, stagger: .05, ease: 'power3.out',
        scrollTrigger: { trigger: h, start: 'top 94%', once: true }
      });
    });
  }

  /* ---------- 6. pointer: magnetic buttons + card tilt ---------- */
  function pointer() {
    if (reduced() || matchMedia('(hover: none)').matches) return;
    document.addEventListener('pointermove', e => {
      const b = e.target.closest && e.target.closest('.btn-v, .ring-cta, .mx-top, .icon-btn');
      if (!b) return;
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mgx', ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px');
      b.style.setProperty('--mgy', ((e.clientY - r.top - r.height / 2) * .28).toFixed(1) + 'px');
      b.classList.add('mx-mag');
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const b = e.target.closest && e.target.closest('.mx-mag');
      if (b) { b.style.removeProperty('--mgx'); b.style.removeProperty('--mgy'); b.classList.remove('mx-mag'); }
    }, true);
    document.addEventListener('pointermove', e => {
      const c = e.target.closest && e.target.closest('.kpi-card, .sv-card');
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 6).toFixed(2) + 'deg');
      c.style.setProperty('--rx', ((.5 - (e.clientY - r.top) / r.height) * 5).toFixed(2) + 'deg');
      c.classList.add('mx-tilt');
    }, { passive: true });
    document.addEventListener('pointerleave', e => {
      const c = e.target.closest && e.target.closest('.mx-tilt');
      if (c) { c.classList.remove('mx-tilt'); c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
    }, true);
  }

  /* ---------- 7. page-to-page transition ---------- */
  function transitions() {
    if (reduced()) return;
    const veil = document.createElement('div'); veil.className = 'mx-veil'; veil.setAttribute('aria-hidden', 'true');
    document.body.append(veil);
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href');
      if (!href || a.target === '_blank' || a.hasAttribute('download') || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel') || href.startsWith('data:')) return;
      e.preventDefault();
      veil.classList.add('on');
      setTimeout(() => { location.href = a.href; }, 230);
    });
    addEventListener('pageshow', () => veil.classList.remove('on'));
  }

  /* re-run the cheap passes after a page re-renders its lists */
  /* ScrollTrigger measures the page once, so a list that redraws afterwards can
     leave an element stuck at opacity 0. ScrollTrigger.refresh() is deliberately
     not used for that: it restores its own saved scroll position a frame later
     and yanks the reader back up the page. A sweep is both cheaper and safer. */
  function rescue() {
    qa('[data-reveal], [data-anim], .mx-pre').forEach(e => {
      if (!e.offsetParent) return;
      const r = e.getBoundingClientRect();
      if (r.top > innerHeight * 1.1 || r.bottom < -200) return;          /* still off screen: let it reveal normally */
      if (parseFloat(getComputedStyle(e).opacity) > .05) return;
      e.classList.add('mx-in');
      if (G()) gsap.set(e, { clearProps: 'opacity,transform' });
      e.style.opacity = ''; e.style.transform = '';
    });
  }
  let rtm;
  function refresh(root = document) {
    reveals(root); counters(root);
    clearTimeout(rtm); rtm = setTimeout(rescue, 260);
  }

  function init() {
    if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    loader(); scrollUi(); pointer(); transitions();
    reveals(); counters(); parallax(); headings();
    /* pages redraw their tables and grids after data loads, so watch for new cards */
    let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => refresh(), 240); })
      .observe(document.body, { childList: true, subtree: true });
    let st; addEventListener('scroll', () => { if (st) return; st = setTimeout(() => { st = 0; rescue(); }, 320); }, { passive: true });
    addEventListener('load', rescue);
    addEventListener('resize', () => setTimeout(rescue, 200), { passive: true });
  }
  return { init, refresh, reveals, counters, rescue };
})();
document.addEventListener('DOMContentLoaded', () => setTimeout(MotionFX.init, 0));
