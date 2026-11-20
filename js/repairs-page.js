/* ==========================================================================
   VOLTORA - Repair Management (admin)
   Table with search / filters / sorting, and a detail panel to review, approve or reject a request,
   assign a technician, move the repair through its statuses, manage collection / delivery, record
   payments and see the full history. Every write goes through repairs.js (job + task stay in sync).
   ========================================================================== */
if (layout('repairs', { title: 'Repair Management', roles: ['admin', 'customer'] })) {
  const customer = isCustomer(), src = () => customer ? visibleRepairs() : repairs();   // customers: own repairs only, read only
  const F = { chip: 'all', q: '', status: '', ful: '', staff: '', pri: '', sort: 'date', dir: -1 }, PER = 10; let page = 1, openId = null, panel = '';
  const CHIPS = [['all', 'All repairs', r => true], ['new', 'New requests', r => ['New Request', 'Under Review'].includes(r.status)], ['assign', 'Awaiting assignment', r => ['Approved', 'Pending Assignment'].includes(r.status)],
    ['work', 'In progress', r => ['Assigned', ...R_WORKING].includes(r.status)], ['done', 'Completed', r => r.status === 'Completed'], ['ready', 'Ready for collection', r => r.ful.status === 'Available for Collection'],
    ['deliv', 'Pending deliveries', r => ['Delivery Requested', 'Preparing for Delivery', 'Out for Delivery'].includes(r.ful.status)], ['late', 'Overdue', isRepairOverdue], ['canc', 'Cancelled', r => r.status === 'Cancelled']];
  const techs = () => getStaff().filter(s => s.status === 'Active').sort((a, b) => (b.pos === 'Repair Technician') - (a.pos === 'Repair Technician') || a.name.localeCompare(b.name));
  const techOpts = sel => '<option value="">Select technician...</option>' + techs().map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)} · ${esc(s.pos)}</option>`).join('');
  const bad = (id, msg) => { const el = $('#' + id); el.classList.toggle('is-invalid', !!msg); const fb = el.parentElement.querySelector('.invalid-feedback'); if (fb) fb.textContent = msg || ''; return !msg; };

  /* ----- filters ----- */
  if (customer) {
    document.querySelector('h1').textContent = 'My Repairs'; document.querySelector('.page-head p').textContent = 'Read only: follow the repairs you requested, from review to collection or delivery.';
    $('#exportBtn').classList.add('d-none'); $('#fStaff').closest('.fg').classList.add('d-none');
  }
  $('#fStatus').innerHTML = '<option value="">All</option>' + R_STATUS.map(s => `<option>${s}</option>`).join('');
  $('#fFul').innerHTML = '<option value="">All</option>' + [...new Set([...F_FLOW.pickup, ...F_FLOW.delivery])].map(s => `<option>${s}</option>`).join('');
  $('#fStaff').innerHTML = '<option value="">All</option><option value="none">Unassigned</option>' + getStaff().map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  const sp = qs(); if (sp.get('status')) { F.status = sp.get('status'); $('#fStatus').value = F.status; }
  const bindF = () => { F.q = $('#q').value.trim().toLowerCase(); F.status = $('#fStatus').value; F.ful = $('#fFul').value; F.staff = $('#fStaff').value; F.pri = $('#fPri').value; page = 1; render(); };
  ['q', 'fStatus', 'fFul', 'fStaff', 'fPri'].forEach(id => $('#' + id).addEventListener(id === 'q' ? 'input' : 'change', bindF));
  $('#fReset').onclick = () => { ['q', 'fStatus', 'fFul', 'fStaff', 'fPri'].forEach(id => $('#' + id).value = ''); F.chip = 'all'; bindF(); };
  $('#chips').onclick = e => { const b = e.target.closest('[data-chip]'); if (!b) return; F.chip = b.dataset.chip; page = 1; render(); };
  document.querySelector('thead').onclick = e => { const th = e.target.closest('[data-sort]'); if (!th) return; F.dir = F.sort === th.dataset.sort ? -F.dir : 1; F.sort = th.dataset.sort; render(); };

  function list() {
    const fn = CHIPS.find(c => c[0] === F.chip)[2], K = { id: r => r.id, cust: r => r.req.name.toLowerCase(), date: r => r.createdAt, due: r => r.due || '9999' };
    return src().filter(fn).filter(r => (!F.status || r.status === F.status) && (!F.ful || r.ful.status === F.ful) && (!F.pri || r.priority === F.pri) && (!F.staff || (F.staff === 'none' ? !r.staff : r.staff === F.staff)) &&
      (!F.q || `${r.id} ${r.req.name} ${deviceLabel(r)} ${r.req.serviceName} ${r.req.phone}`.toLowerCase().includes(F.q))).sort((a, b) => { const k = K[F.sort]; return (k(a) > k(b) ? 1 : k(a) < k(b) ? -1 : 0) * F.dir; });
  }
  function render(first) {
    const all = src();
    $('#chips').innerHTML = CHIPS.map(c => `<button type="button" class="rp-chip" data-chip="${c[0]}" aria-pressed="${F.chip === c[0]}"><b>${all.filter(c[2]).length}</b>${c[1]}</button>`).join('');
    const pg = paginate(list(), page, PER); page = pg.page;
    $('#tbody').innerHTML = pg.items.length ? pg.items.map(r => `<tr class="rp-row ${isRepairOverdue(r) ? 'late' : ''}" data-open="${r.id}" tabindex="0" aria-label="Open ${r.id}">
      <td class="text-nowrap"><b>${esc(r.id)}</b><div class="small show-sm-only mu">${esc(r.req.serviceName)}</div></td>
      <td><div class="fw-semibold">${esc(r.req.name)}</div><div class="small mu">${esc(r.req.phone)}</div></td>
      <td class="hide-md">${esc(deviceLabel(r))}<div class="small mu">${esc(r.req.deviceCat)}</div></td><td class="hide-lg" style="min-width:150px">${esc(r.req.serviceName)}</td>
      <td class="hide-xl">${r.staff ? (customer ? '<span class="mu">Voltora technician</span>' : `<div class="cell-user">${avatar(staffName(r.staff), r.staff, 'av-sm')}<span>${esc(staffName(r.staff))}</span></div>`) : '<span class="mu">Not assigned yet</span>'}</td>
      <td class="hide-lg">${priTag(r.priority)}</td><td class="hide-md text-nowrap">${fmtShort(r.createdAt.slice(0, 10))}</td>
      <td class="hide-xl text-nowrap">${r.due ? (isRepairOverdue(r) ? `<span class="text-danger fw-semibold">${fmtShort(r.due)} (late)</span>` : fmtShort(r.due)) : '<span class="mu">TBC</span>'}</td>
      <td>${rBadge(r.status)}</td><td class="hide-sm">${r.status === 'Cancelled' ? '<span class="mu">-</span>' : rBadge(r.ful.status)}</td>
      <td class="text-end text-nowrap"><button class="btn btn-o btn-icon btn-sm" data-open="${r.id}" aria-label="Open ${r.id}" title="View and manage"><i class="bi bi-eye"></i></button></td></tr>`).join('')
      : `<tr><td colspan="11">${emptyState('bi-tools', 'No repairs found', 'Try a different filter, or wait for new customer requests from the Services page.')}</td></tr>`;
    $('#pager').innerHTML = pagerHTML(pg, 'repairs');
    $$('thead [data-sort]').forEach(th => th.setAttribute('aria-sort', th.dataset.sort === F.sort ? (F.dir > 0 ? 'ascending' : 'descending') : 'none'));
    if (first) Motion.page(); else { Motion.rows($('#tbody')); }
  }
  $('#pager').onclick = e => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { page = +b.dataset.page; render(); } };
  $('#tbody').onclick = e => { const o = e.target.closest('[data-open]'); if (o) openDetail(o.dataset.open); };
  $('#tbody').onkeydown = e => { if (e.key === 'Enter') { const o = e.target.closest('[data-open]'); if (o) openDetail(o.dataset.open); } };
  $('#exportBtn').onclick = () => downloadCSV('voltora-repairs.csv', [['Repair ID', 'Customer', 'Phone', 'Device', 'Service', 'Technician', 'Priority', 'Requested', 'Est. completion', 'Repair status', 'Fulfilment method', 'Fulfilment status', 'Approved price (RM)', 'Received (RM)'],
    ...list().map(r => [r.id, r.req.name, r.req.phone, deviceLabel(r), r.req.serviceName, staffName(r.staff), r.priority, r.createdAt.slice(0, 10), r.due, r.status, r.ful.method, r.ful.status, r.approvedPrice ?? '', sumPaid(r)])]);

  /* ----- detail panel ----- */
  const off = bootstrap.Offcanvas.getOrCreateInstance($('#rpOff'));
  function openDetail(id, p) { openId = id; panel = p || ''; detail(); off.show(); }
  $('#rpOff').addEventListener('hidden.bs.offcanvas', () => { openId = null; history.replaceState(null, '', 'repairs.html'); });
  const kv = rows => `<dl class="kv mb-0">${rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>`;
  const flow = r => { const L = F_FLOW[r.ful.method], i = L.indexOf(r.ful.status); return `<div class="rp-flow">${L.map((s, k) => `${k ? '<i class="bi bi-chevron-right"></i>' : ''}<span class="${k < i ? 'past' : k === i ? 'on' : ''}">${s}</span>`).join('')}</div>`; };
  function detail() {
    const r = src().find(x => x.id === openId); if (!r) { $('#rpBody').innerHTML = emptyState('bi-search', 'Repair not found', 'It may have been removed.'); return; }
    if (customer) return customerDetail(r);
    const st = r.status, t = r.taskId ? taskById(r.taskId) : null, svc = r.svc, dueDef = day(3);
    $('#rpTitle').textContent = `${r.id} · ${r.req.serviceName}`; $('#rpSub').textContent = `${r.req.name} · ${deviceLabel(r)}`;
    const preAssign = ['Approved', 'Pending Assignment'].includes(st), working = ['Assigned', ...R_WORKING].includes(st), review = ['New Request', 'Under Review'].includes(st);
    const priSel = v => PRI.map(p => `<option ${p === v ? 'selected' : ''}>${p}</option>`).join('');
    let h = `<div class="rp-sec"><div class="d-flex flex-wrap gap-2 align-items-center mb-2">${rBadge(st)}${priTag(r.priority)}${isRepairOverdue(r) ? '<span class="bd bd-overdue">Overdue</span>' : ''}</div><p class="small mu mb-2">${esc(R_MEANING[st])}</p>
      <div class="rp-flow">${R_STATUS.filter(s => s !== 'Cancelled').map((s, k) => `${k ? '<i class="bi bi-chevron-right"></i>' : ''}<span class="${s === st ? 'on' : R_STATUS.indexOf(s) < R_STATUS.indexOf(st) && st !== 'Cancelled' ? 'past' : ''}">${s}</span>`).join('')}</div></div>`;

    /* actions by status */
    h += '<div class="rp-sec"><h3>Manager actions</h3>';
    if (review) {
      h += `<div class="d-flex flex-wrap gap-2">${st === 'New Request' ? '<button class="btn btn-o" data-act="review"><i class="bi bi-eye"></i> Start review</button>' : ''}<button class="btn btn-v" data-act="showApprove"><i class="bi bi-check2-circle"></i> Approve repair</button><button class="btn btn-o danger" data-act="showReject"><i class="bi bi-x-circle"></i> Reject / cancel</button></div>`;
      if (panel === 'approve') h += `<div class="mt-3 border-top pt-3"><div class="row g-3">
        <div class="col-md-6"><label class="form-label" for="aPrice">Approved price (RM)</label><input id="aPrice" type="number" min="0" step="0.01" class="form-control" placeholder="Estimate: ${priceRange(svc || { min: r.quoteMin, max: r.quoteMax })}"><div class="invalid-feedback"></div><div class="form-text">Leave empty until a final quotation is agreed.</div></div>
        <div class="col-md-6"><label class="form-label" for="aDur">Estimated duration</label><input id="aDur" class="form-control" value="${esc(r.estDuration)}" maxlength="40"></div>
        <div class="col-md-6"><label class="form-label" for="aStaff">Assign technician</label><select id="aStaff" class="form-select">${techOpts('')}</select><div class="form-text">Optional now. A task is created as soon as a technician is assigned.</div></div>
        <div class="col-md-3 col-6"><label class="form-label" for="aPri">Priority</label><select id="aPri" class="form-select">${priSel(r.priority)}</select></div>
        <div class="col-md-3 col-6"><label class="form-label" for="aDue">Due date *</label><input id="aDue" type="date" class="form-control" min="${today()}" value="${dueDef}"><div class="invalid-feedback"></div></div>
        <div class="col-12"><label class="form-label" for="aNote">Manager note</label><input id="aNote" class="form-control" maxlength="150"></div>
        <div class="col-12"><button class="btn btn-v" data-act="approve"><i class="bi bi-check2"></i> Confirm approval</button> <button class="btn btn-o" data-act="hidePanel">Cancel</button></div></div></div>`;
      if (panel === 'reject') h += `<div class="mt-3 border-top pt-3"><label class="form-label" for="xReason">Reason (kept in the history)</label><textarea id="xReason" class="form-control mb-2" rows="2" maxlength="200"></textarea><button class="btn btn-v btn-danger" data-act="cancel"><i class="bi bi-x-circle"></i> Confirm cancellation</button> <button class="btn btn-o" data-act="hidePanel">Back</button></div>`;
    } else if (preAssign) {
      h += `<div class="row g-3"><div class="col-md-6"><label class="form-label" for="sStaff">Technician *</label><select id="sStaff" class="form-select">${techOpts(r.staff)}</select><div class="invalid-feedback"></div></div>
        <div class="col-md-3 col-6"><label class="form-label" for="sPri">Priority</label><select id="sPri" class="form-select">${priSel(r.priority)}</select></div><div class="col-md-3 col-6"><label class="form-label" for="sDue">Due date *</label><input id="sDue" type="date" class="form-control" min="${today()}" value="${r.due || dueDef}"><div class="invalid-feedback"></div></div>
        <div class="col-12 d-flex gap-2"><button class="btn btn-v" data-act="assign"><i class="bi bi-person-check"></i> Assign and create task</button><button class="btn btn-o danger" data-act="showReject">Cancel repair</button></div></div>${panel === 'reject' ? '<div class="mt-3 border-top pt-3"><label class="form-label" for="xReason">Reason</label><textarea id="xReason" class="form-control mb-2" rows="2" maxlength="200"></textarea><button class="btn btn-v btn-danger" data-act="cancel">Confirm cancellation</button></div>' : ''}`;
    } else if (working) {
      h += `<div class="row g-3"><div class="col-md-6"><label class="form-label" for="uStatus">Repair status</label><select id="uStatus" class="form-select">${['Assigned', ...R_STAFF_STATUS].map(s => `<option ${s === st ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="col-md-6 d-flex align-items-end"><button class="btn btn-v w-100" data-act="status"><i class="bi bi-arrow-repeat"></i> Update status</button></div>
        <div class="col-md-6"><label class="form-label" for="sStaff">Technician</label><select id="sStaff" class="form-select">${techOpts(r.staff)}</select><div class="invalid-feedback"></div></div>
        <div class="col-md-3 col-6"><label class="form-label" for="sPri">Priority</label><select id="sPri" class="form-select">${priSel(r.priority)}</select></div><div class="col-md-3 col-6"><label class="form-label" for="sDue">Due date</label><input id="sDue" type="date" class="form-control" value="${r.due}"><div class="invalid-feedback"></div></div>
        <div class="col-md-6"><label class="form-label" for="sDur">Estimated duration</label><input id="sDur" class="form-control" value="${esc(r.estDuration)}" maxlength="40"></div>
        <div class="col-md-6 d-flex align-items-end gap-2"><button class="btn btn-o" data-act="reassign"><i class="bi bi-person-check"></i> Save assignment</button><button class="btn btn-o danger" data-act="showReject">Cancel repair</button></div>
        ${panel === 'reject' ? '<div class="col-12 border-top pt-3"><label class="form-label" for="xReason">Reason</label><textarea id="xReason" class="form-control mb-2" rows="2" maxlength="200"></textarea><button class="btn btn-v btn-danger" data-act="cancel">Confirm cancellation</button></div>' : ''}</div>`;
    } else if (st === 'Completed') h += `<p class="mb-2 small">The repair is completed. Manage collection or delivery below. If the work must be redone, re-open it.</p><button class="btn btn-o" data-act="reopen"><i class="bi bi-arrow-counterclockwise"></i> Re-open repair</button>`;
    else h += '<p class="mu mb-0">This repair was cancelled. Its history is kept for reference.</p>';
    h += '</div>';

    h += `<div class="rp-sec"><h3>Customer</h3>${kv([['Name', esc(r.req.name)], ['Contact', esc(r.req.phone)], ['Email', esc(r.req.email)], ['Requested on', fmtDate(r.createdAt.slice(0, 10))], ['Preferred date', r.req.prefDate ? fmtDate(r.req.prefDate) : '-'], ['Notes', esc(r.req.notes) || '-']])}</div>
      <div class="rp-sec"><h3>Device and problem</h3>${kv([['Device', `${esc(r.req.deviceCat)} · ${esc(deviceLabel(r))}`], ['Service', `${esc(r.req.serviceName)}${svc ? ` <span class="mu">(${esc(svc.id)})</span>` : ''}`], ['Problem', esc(r.req.problem)], ['Duration estimate', esc(r.estDuration || '-')]])}</div>` + gallery(r);
    if (r.req.fulfil === 'delivery' && r.req.delivery) h += `<div class="rp-sec"><h3>Delivery details given by the customer</h3>${kv([['Address', esc(r.req.delivery.address)], ['Recipient', esc(r.req.delivery.recipient)], ['Contact', esc(r.req.delivery.phone)], ['Notes', esc(r.req.delivery.notes) || '-']])}</div>`;

    /* linked task */
    h += `<div class="rp-sec"><h3>Linked task and technician</h3>${t ? `${kv([['Task', `<a href="task-detail.html?id=${t.id}">${esc(t.id)} · ${esc(t.title)}</a>`], ['Technician', esc(staffName(t.staff))], ['Start / due', `${fmtDate(t.start)} → ${fmtDate(t.due)}`], ['Task status', badge(statusOf(t))], ['Progress', progressCell(t)], ['Technician remarks', esc(r.techRemarks) || '<span class="mu">None yet</span>']])}` : '<p class="mu mb-0">No task yet. A task is created when a technician is assigned.</p>'}</div>`;

    /* fulfilment */
    const fl = F_FLOW[r.ful.method], canF = st === 'Completed';
    h += `<div class="rp-sec"><h3>Collection &amp; delivery (separate from the repair status)</h3>
      <div class="row g-2 mb-2" role="radiogroup" aria-label="Fulfilment method">${[['pickup', 'bi-shop', 'Store collection'], ['delivery', 'bi-truck', 'Delivery to customer']].map(o => `<div class="col-6"><label class="rq-opt py-2"><input type="radio" name="fMethod" value="${o[0]}" class="form-check-input mt-1" ${r.ful.method === o[0] ? 'checked' : ''} ${F_DONE.includes(r.ful.status) || st === 'Cancelled' ? 'disabled' : ''}><b><i class="bi ${o[1]} me-1"></i>${o[2]}</b></label></div>`).join('')}</div>
      ${flow(r)}
      <div class="row g-3 mt-1"><div class="col-md-6"><label class="form-label" for="fStat">Fulfilment status</label><select id="fStat" class="form-select" ${canF ? '' : 'disabled'}>${fl.map(s => `<option ${s === r.ful.status ? 'selected' : ''} ${!canF && s !== 'Awaiting Repair' ? 'disabled' : ''}>${s}</option>`).join('')}</select>${canF ? '' : '<div class="form-text">Available after the repair is completed.</div>'}</div>
      ${r.ful.method === 'delivery' ? `<div class="col-md-6"><label class="form-label" for="fRef">Delivery reference (optional)</label><input id="fRef" class="form-control" maxlength="60" value="${esc(r.ful.trackingRef)}" placeholder="Courier tracking no. or driver"><div class="form-text">Shown to the customer only if you enter one. No courier integration exists.</div></div>` : ''}
      <div class="col-12"><button class="btn btn-v" data-act="fulfil" ${st === 'Cancelled' ? 'disabled' : ''}><i class="bi bi-check2"></i> Save fulfilment</button></div></div></div>`;

    /* money */
    const paid = sumPaid(r);
    h += `<div class="rp-sec"><h3>Quotation, payment and costs</h3>
      <div class="row g-2 mb-3"><div class="col-6 col-md-3"><div class="sv-pill"><small>Estimate ${svc && svc.placeholder ? '<span class="tag-ph">placeholder</span>' : ''}</small><b class="fs-6">RM ${(+r.quoteMin).toLocaleString()}–${(+r.quoteMax).toLocaleString()}</b></div></div>
        <div class="col-6 col-md-3"><div class="sv-pill"><small>Approved price</small><b class="fs-6">${r.approvedPrice == null ? 'Not set' : money(r.approvedPrice)}</b></div></div>
        <div class="col-6 col-md-3"><div class="sv-pill"><small>Payment received</small><b class="fs-6">${money(paid)}</b></div></div>
        <div class="col-6 col-md-3"><div class="sv-pill"><small>Outstanding</small><b class="fs-6">${r.approvedPrice == null ? '-' : money(Math.max(0, r.approvedPrice - paid))}</b></div></div></div>
      <p class="small mu">An estimate is not revenue. Only recorded payments count as money received.</p>
      <div class="row g-3"><div class="col-md-4"><label class="form-label" for="mAppr">Approved price (RM)</label><input id="mAppr" type="number" min="0" step="0.01" class="form-control" value="${r.approvedPrice ?? ''}"><div class="invalid-feedback"></div></div>
        <div class="col-md-4"><label class="form-label" for="mParts">Parts cost (RM)</label><input id="mParts" type="number" min="0" step="0.01" class="form-control" value="${r.partsCost || 0}"></div>
        <div class="col-md-4"><label class="form-label" for="mDel">Delivery cost (RM)</label><input id="mDel" type="number" min="0" step="0.01" class="form-control" value="${r.deliveryCost || 0}"></div>
        <div class="col-12"><button class="btn btn-o" data-act="money"><i class="bi bi-check2"></i> Save price and costs</button></div>
        <div class="col-12 border-top pt-3"><div class="row g-2 align-items-end"><div class="col-md-4"><label class="form-label" for="pAmt">Record payment (RM)</label><input id="pAmt" type="number" min="0" step="0.01" class="form-control"><div class="invalid-feedback"></div></div><div class="col-md-3"><label class="form-label" for="pDate">Date</label><input id="pDate" type="date" class="form-control" value="${today()}" max="${today()}"></div><div class="col-md-3"><label class="form-label" for="pMeth">Method</label><select id="pMeth" class="form-select"><option>Cash</option><option>Card</option><option>Bank transfer</option><option>E-wallet</option></select></div><div class="col-md-2 d-grid"><button class="btn btn-v" data-act="pay">Add</button></div></div>
        ${(r.payments || []).length ? `<ul class="small mt-2 mb-0">${r.payments.map(p => `<li>${fmtDate(p.date)} · ${money(p.amt)} · ${esc(p.method)}</li>`).join('')}</ul>` : ''}</div></div></div>`;

    /* history */
    const H = getHist().filter(x => x.repairId === r.id).slice().reverse();
    h += `<div class="rp-sec"><h3>History</h3><ul class="timeline mb-0">${H.map(x => `<li><span class="tl-dot ${x.status === 'Completed' ? 'ok' : x.kind === 'fulfilment' ? 'info' : ''}"><i class="bi ${x.kind === 'fulfilment' ? 'bi-truck' : x.kind === 'note' ? 'bi-chat-left-text' : 'bi-record2'}"></i></span><b>${esc(x.status)}</b> · ${esc(x.text)}<small>${relTime(x.ts)} · ${esc(x.by)}</small></li>`).join('')}</ul></div>`;
    $('#rpBody').innerHTML = h;
  }

  /* photos the customer attached to the request */
  const gallery = r => { const P = repairPhotos(r.id); return P.length ? `<div class="rp-sec"><h3>Customer photos (${P.length})</h3><div class="rp-photos">${P.map((u, i) => `<a href="${u}" target="_blank" rel="noopener" title="Open photo ${i + 1} in a new tab"><img src="${u}" alt="Photo ${i + 1} of the reported damage for ${esc(r.id)}" loading="lazy"></a>`).join('')}</div></div>` : ''; };

  /* Read-only view for a customer: no actions, no staff names, no internal costs or manager notes. */
  function customerDetail(r) {
    const st = r.status, paid = sumPaid(r), svc = r.svc;
    $('#rpTitle').textContent = `${r.id} · ${r.req.serviceName}`; $('#rpSub').textContent = deviceLabel(r);
    const H = getHist().filter(x => x.repairId === r.id).slice().reverse();
    $('#rpBody').innerHTML = `<div class="rp-sec"><div class="d-flex flex-wrap gap-2 align-items-center mb-2">${rBadge(st)}${isRepairOverdue(r) ? '<span class="bd bd-overdue">Taking longer than estimated</span>' : ''}</div><p class="small mu mb-2">${esc(R_MEANING[st])}</p>
      <div class="rp-flow">${R_STATUS.filter(s => s !== 'Cancelled').map((s, k) => `${k ? '<i class="bi bi-chevron-right"></i>' : ''}<span class="${s === st ? 'on' : R_STATUS.indexOf(s) < R_STATUS.indexOf(st) && st !== 'Cancelled' ? 'past' : ''}">${s}</span>`).join('')}</div></div>
      <div class="rp-sec"><h3>Device and service</h3>${kv([['Device', `${esc(r.req.deviceCat)} · ${esc(deviceLabel(r))}`], ['Service', esc(r.req.serviceName)], ['Your description', esc(r.req.problem)], ['Requested on', fmtDate(r.createdAt.slice(0, 10))], ['Estimated completion', r.due ? fmtDate(r.due) : 'To be confirmed by the manager'], ['Estimated duration', esc(r.estDuration || '-')]])}</div>
      ${gallery(r)}
      <div class="rp-sec"><h3>Collection &amp; delivery</h3>${st === 'Cancelled' ? '<p class="mu mb-0">This request was cancelled.</p>' : `${flow(r)}<p class="small mu mt-2 mb-0">Method: ${r.ful.method === 'pickup' ? 'collect at the store' : 'delivery to your address'}. Current status: <b>${esc(r.ful.status)}</b>.</p>`}</div>
      <div class="rp-sec"><h3>Price and payment</h3><div class="row g-2"><div class="col-6 col-md-3"><div class="sv-pill"><small>Estimate</small><b class="fs-6">RM ${(+r.quoteMin).toLocaleString()}–${(+r.quoteMax).toLocaleString()}</b></div></div>
        <div class="col-6 col-md-3"><div class="sv-pill"><small>Approved price</small><b class="fs-6">${r.approvedPrice == null ? 'Not set yet' : money(r.approvedPrice)}</b></div></div>
        <div class="col-6 col-md-3"><div class="sv-pill"><small>Paid</small><b class="fs-6">${money(paid)}</b></div></div>
        <div class="col-6 col-md-3"><div class="sv-pill"><small>Balance</small><b class="fs-6">${r.approvedPrice == null ? '-' : money(Math.max(0, r.approvedPrice - paid))}</b></div></div></div>
        <p class="small mu mt-2 mb-0">${esc(PRICE_DISCLAIMER)}</p></div>
      <div class="rp-sec"><h3>Progress timeline</h3><ul class="timeline mb-0">${H.map(x => `<li><span class="tl-dot ${x.status === 'Completed' ? 'ok' : x.kind === 'fulfilment' ? 'info' : ''}"><i class="bi ${x.kind === 'fulfilment' ? 'bi-truck' : 'bi-wrench'}"></i></span><b>${esc(x.status)}</b><div class="small mu">${fmtDate(String(x.at || x.ts || '').slice(0, 10))}</div></li>`).join('')}</ul></div>`;
  }

  const after = msg => { render(); detail(); if (msg) toast(msg); };
  $('#rpBody').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, id = openId, v = i => ($('#' + i) || {}).value;
    if (a === 'showApprove') { panel = 'approve'; return detail(); } if (a === 'showReject') { panel = 'reject'; return detail(); } if (a === 'hidePanel') { panel = ''; return detail(); }
    if (a === 'review') { startReview(id); return after('✓ Request moved to review.'); }
    if (a === 'approve') {
      const price = v('aPrice'), ok = [bad('aPrice', price === '' || +price >= 0 ? '' : 'Enter a valid amount.'), bad('aDue', v('aDue') && v('aDue') >= today() ? '' : 'Choose a due date that is not in the past.')];
      if (ok.includes(false)) return toast('⚠ Please correct the highlighted fields.', 'error');
      approveRepair(id, { staff: v('aStaff'), priority: v('aPri'), due: v('aDue'), estDuration: v('aDur').trim(), approvedPrice: price, managerNote: v('aNote').trim() }); panel = '';
      return after(v('aStaff') ? '✓ Repair approved and task created for the technician.' : '✓ Repair approved. Assign a technician to create the task.');
    }
    if (a === 'assign' || a === 'reassign') {
      const ok = [bad('sStaff', v('sStaff') ? '' : 'Select a technician.'), bad('sDue', v('sDue') ? '' : 'Choose a due date.')]; if (ok.includes(false)) return toast('⚠ Please correct the highlighted fields.', 'error');
      if (a === 'assign') assignRepair(id, { staff: v('sStaff'), priority: v('sPri'), due: v('sDue') });
      else updateRepair(id, { staff: v('sStaff'), priority: v('sPri'), due: v('sDue'), estDuration: v('sDur').trim() });
      return after('✓ Assignment saved. The technician sees the task on their dashboard.');
    }
    if (a === 'status') { updateRepair(id, { status: v('uStatus') }); return after('✓ Repair status updated.'); }
    if (a === 'cancel') { cancelRepair(id, (v('xReason') || '').trim()); panel = ''; return after('✓ Repair cancelled. Linked task removed, history kept.'); }
    if (a === 'reopen') { updateRepair(id, { status: 'In Progress' }, { text: 'Repair re-opened by the manager.' }); return after('✓ Repair re-opened.'); }
    if (a === 'fulfil') {
      const m = ($('input[name=fMethod]:checked') || {}).value; if (m) setFulfilmentMethod(id, m);
      const ok = setFulfilmentStatus(id, v('fStat') || fulById(id).status, $('#fRef') ? v('fRef') : undefined);
      return after(ok ? '✓ Collection / delivery updated.' : '⚠ That status is only available after the repair is completed.');
    }
    if (a === 'money') { const ap = v('mAppr'); if (!bad('mAppr', ap === '' || +ap >= 0 ? '' : 'Enter a valid amount.')) return; const jobs = getJobs(), j = jobs.find(x => x.id === id); j.approvedPrice = ap === '' ? null : +ap; store.set('repair_jobs', jobs); setRepairCosts(id, v('mParts'), v('mDel')); return after('✓ Price and costs saved.'); }
    if (a === 'pay') { if (!bad('pAmt', +v('pAmt') > 0 ? '' : 'Enter an amount above 0.')) return; recordPayment(id, v('pAmt'), v('pDate'), v('pMeth')); return after('✓ Payment recorded.'); }
  });
  $('#rpBody').addEventListener('change', e => { if (e.target.name === 'fMethod') { /* applied with Save fulfilment */ } });

  render(true);
  if (sp.get('id')) openDetail(sp.get('id'));
  Sync.watch(() => { render(); if (openId && !$('#rpBody').contains(document.activeElement)) detail(); });
}
