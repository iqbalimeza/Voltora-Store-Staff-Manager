/* ==========================================================================
   VOLTORA - Customer repair tracking
   A repair is shown only when BOTH the repair ID and the registered contact number match.
   The result never contains the email, address or any other customer's data. Five wrong attempts
   lock the form for 30 seconds. (Browser-side demo: a real deployment must do this check on a server.)
   ========================================================================== */
if (layout('track', { title: 'Track Repair', public: true })) {
  const NOT_FOUND = 'We could not find a repair with those details. Please check the repair ID and the contact number you registered.';
  const fb = (id, msg) => { const el = $('#' + id); el.classList.toggle('is-invalid', !!msg); el.parentElement.querySelector('.invalid-feedback').textContent = msg || ''; return !msg; };
  let lockTimer = null;
  function lockNote() {
    const s = trackGuard(); clearInterval(lockTimer);
    if (!s) { $('#trkForm button[type=submit]').disabled = false; return false; }
    $('#trkForm button[type=submit]').disabled = true;
    let left = s; $('#result').innerHTML = `<div class="trk-big" role="alert"><i class="bi bi-shield-lock-fill"></i><div><b>Too many attempts</b><div class="small mu">Please wait <span id="lk">${left}</span> seconds before trying again.</div></div></div>`;
    lockTimer = setInterval(() => { left--; const e = $('#lk'); if (e) e.textContent = left; if (left <= 0) { clearInterval(lockTimer); $('#trkForm button[type=submit]').disabled = false; $('#result').innerHTML = ''; } }, 1000);
    return true;
  }
  const STEP_I = ['bi-inbox', 'bi-hand-thumbs-up', 'bi-tools', 'bi-check2-circle', 'bi-bag-check', 'bi-flag', 'bi-flag'];
  function stage(t) {
    const pick = t.method === 'pickup', labels = pick ? ['Request received', 'Approved', 'Repair in progress', 'Repair completed', 'Ready for collection', 'Collected'] : ['Request received', 'Approved', 'Repair in progress', 'Repair completed', 'Preparing delivery', 'Out for delivery', 'Delivered'];
    let i = ['New Request', 'Under Review'].includes(t.status) ? 0 : ['Approved', 'Pending Assignment'].includes(t.status) ? 1 : t.status === 'Completed' ? 3 : 2;
    if (t.status === 'Completed') i = pick ? { 'Available for Collection': 4, 'Collected Successfully': 5 }[t.fulfil] ?? 3 : { 'Delivery Requested': 3, 'Preparing for Delivery': 4, 'Out for Delivery': 5, 'Delivered Successfully': 6 }[t.fulfil] ?? 3;
    return { labels, i, last: i === labels.length - 1 };
  }
  function banner(t) {
    if (t.status === 'Cancelled') return ['bi-x-octagon-fill', '', 'REPAIR CANCELLED', 'This repair request was cancelled. Please contact the store for details.', 'Cancelled'];
    if (t.status !== 'Completed') return ['bi-tools', '', t.status === 'New Request' || t.status === 'Under Review' ? 'REQUEST RECEIVED' : 'REPAIR IN PROGRESS', t.status === 'New Request' ? 'Your request is waiting for our team to review it.' : t.status === 'Under Review' ? 'Our manager is reviewing your request.' : t.status === 'Waiting for Parts' ? 'We are waiting for the required parts to arrive.' : t.status === 'Quality Check' ? 'Your repair is in its final inspection.' : 'Our team is working on your device.', t.status];
    const m = { 'Available for Collection': ['Your device is ready for collection.', 'Available for Pickup', 'ok'], 'Collected Successfully': ['Your device has been collected. Thank you!', 'Collected Successfully', 'ok'], 'Delivery Requested': ['Delivery has been requested for your device.', 'Delivery Requested', ''], 'Preparing for Delivery': ['Your device is being prepared for delivery.', 'Preparing for Delivery', ''], 'Out for Delivery': ['Your device is out for delivery.', 'Out for Delivery', ''], 'Delivered Successfully': ['Your device was delivered successfully.', 'Delivered Successfully', 'ok'] }[t.fulfil] || ['Your repair is completed.', t.fulfil, 'ok'];
    return ['bi-check-circle-fill', m[2], 'REPAIR COMPLETED', m[0], m[1]];
  }
  function show(t) {
    const st = stage(t), b = banner(t), canc = t.status === 'Cancelled';
    $('#result').innerHTML = `<section class="card-v" id="trkCard" aria-labelledby="rid">
      <div class="d-flex flex-wrap justify-content-between gap-2 mb-3"><div><p class="mu small mb-0">Repair Request ID</p><h2 class="h3 fw-bold mb-0" id="rid">${esc(t.id)}</h2></div><div class="text-md-end"><b>${esc(t.service)}</b><div class="mu small">${esc(t.device)} &middot; submitted ${fmtDate(t.submitted.slice(0, 10))}</div></div></div>
      <div class="trk-big ${b[1]} mb-4"><i class="bi ${b[0]}"></i><div><div class="fw-bold" style="letter-spacing:.06em">${esc(b[2])}</div><div>${esc(b[3])}</div><div class="small mu">Status: <b>${esc(b[4])}</b></div></div></div>
      ${canc ? '' : `<ol class="trk-steps mb-4" aria-label="Repair progress">${st.labels.map((l, k) => `<li class="${k < st.i || (st.last && k <= st.i) ? 'done' : k === st.i ? 'now' : ''}" ${k === st.i ? 'aria-current="step"' : ''}><i>${k < st.i || (st.last && k <= st.i) ? '<span class="bi bi-check-lg"></span>' : k + 1}</i>${l}</li>`).join('')}</ol>`}
      <div class="row g-3 mb-3">
        <div class="col-md-4"><div class="sv-pill"><small>Repair Status</small><div class="mt-1">${rBadge(t.status)}</div></div></div>
        <div class="col-md-4"><div class="sv-pill"><small>Fulfilment Status</small><div class="mt-1">${t.status === 'Cancelled' ? '-' : rBadge(t.fulfil)}</div><div class="small mu mt-1">${t.method === 'pickup' ? 'Store collection' : 'Delivery'}</div></div></div>
        <div class="col-md-4"><div class="sv-pill"><small>Estimated Completion</small><b class="d-block">${t.due ? fmtDate(t.due) : 'To be confirmed'}</b><div class="small mu">${t.estDuration ? 'Typical time: ' + esc(t.estDuration) : ''}</div></div></div>
      </div>
      ${t.trackingRef ? `<p class="mb-3"><i class="bi bi-truck me-1"></i> Delivery reference: <b>${esc(t.trackingRef)}</b></p>` : ''}
      <h3 class="h6 fw-bold">Progress history</h3>
      <ul class="timeline mb-3">${t.events.slice().reverse().map(e => `<li><span class="tl-dot ${e.status === 'Completed' ? 'ok' : e.kind === 'fulfilment' ? 'info' : ''}"><i class="bi ${e.kind === 'fulfilment' ? 'bi-truck' : 'bi-record2'}"></i></span>${esc(e.status)}<small>${fmtDate(e.ts.slice(0, 10))} &middot; ${esc(e.text)}</small></li>`).join('') || '<li>No updates yet.</li>'}</ul>
      <p class="small mu mb-0">${esc(TIME_DISCLAIMER)} No email or SMS notifications are sent by this prototype, so please check this page for updates.</p></section>`;
    if (Motion.ok()) { gsap.from('#trkCard', { opacity: 0, y: 24, duration: .5, ease: 'power2.out' }); gsap.from('.trk-steps li', { opacity: 0, y: 10, stagger: .07, duration: .4, delay: .25, clearProps: 'opacity,transform' }); }
  }
  $('#trkForm').addEventListener('submit', e => {
    e.preventDefault(); if (lockNote()) return;
    const id = $('#tId').value.trim().toUpperCase(), ph = $('#tPhone').value.trim();
    const ok = [fb('tId', /^VR-\d{4}-\d{4}$/.test(id) ? '' : 'Enter your repair ID, e.g. VR-2026-0001.'), fb('tPhone', phoneDigits(ph).length >= 9 ? '' : 'Enter the contact number you registered.')];
    if (ok.includes(false)) { $('#result').innerHTML = ''; return; }
    const t = trackRepair(id, ph);
    if (!t) { trackGuard(false); if (lockNote()) return; $('#result').innerHTML = `<div class="trk-big" role="alert"><i class="bi bi-exclamation-triangle-fill text-danger"></i><div>${NOT_FOUND}</div></div>`; return; }
    trackGuard(true); show(t);
  });
  const pre = qs().get('id'); if (pre) $('#tId').value = pre;
  if (me2()) $('#tPhone').focus(); function me2() { return !!pre; }
  Sync.watch(() => { const id = $('#tId').value.trim().toUpperCase(), ph = $('#tPhone').value; if ($('#trkCard') && id && ph) { const t = trackRepair(id, ph); if (t) show(t); } });
}
