/* ==========================================================================
   VOLTORA - Services page (customer-facing, also shown inside the app for signed-in users)
   Catalogue comes from localStorage (seeded from services-data.js, editable by an admin).
   Search + category filter, detail modal, repair request form -> repair_requests / repair_jobs.
   ========================================================================== */
if (layout('services', { title: 'Services', public: true })) {
  const me = session(), admin = isAdmin();
  const S = { cat: 'all', q: '' };
  const active = () => getServices().filter(s => s.active);
  const cats = () => getSvCats();
  const DEV_BY_CAT = { smartphone: 'Smartphone', laptop: 'Laptop', desktop: 'Desktop / Gaming PC', accessories: 'Accessory / Peripheral', camera: 'Camera' };
  const devFor = s => DEV_BY_CAT[s.cat] || (/Tablet/.test(s.name) ? 'Tablet' : /Smartwatch/.test(s.name) ? 'Smartwatch' : '');
  const availCls = a => 'bd-' + slug(a);

  /* ---------- static text ---------- */
  $('#noteTxt').textContent = 'All prices and repair durations below are estimates, not confirmed quotations.';
  $('#d1').textContent = PRICE_DISCLAIMER; $('#d2').textContent = TIME_DISCLAIMER;
  if (me) {
    $('#hero').insertAdjacentHTML('beforebegin', '<nav class="crumbs" aria-label="Breadcrumb"><ol class="breadcrumb"><li class="breadcrumb-item"><a href="dashboard.html">Home</a></li><li class="breadcrumb-item active" aria-current="page">Services</li></ol></nav>');
    if (admin) { const b = $('#manageBtn'); b.classList.remove('d-none'); b.innerHTML = '<i class="bi bi-sliders me-1"></i> Manage catalogue'; b.onclick = () => location.href = 'service-manage.html'; }
  }
  function stats() {
    const a = active(), mn = Math.min(...a.map(s => +s.min)), c = cats().filter(x => a.some(s => s.cat === x.id)).length;
    $('#heroStats').innerHTML = [[c, 'Categories'], [a.length, 'Services'], ['RM ' + (isFinite(mn) ? mn : 0), 'Estimates from']].map(x => `<div><b>${esc(x[0])}</b><span>${x[1]}</span></div>`).join('');
  }

  /* ---------- tabs ---------- */
  function tabs() {
    const a = active();
    $('#tabs').innerHTML = [['all', 'All Services', a.length], ...cats().map(c => [c.id, c.short, a.filter(s => s.cat === c.id).length])]
      .map(t => `<button type="button" class="sv-tab" data-cat="${t[0]}" aria-pressed="${S.cat === t[0]}">${esc(t[1])}<small>${t[2]}</small></button>`).join('');
  }
  function moveInd() {
    const b = $(`.sv-tab[aria-pressed="true"]`, $('#tabs')), ind = $('#svInd'); if (!b || !ind) return;
    ind.style.left = b.offsetLeft + 'px'; ind.style.width = b.offsetWidth + 'px';
  }
  $('#tabs').onclick = e => { const b = e.target.closest('.sv-tab'); if (!b) return; S.cat = b.dataset.cat; tabs(); render(); if (S.cat !== 'all' || S.q) $('#blocks').scrollIntoView({ behavior: Motion.reduced() ? 'auto' : 'smooth', block: 'start' }); };
  let tmr; $('#svSearch').addEventListener('input', e => { clearTimeout(tmr); tmr = setTimeout(() => { S.q = e.target.value.trim().toLowerCase(); render(); }, 140); });

  /* ---------- cards ---------- */
  function card(s, i) {
    const c = svCat(s.cat);
    return `<article class="sv-card" data-id="${s.id}" data-in>
      <div class="sv-card-top"><span class="sv-ico" aria-hidden="true"><i class="bi ${svIcon(s.cat)}"></i></span><span class="bd ${availCls(s.availability)}">${esc(s.availability)}</span><span class="sv-no">${esc(s.id)}</span></div>
      <div class="sv-card-body">
        <p class="sv-cat">${esc(c.short)} &middot; ${esc(s.problemType)}</p>
        <h3>${esc(s.name)}</h3>
        <p class="sv-desc">${esc(s.desc)}</p>
        <dl class="sv-facts"><div><dt>Estimated Price</dt><dd>${esc(priceRange(s))}</dd></div><div><dt>Estimated Time</dt><dd>${esc(s.duration)}</dd></div></dl>
        <div class="sv-actions"><button type="button" class="btn btn-o btn-sm" data-view="${s.id}">View Details</button><button type="button" class="btn btn-v btn-sm" data-req="${s.id}"><i class="bi bi-send"></i> Request Service</button></div>
      </div></article>`;
  }
  function feature(c, n, list) {
    const [first, last] = c.short.replace('&', 'and').split(' ').length > 1 ? [c.short.split(' ')[0], c.short.split(' ').slice(1).join(' ')] : [c.short, 'Repair'];
    const mn = Math.min(...list.map(s => +s.min));
    return `<div class="sv-feature" data-feature>
      <div class="sv-feature-media"><img class="sv-feature-img" src="assets/banners/${c.id}.webp" alt="${esc(c.name)} at the Voltora Store workshop" loading="lazy" decoding="async" width="1280" height="720">
        <span class="sv-feature-shade" aria-hidden="true"></span><i class="bi ${svIcon(c.id)} sv-feature-ico" aria-hidden="true"></i><span class="sv-orb o1" aria-hidden="true"></span><span class="sv-orb o2" aria-hidden="true"></span><span class="sv-feature-tab">${String(n).padStart(2, '0')} &mdash; ${esc(c.name)}</span></div>
      <h2 class="sv-feature-title">${esc(first)} <span class="outline">${esc(last)}</span></h2>
      <div class="sv-feature-side"><span class="vert">${list.length} services &middot; from RM ${mn}</span><a class="ring-cta" href="#grid-${c.id}">View services</a><span class="idx" aria-hidden="true">${String(n).padStart(2, '0')}</span></div></div>`;
  }
  function render(first) {
    const a = active(), blocks = $('#blocks'); let h = '';
    if (S.q) {
      const hit = a.filter(s => (S.cat === 'all' || s.cat === S.cat) && `${s.name} ${s.problemType} ${svCat(s.cat).name} ${svCat(s.cat).short} ${svCat(s.cat).device} ${s.problems.join(' ')}`.toLowerCase().includes(S.q));
      h = `<div class="sv-result-head"><h2>Search results</h2><span class="mu">${hit.length} service${hit.length === 1 ? '' : 's'} for &ldquo;${esc(S.q)}&rdquo;${S.cat !== 'all' ? ' in ' + esc(svCat(S.cat).short) : ''}</span></div><div class="sv-block" style="margin-top:0"><div class="sv-grid">${hit.length ? hit.map(card).join('') : `<div class="sv-empty">${emptyState('bi-search', 'No services found', 'Try another word such as "screen", "battery" or "laptop", or choose All Services.')}</div>`}</div></div>`;
    } else {
      h = cats().filter(c => S.cat === 'all' || c.id === S.cat).map((c, i) => {
        const list = a.filter(s => s.cat === c.id); if (!list.length) return '';
        return `<section class="sv-block" id="cat-${c.id}" aria-label="${esc(c.name)}" ${first ? 'data-reveal' : ''}>${feature(c, cats().findIndex(x => x.id === c.id) + 1, list)}<div class="sv-grid" id="grid-${c.id}">${list.map(card).join('')}</div></section>`;
      }).join('') || emptyState('bi-tools', 'No services available', 'The catalogue is empty.');
    }
    blocks.innerHTML = h; animateCards();
  }
  function animateCards() {
    if (!Motion.ok()) return;
    const cards = $$('.sv-card', $('#blocks'));
    if (!window.ScrollTrigger) return;
    gsap.set(cards, { opacity: 0 });
    ScrollTrigger.batch(cards, { start: 'top 92%', once: true, onEnter: b => gsap.fromTo(b, { opacity: 0, y: 28, scale: .98 }, { opacity: 1, y: 0, scale: 1, duration: .5, stagger: .07, ease: 'power2.out', clearProps: 'opacity,transform' }) });
    $$('.sv-feature').forEach(f => { gsap.from($('.sv-feature-ico', f), { scale: .6, opacity: 0, rotate: -12, duration: 1.2, ease: 'back.out(1.6)', scrollTrigger: { trigger: f, start: 'top 90%', once: true } }); gsap.from($('.sv-feature-title', f), { x: -40, opacity: 0, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: f, start: 'top 85%', once: true } }); });
    ScrollTrigger.refresh();
  }

  /* ---------- detail modal ---------- */
  function ensureModals() {
    if ($('#svModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade sv-modal" id="svModal" tabindex="-1" aria-labelledby="svmTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"><div class="modal-content" id="svmBody"></div></div></div>
    <div class="modal fade rq-modal" id="rqModal" tabindex="-1" aria-labelledby="rqTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"><div class="modal-content" id="rqBody"></div></div></div>`);
  }
  function openDetail(id) {
    ensureModals(); const s = serviceById(id); if (!s) return; const c = svCat(s.cat);
    $('#svmBody').innerHTML = `<div class="sv-modal-head"><span class="sv-ico lg" aria-hidden="true"><i class="bi ${svIcon(s.cat)}"></i></span><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button><div class="t"><p class="sv-cat text-white-50 mb-1">${esc(c.short)} &middot; ${esc(s.id)}</p><h2 id="svmTitle">${esc(s.name)}</h2></div></div>
      <div class="modal-body p-4"><div data-st>
        <div class="d-flex flex-wrap gap-2 mb-3"><span class="bd ${availCls(s.availability)}">${esc(s.availability)}</span><span class="bd bd-inactive"><i class="bi bi-wrench"></i> ${esc(s.problemType)}</span>${s.placeholder ? '<span class="tag-ph" title="Voltora has not supplied real prices yet">Placeholder price</span>' : ''}</div>
        <section class="sv-sec mb-4"><h3>About this service</h3><p class="mb-0">${esc(s.desc)}</p></section>
        <div class="row g-3 mb-4"><div class="col-sm-6"><div class="sv-pill"><small>Estimated Price</small><b>${esc(priceRange(s))}</b></div></div><div class="col-sm-6"><div class="sv-pill"><small>Estimated Time</small><b>${esc(s.duration)}</b></div></div></div>
        <div class="row g-4 mb-4"><section class="col-md-6 sv-sec"><h3>Common problems addressed</h3><ul class="sv-list">${s.problems.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section><section class="col-md-6 sv-sec"><h3>What the service includes</h3><ul class="sv-list">${s.includes.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section></div>
        <section class="sv-sec mb-3"><h3>Important notes</h3><p class="mb-2">${esc(s.notes)}</p><div class="sv-disc"><i class="bi bi-info-circle-fill me-1"></i> ${esc(PRICE_DISCLAIMER)}<br><i class="bi bi-clock-fill me-1"></i> ${esc(TIME_DISCLAIMER)}</div></section></div></div>
      <div class="modal-footer"><button type="button" class="btn btn-o" data-bs-dismiss="modal">Close</button><button type="button" class="btn btn-v" data-req="${s.id}"><i class="bi bi-send"></i> Request Service</button></div>`;
    const m = bootstrap.Modal.getOrCreateInstance($('#svModal')); m.show();
    if (Motion.ok()) gsap.from($$('[data-st] > *', $('#svmBody')), { opacity: 0, y: 14, duration: .4, stagger: .07, delay: .15, ease: 'power2.out', clearProps: 'opacity,transform' });
  }

  /* ---------- request form ---------- */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function openRequest(id) {
    ensureModals(); const sel = serviceById(id) || active()[0], svcs = active();
    const opts = cats().map(c => `<optgroup label="${esc(c.short)}">${svcs.filter(s => s.cat === c.id).map(s => `<option value="${s.id}" ${s.id === sel.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`).join('');
    $('#rqBody').innerHTML = `<form id="rqForm" novalidate>
      <div class="modal-header"><div><h2 class="modal-title h4 fw-bold" id="rqTitle">Request a repair</h2><p class="small mu mb-0">Our team reviews every request before it becomes a repair job.</p></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body"><div class="row g-3">
        <div class="col-12"><h3 class="h6 fw-bold mb-0">Your details</h3></div>
        <div class="col-md-6"><label class="form-label" for="rName">Customer name *</label><input id="rName" required aria-required="true" class="form-control" maxlength="60" autocomplete="name"><div class="invalid-feedback"></div></div>
        <div class="col-md-6"><label class="form-label" for="rPhone">Contact number *</label><input id="rPhone" required aria-required="true" class="form-control" inputmode="tel" placeholder="012-345 6789" maxlength="16" autocomplete="tel"><div class="invalid-feedback"></div></div>
        <div class="col-12"><label class="form-label" for="rEmail">Email address *</label><input id="rEmail" required aria-required="true" type="email" class="form-control" maxlength="80" autocomplete="email"><div class="invalid-feedback"></div></div>
        <div class="col-12 pt-2"><h3 class="h6 fw-bold mb-0">Device and repair</h3></div>
        <div class="col-md-4"><label class="form-label" for="rDev">Device category *</label><select id="rDev" required aria-required="true" class="form-select"><option value="">Select...</option>${DEV_CATS.map(d => `<option>${d}</option>`).join('')}</select><div class="invalid-feedback"></div></div>
        <div class="col-md-4"><label class="form-label" for="rBrand">Device brand *</label><input id="rBrand" required aria-required="true" class="form-control" maxlength="40" placeholder="e.g. Samsung"><div class="invalid-feedback"></div></div>
        <div class="col-md-4"><label class="form-label" for="rModel">Device model *</label><input id="rModel" required aria-required="true" class="form-control" maxlength="50" placeholder="e.g. Galaxy A54"><div class="invalid-feedback"></div></div>
        <div class="col-md-8"><label class="form-label" for="rSvc">Selected repair service *</label><select id="rSvc" required aria-required="true" class="form-select">${opts}</select><div class="invalid-feedback"></div></div>
        <div class="col-md-4"><label class="form-label" for="rDate">Preferred service date</label><input id="rDate" type="date" class="form-control" min="${today()}"><div class="invalid-feedback"></div></div>
        <div class="col-12"><label class="form-label" for="rProb">Problem description *</label><textarea id="rProb" required aria-required="true" class="form-control" rows="3" maxlength="500" placeholder="Describe what is wrong, when it started and anything you have already tried."></textarea><div class="invalid-feedback"></div></div>
        <div class="col-12"><label class="form-label" for="rNotes">Additional notes</label><textarea id="rNotes" class="form-control" rows="2" maxlength="300"></textarea></div>
        <div class="col-12"><label class="form-label" for="rPhotos">Photos of the problem <span class="mu fw-normal">(optional, up to 3)</span></label>
          <div class="rq-drop" id="rqDrop"><i class="bi bi-camera-fill"></i><div><b>Attach photos</b><small class="d-block mu">Click or drop images here &middot; JPG, PNG or WEBP &middot; they are resized automatically</small></div>
            <input id="rPhotos" type="file" accept="image/*" multiple class="rq-file" aria-describedby="rPhotoHelp"></div>
          <div class="rq-thumbs" id="rqThumbs"></div><div class="small mu mt-1" id="rPhotoHelp">Photos help our technician understand the damage before you come to the store.</div></div>
        <div class="col-12 pt-2"><h3 class="h6 fw-bold mb-2">How would you like to receive your device?</h3>
          <div class="row g-2" role="radiogroup" aria-label="Collection or delivery">
            <div class="col-md-6"><label class="rq-opt"><input type="radio" name="rFul" value="pickup" class="form-check-input mt-1" checked><span><b><i class="bi bi-shop me-1"></i> Collect / Pickup at Voltora Store</b><small>Collect your device from the store when it is ready.</small></span></label></div>
            <div class="col-md-6"><label class="rq-opt"><input type="radio" name="rFul" value="delivery" class="form-check-input mt-1"><span><b><i class="bi bi-truck me-1"></i> Delivery to My Address</b><small>We arrange delivery once the repair is completed.</small></span></label></div></div></div>
        <div class="col-12 d-none" id="rDelBox"><div class="rp-sec mb-0"><h3>Delivery details</h3><div class="row g-3">
          <div class="col-12"><label class="form-label" for="dAddr">Delivery address *</label><textarea id="dAddr" required aria-required="true" class="form-control" rows="2" maxlength="200"></textarea><div class="invalid-feedback"></div></div>
          <div class="col-md-6"><label class="form-label" for="dName">Recipient name *</label><input id="dName" required aria-required="true" class="form-control" maxlength="60"><div class="invalid-feedback"></div></div>
          <div class="col-md-6"><label class="form-label" for="dPhone">Contact number *</label><input id="dPhone" required aria-required="true" class="form-control" inputmode="tel" maxlength="16"><div class="invalid-feedback"></div></div>
          <div class="col-12"><label class="form-label" for="dNotes">Delivery notes</label><input id="dNotes" class="form-control" maxlength="150" placeholder="Gate code, landmark, preferred time..."></div></div></div></div>
        <div class="col-12"><div class="sv-disc"><i class="bi bi-info-circle-fill me-1"></i> ${esc(PRICE_DISCLAIMER)}</div></div>
      </div></div>
      <div class="modal-footer"><button type="button" class="btn btn-o" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-v"><i class="bi bi-send"></i> Submit request</button></div></form>`;
    photoField();
    const me = session(); if (me && me.role === 'customer') { $('#rName').value = me.name || ''; $('#rEmail').value = me.email || ''; $('#rPhone').value = me.phone || ''; }
    $$('#rqForm [required]').forEach(el => el.addEventListener('blur', () => { if (!el.value.trim()) bad(el.id, 'This field is required.'); }));
    const dev = devFor(sel); if (dev) $('#rDev').value = dev;
    $('#rSvc').onchange = () => { const d = devFor(serviceById($('#rSvc').value) || {}); if (d) $('#rDev').value = d; };
    $$('input[name=rFul]').forEach(r => r.onchange = () => { const d = $('input[name=rFul]:checked').value === 'delivery'; $('#rDelBox').classList.toggle('d-none', !d); if (d) { if (!$('#dName').value) $('#dName').value = $('#rName').value; if (!$('#dPhone').value) $('#dPhone').value = $('#rPhone').value; if (Motion.ok()) gsap.from('#rDelBox', { opacity: 0, y: -10, duration: .3 }); } });
    $('#rqForm').addEventListener('submit', submitRequest);
    $$('#rqForm .form-control, #rqForm .form-select').forEach(el => el.addEventListener('input', () => el.classList.remove('is-invalid')));
    bootstrap.Modal.getOrCreateInstance($('#rqModal')).show();
    if (me) { $('#rName').value = ''; }
  }
  /* ---------- photo attachments ----------
     Everything happens in the browser: each picture is drawn on a canvas,
     scaled to at most 1000px and re-encoded as JPEG so it fits in localStorage. */
  let PHOTOS = [];
  const MAX_PHOTOS = 3;
  function shrink(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej(new Error('read'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => rej(new Error('decode'));
        img.onload = () => {
          const max = 1000, sc = Math.min(1, max / Math.max(img.width, img.height));
          const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          res({ name: file.name, url: cv.toDataURL('image/jpeg', 0.62) });
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function drawThumbs() {
    const box = $('#rqThumbs'); if (!box) return;
    box.innerHTML = PHOTOS.map((p, i) => `<figure class="rq-thumb"><img src="${p.url}" alt="Attached photo ${i + 1}: ${esc(p.name)}"><button type="button" class="rq-x" data-rm="${i}" aria-label="Remove ${esc(p.name)}"><i class="bi bi-x-lg"></i></button></figure>`).join('');
    const drop = $('#rqDrop'); if (drop) drop.classList.toggle('full', PHOTOS.length >= MAX_PHOTOS);
  }
  async function addFiles(files) {
    const room = MAX_PHOTOS - PHOTOS.length;
    if (room <= 0) return toast(`⚠ You can attach up to ${MAX_PHOTOS} photos.`, 'error');
    const pick = [...files].filter(f => /^image\//.test(f.type)).slice(0, room);
    if (!pick.length) return toast('⚠ Please choose image files only.', 'error');
    for (const f of pick) {
      if (f.size > 12 * 1024 * 1024) { toast(`⚠ ${f.name} is larger than 12 MB.`, 'error'); continue; }
      try { PHOTOS.push(await shrink(f)); } catch { toast(`⚠ Could not read ${f.name}.`, 'error'); }
    }
    drawThumbs();
    if (PHOTOS.length) toast(`✓ ${PHOTOS.length} photo${PHOTOS.length === 1 ? '' : 's'} attached.`);
  }
  function photoField() {
    PHOTOS = []; drawThumbs();
    const inp = $('#rPhotos'), drop = $('#rqDrop');
    inp.addEventListener('change', () => { addFiles(inp.files); inp.value = ''; });
    $('#rqThumbs').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; PHOTOS.splice(+b.dataset.rm, 1); drawThumbs(); });
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
  }

  const bad = (id, msg) => { const el = $('#' + id); el.classList.toggle('is-invalid', !!msg); const fb = el.parentElement.querySelector('.invalid-feedback'); if (fb) fb.textContent = msg || ''; return !msg; };
  function submitRequest(e) {
    e.preventDefault();
    const v = id => $('#' + id).value.trim(), del = $('input[name=rFul]:checked').value === 'delivery', ph = phoneDigits(v('rPhone'));
    const ok = [
      bad('rName', v('rName').length >= 2 ? '' : 'Please enter your name.'),
      bad('rPhone', ph.length >= 9 && ph.length <= 12 ? '' : 'Enter a valid contact number, e.g. 012-345 6789.'),
      bad('rEmail', EMAIL.test(v('rEmail')) ? '' : 'Enter a valid email address.'),
      bad('rDev', v('rDev') ? '' : 'Please choose a device category.'),
      bad('rBrand', v('rBrand') ? '' : 'Please enter the device brand.'),
      bad('rModel', v('rModel') ? '' : 'Please enter the device model.'),
      bad('rSvc', serviceById(v('rSvc')) ? '' : 'Please select a service.'),
      bad('rProb', v('rProb').length >= 10 ? '' : 'Please describe the problem (at least 10 characters).'),
      bad('rDate', !v('rDate') || v('rDate') >= today() ? '' : 'The preferred date cannot be in the past.')
    ];
    if (del) ok.push(bad('dAddr', v('dAddr').length >= 8 ? '' : 'Please enter the full delivery address.'), bad('dName', v('dName') ? '' : 'Please enter the recipient name.'), bad('dPhone', phoneDigits(v('dPhone')).length >= 9 ? '' : 'Enter a valid contact number.'));
    if (ok.includes(false)) { toast('⚠ Please correct the highlighted fields.', 'error'); const f = $('#rqForm .is-invalid'); if (f) f.focus(); return; }
    const req = createRepairRequest({ name: v('rName'), phone: v('rPhone'), email: v('rEmail'), deviceCat: v('rDev'), brand: v('rBrand'), model: v('rModel'), serviceId: v('rSvc'), problem: v('rProb'), prefDate: v('rDate'), notes: v('rNotes'), photos: PHOTOS.map(p => p.url), fulfil: del ? 'delivery' : 'pickup', delivery: del ? { address: v('dAddr'), recipient: v('dName'), phone: v('dPhone'), notes: v('dNotes') } : null });
    $('#rqBody').innerHTML = `<div class="modal-body p-4"><div class="rq-ok" id="rqOk">
      <div class="big"><i class="bi bi-check-lg"></i></div><h2 class="h4 fw-bold">Repair Request Submitted Successfully!</h2>
      <p class="mb-1 mu">Request ID</p><div class="rq-id">${esc(req.id)}</div>
      <p class="mb-1">Our team will review your request<br>and provide further information.</p>
      <p class="small mu mb-3">Keep this ID. To check progress later use it with the contact number you entered (${esc(req.phone)}). This request is waiting for manager review, it is not an approved repair job yet.</p>
      <div class="sv-disc text-start mb-3"><i class="bi bi-info-circle-fill me-1"></i> Prototype note: requests are stored in this browser. No email or SMS is sent.</div>
      <div class="d-flex gap-2 justify-content-center flex-wrap"><a class="btn btn-v" href="track.html?id=${encodeURIComponent(req.id)}"><i class="bi bi-search"></i> Track this repair</a><button class="btn btn-o" data-bs-dismiss="modal">Close</button></div></div></div>`;
    celebrate($('#rqOk .big'));
    if (Motion.ok()) gsap.from('#rqOk > *', { opacity: 0, y: 16, duration: .45, stagger: .08, ease: 'power2.out' });
  }
  /* mo.js burst (only when the library loaded and motion is allowed) */
  function celebrate(el) {
    if (!window.mojs || Motion.reduced() || !el) return;
    try {
      const col = cssv('--accent'), o = { parent: el, left: '50%', top: '50%' };
      new mojs.Burst({ ...o, radius: { 30: 90 }, count: 12, angle: { 0: 45 }, children: { shape: 'line', stroke: [col, cssv('--accent-2'), '#16a34a'], strokeWidth: 3, scaleX: { 1: 0 }, degreeShift: 'stagger(0,-5)', duration: 800, delay: 'stagger(40)' } }).play();
      new mojs.Shape({ ...o, shape: 'circle', radius: { 0: 60 }, fill: 'none', stroke: col, strokeWidth: { 12: 0 }, opacity: { .6: 0 }, duration: 700 }).play();
    } catch { /* decorative only */ }
  }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const v = e.target.closest('[data-view]'), r = e.target.closest('[data-req]');
    if (r) { const m = $('#svModal'); if (m && m.classList.contains('show')) { bootstrap.Modal.getInstance(m).hide(); m.addEventListener('hidden.bs.modal', () => openRequest(r.dataset.req), { once: true }); } else openRequest(r.dataset.req); }
    else if (v) openDetail(v.dataset.view);
  });

  /* ---------- hero motion ---------- */
  function heroMotion() {
    const art = $('#heroArt'); $$('.draw', art).forEach(p => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = Motion.ok() ? l : 0; });
    if (!Motion.ok()) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from($$('[data-h]'), { y: 40, opacity: 0, duration: .8, stagger: .1, clearProps: 'opacity,transform' })
      .from('#heroArt', { scale: .85, opacity: 0, duration: 1.1 }, 0.1)
      .to($$('.draw', art), { strokeDashoffset: 0, duration: 1.6, stagger: .15, ease: 'power2.inOut' }, .3)
      .from($$('.node', art), { scale: 0, transformOrigin: '50% 50%', duration: .5, stagger: .12, ease: 'back.out(3)' }, 1.2);
    gsap.to($$('.spin-a', art), { rotation: 360, transformOrigin: '300px 300px', duration: 60, repeat: -1, ease: 'none' });
    gsap.to($$('.spin-b', art), { rotation: -360, transformOrigin: '300px 300px', duration: 90, repeat: -1, ease: 'none' });
    gsap.to($$('.node', art), { opacity: .35, duration: 1.1, repeat: -1, yoyo: true, stagger: .3, ease: 'sine.inOut' });
    gsap.to('.sv-num', { y: -30, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  stats(); tabs(); render(true); heroMotion();
  const sp = qs(); if (sp.get('s')) openDetail(sp.get('s')); if (sp.get('req')) openRequest(sp.get('req'));
  if (location.hash.startsWith('#cat-')) setTimeout(() => $(location.hash)?.scrollIntoView(), 300);
}
