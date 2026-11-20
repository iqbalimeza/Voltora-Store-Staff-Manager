/* ==========================================================================
   VOLTORA - Finance (admin only)
   Store operations expenses: summary vs. monthly budget, two charts, and an
   expense table with search / category / status / month filters and CRUD.
   ========================================================================== */
if (layout('finance', { title: 'Finance', roles: ['admin'] })) {
  const PER = 10; let page = 1;
  const expModal = new bootstrap.Modal('#expModal'), budModal = new bootstrap.Modal('#budModal');
  const opts = a => a.map(x => `<option>${esc(x)}</option>`).join('');
  const CAT_COLORS = [CHART_COLORS.accent, '#2563eb', '#0d9488', '#f59e0b', '#dc2626', '#94a3b8'];
  $('#fCat').innerHTML = '<option value="">All categories</option>' + opts(EXP_CATS); $('#fStatus').innerHTML = '<option value="">All</option>' + opts(EXP_STATUS);
  $('#xCat').innerHTML = opts(EXP_CATS); $('#xStatus').innerHTML = opts(EXP_STATUS);
  const P = qs(); if (P.get('month')) $('#fMonth').value = P.get('month');

  /* ----- summary cards ----- */
  function summary() {
    const ex = getExpenses(), cm = addMonths(0), bud = getBudget(), month = sum(ex.filter(e => monthKey(e.date) === cm).map(e => e.amt));
    const left = bud - month, pct = Math.min(100, Math.round(month / bud * 100)), tone = pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : 'ok';
    const pend = ex.filter(e => e.status === 'Pending');
    const cards = [
      ['Total Expenses', sum(ex.map(e => e.amt)), 'bi-receipt', '', `${ex.length} records in 6 months`],
      ['This Month', month, 'bi-calendar-month', 'info', `${pct}% of the monthly budget`],
      ['Monthly Budget', bud, 'bi-piggy-bank-fill', '', '<button class="btn btn-o btn-sm mt-1" id="editBud"><i class="bi bi-pencil"></i> Change budget</button>'],
      ['Remaining Budget', Math.abs(left), left < 0 ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill', tone, left < 0 ? 'Over budget this month' : `${RM(sum(pend.map(e => e.amt)))} pending payment`, left < 0 ? '-' : '']
    ];
    $('#summary').innerHTML = cards.map(c => `<div class="col-6 col-xl-3"><article class="card-v lift kpi-card t-${c[3] || 'accent'}" data-anim="kpi"><div class="kpi-top"><span class="kpi-label">${c[0]}</span><span class="kpi-ico ${c[3]}"><i class="bi ${c[2]}"></i></span></div>
      <div class="kpi-value num ${c[0] === 'Remaining Budget' && left < 0 ? 'text-danger' : ''}"><span data-count="${c[1]}" data-prefix="${c[5] === '-' ? '-RM ' : 'RM '}">RM ${c[1].toLocaleString()}</span></div>
      ${c[0] === 'This Month' ? `<div class="pbar ${tone}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span data-progress="${pct}" style="width:${pct}%"></span></div>` : ''}<div class="kpi-sub">${c[4]}</div></article></div>`).join('');
  }

  /* ----- charts ----- */
  function charts() {
    const ex = getExpenses(), months = [-5, -4, -3, -2, -1, 0].map(addMonths), bud = getBudget(), tot = months.map(m => sum(ex.filter(e => monthKey(e.date) === m).map(e => e.amt)));
    Charts.make('cMonthly', 'bar', months.map(monthLabel), [
      { type: 'bar', label: 'Expenses', data: tot, backgroundColor: tot.map(v => v > bud ? CHART_COLORS.danger : CHART_COLORS.accent), borderRadius: 6 },
      { type: 'line', label: 'Monthly budget', data: months.map(() => bud), borderColor: CHART_COLORS.warn, borderDash: [6, 4], pointRadius: 0, borderWidth: 2 }
    ], { legend: true, yTitle: 'Amount (RM)', xTitle: 'Month', yFormat: v => 'RM ' + v.toLocaleString(), tooltip: { callbacks: { label: c => `${c.dataset.label}: ${RM(c.parsed.y)}` } },
      onPick: i => { $('#fMonth').value = months[i]; page = 1; table(); $('#tblHead').scrollIntoView({ behavior: Motion.reduced() ? 'auto' : 'smooth', block: 'center' }); } });
    const set = ex.filter(e => $('#catPeriod').value === 'month' ? monthKey(e.date) === addMonths(0) : true);
    const byCat = EXP_CATS.map(c => sum(set.filter(e => e.cat === c).map(e => e.amt)));
    Charts.make('cCat', 'doughnut', EXP_CATS, [{ data: byCat, backgroundColor: CAT_COLORS, borderWidth: 2, borderColor: cssv('--card') }],
      { tooltip: { callbacks: { label: c => `${c.label}: ${RM(c.parsed)}` } }, onPick: (i, l) => { $('#fCat').value = l; page = 1; table(); $('#tblHead').scrollIntoView({ behavior: Motion.reduced() ? 'auto' : 'smooth', block: 'center' }); } });
  }

  /* ----- table ----- */
  function filtered() {
    const q = $('#q').value.trim().toLowerCase(), c = $('#fCat').value, s = $('#fStatus').value, m = $('#fMonth').value;
    return getExpenses().filter(e => (!c || e.cat === c) && (!s || e.status === s) && (!m || monthKey(e.date) === m) && `${e.id} ${e.name} ${e.cat} ${e.note}`.toLowerCase().includes(q)).sort((a, b) => b.date.localeCompare(a.date));
  }
  function table(first) {
    const list = filtered(), pg = paginate(list, page, PER); page = pg.page;
    $('#tblTotal').textContent = list.length ? `${list.length} record${list.length > 1 ? 's' : ''} · ${RM2(sum(list.map(e => e.amt)))}` : '';
    $('#tbody').innerHTML = pg.items.length ? pg.items.map(e => `<tr><td><b>${esc(e.name)}</b><div class="small mu">${esc(e.id)}${e.note ? ' · ' + esc(e.note) : ''}</div></td><td>${esc(e.cat)}</td><td class="text-end num fw-semibold">${RM2(e.amt)}</td><td class="text-nowrap">${fmtDate(e.date)}</td><td>${badge(e.status)}</td>
      <td class="text-end text-nowrap">${e.status === 'Pending' ? `<button class="btn btn-o btn-sm" data-pay="${e.id}"><i class="bi bi-check2"></i> Mark paid</button> ` : ''}
        <button class="btn btn-o btn-icon btn-sm" data-edit="${e.id}" aria-label="Edit ${esc(e.name)}" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-o btn-icon btn-sm danger" data-del="${e.id}" aria-label="Delete ${esc(e.name)}" title="Delete"><i class="bi bi-trash"></i></button></td></tr>`).join('')
      : `<tr><td colspan="6">${emptyState('bi-receipt-cutoff', 'No expenses found.', 'Try changing your search or filter.')}</td></tr>`;
    $('#pager').innerHTML = pagerHTML(pg, 'expenses'); if (!first) Motion.rows($('#tbody'));
  }
  ['q', 'fCat', 'fStatus', 'fMonth'].forEach(id => $('#' + id).addEventListener(id === 'q' ? 'input' : 'change', () => { page = 1; table(); }));
  $('#fReset').onclick = () => { ['q', 'fCat', 'fStatus', 'fMonth'].forEach(id => $('#' + id).value = ''); page = 1; table(); };
  $('#pager').onclick = e => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { page = +b.dataset.page; table(); } };
  $('#catPeriod').onchange = charts;

  const refresh = () => { summary(); charts(); table(); Motion.counters($('#summary'), .6); Motion.progress($('#summary')); };

  /* ----- add / edit / pay / delete ----- */
  function openExp(e) {
    $$('.is-invalid', $('#expModal')).forEach(x => x.classList.remove('is-invalid')); $('#expForm').reset();
    $('#expTitle').textContent = e ? 'Edit expense' : 'Add expense'; $('#xId').value = e ? e.id : '';
    $('#xName').value = e ? e.name : ''; $('#xCat').value = e ? e.cat : EXP_CATS[0]; $('#xAmt').value = e ? e.amt : ''; $('#xDate').value = e ? e.date : today(); $('#xStatus').value = e ? e.status : 'Paid'; $('#xNote').value = e ? e.note : '';
    expModal.show();
  }
  $('#addBtn').onclick = () => openExp(null);
  $('#tbody').addEventListener('click', async ev => {
    const ed = ev.target.closest('[data-edit]'), dl = ev.target.closest('[data-del]'), pay = ev.target.closest('[data-pay]');
    if (ed) openExp(getExpenses().find(x => x.id === ed.dataset.edit));
    if (pay) { const all = getExpenses(), x = all.find(z => z.id === pay.dataset.pay); x.status = 'Paid'; store.set('expenses', all); refresh(); toast('✓ Expense marked as paid.'); }
    if (dl) { const x = getExpenses().find(z => z.id === dl.dataset.del); if (await confirmBox({ title: 'Delete this expense?', body: `${x.name} (${RM2(x.amt)}) will be removed.`, okText: 'Delete expense' })) { store.set('expenses', getExpenses().filter(z => z.id !== x.id)); refresh(); toast('✓ Expense deleted successfully.'); } }
  });
  $('#expForm').addEventListener('submit', e => {
    e.preventDefault(); $$('.is-invalid', $('#expModal')).forEach(x => x.classList.remove('is-invalid'));
    const name = $('#xName').value.trim(), amt = parseFloat($('#xAmt').value), date = $('#xDate').value; let ok = true;
    if (!name) { $('#xName').classList.add('is-invalid'); ok = false; } if (!(amt > 0)) { $('#xAmt').classList.add('is-invalid'); ok = false; } if (!date) { $('#xDate').classList.add('is-invalid'); ok = false; }
    if (!ok) return toast('⚠ Unable to save expense. Please check the required fields.', 'error');
    const all = getExpenses(), id = $('#xId').value, data = { name, cat: $('#xCat').value, amt: Math.round(amt * 100) / 100, date, status: $('#xStatus').value, note: $('#xNote').value.trim() };
    if (id) Object.assign(all.find(x => x.id === id), data); else { all.push({ id: nextId('EX-', all.map(x => ({ id: x.id.replace('EX-', '') }))), ...data }); addNote('Finance', `New expense recorded: ${name}.`); }
    store.set('expenses', all); expModal.hide(); refresh(); toast(id ? '✓ Expense updated successfully.' : '✓ Expense recorded successfully.');
  });
  $('#summary').addEventListener('click', e => { if (e.target.closest('#editBud')) { $('#bAmt').value = getBudget(); $('#bAmt').classList.remove('is-invalid'); budModal.show(); } });
  $('#budForm').addEventListener('submit', e => {
    e.preventDefault(); const v = parseFloat($('#bAmt').value); if (!(v > 0)) { $('#bAmt').classList.add('is-invalid'); return toast('⚠ Unable to save the budget.', 'error'); }
    store.set('budget', { monthly: Math.round(v) }); budModal.hide(); refresh(); toast('✓ Monthly budget updated successfully.');
  });
  $('#exportBtn').onclick = () => { const l = filtered(); if (!l.length) return toast('⚠ There are no expenses to export.', 'error'); downloadCSV('voltora-expenses.csv', [['ID', 'Expense', 'Category', 'Amount (RM)', 'Date', 'Status', 'Note'], ...l.map(e => [e.id, e.name, e.cat, e.amt, e.date, e.status, e.note])]); };

  summary(); charts(); table(true); Motion.page();

  /* ----- repair finance (separate from store expenses; only recorded data) ----- */
  { const sec = document.createElement('section'); sec.id = 'repFin'; sec.setAttribute('aria-labelledby', 'repFinH');
    sec.innerHTML = `<h2 class="dash-sec-title" id="repFinH"><i class="bi bi-tools"></i> Repair finance <small class="mu fw-normal ms-1">Estimates are not revenue. Only recorded payments count as received.</small></h2><div class="row g-3 mb-3" id="repFinCards"></div>
      <div class="row g-3 mb-3"><div class="col-lg-8"><article class="card-v h-100"><div class="card-head"><div><h2 class="card-title">Repair payments vs repair costs</h2><p class="card-sub">Payments received and parts / delivery costs per month</p></div></div><div class="chart-box"><canvas id="cRepFin"></canvas></div></article></div>
      <div class="col-lg-4"><article class="card-v h-100"><div class="card-head"><h2 class="card-title">Open repair balances</h2></div><div id="repOwed"></div></article></div></div>`;
    $('#summary').closest('section').after(sec); }
  function repairFin() {
    const R = repairs(), f = repairFinance(R), net = f.received - f.parts - f.delivery;
    $('#repFinCards').innerHTML = [['Estimated pipeline (not revenue)', `${RM(f.quotedMin)} – ${RM(f.quotedMax)}`, 'bi-hourglass-split', 'warn', 'Open requests, placeholder estimates'], ['Approved repair price', RM2(f.approved), 'bi-patch-check-fill', 'info', 'Agreed with customers'], ['Payments received', RM2(f.received), 'bi-cash-coin', 'ok', 'Recorded payments only'],
      ['Outstanding', RM2(f.outstanding), 'bi-clock-history', 'warn', 'Approved minus received'], ['Repair costs', RM2(f.parts + f.delivery), 'bi-box-seam', 'danger', `${RM2(f.parts)} parts · ${RM2(f.delivery)} delivery`], ['Net recorded', RM2(net), 'bi-graph-up-arrow', net >= 0 ? 'ok' : 'danger', 'Received minus repair costs']]
      .map(c => `<div class="col-6 col-xl-2"><article class="card-v kpi-card t-${c[3]}"><div class="kpi-top"><span class="kpi-label">${c[0]}</span><span class="kpi-ico ${c[3]}"><i class="bi ${c[2]}"></i></span></div><div class="kpi-value num" style="font-size:${c[1].length > 16 ? '1rem' : '1.35rem'}">${c[1]}</div><div class="kpi-sub">${c[4]}</div></article></div>`).join('');
    const months = [-5, -4, -3, -2, -1, 0].map(addMonths);
    Charts.make('cRepFin', 'bar', months.map(monthLabel), [{ label: 'Payments received', data: months.map(m => (f.months[m] || {}).received || 0), backgroundColor: CHART_COLORS.ok, borderRadius: 6 }, { label: 'Repair costs', data: months.map(m => (f.months[m] || {}).costs || 0), backgroundColor: CHART_COLORS.danger, borderRadius: 6 }], { legend: true, yTitle: 'Amount (RM)', xTitle: 'Month', yFormat: v => 'RM ' + v.toLocaleString(), tooltip: { callbacks: { label: c => `${c.dataset.label}: ${RM(c.parsed.y)}` } } });
    const owed = R.filter(r => r.status !== 'Cancelled' && r.approvedPrice != null && r.approvedPrice > sumPaid(r)).sort((a, b) => (b.approvedPrice - sumPaid(b)) - (a.approvedPrice - sumPaid(a)));
    $('#repOwed').innerHTML = owed.length ? `<ul class="list-unstyled mb-0">${owed.slice(0, 6).map(r => `<li class="d-flex justify-content-between gap-2 py-2 border-bottom"><a href="repairs.html?id=${r.id}"><b>${esc(r.id)}</b></a><span class="small mu flex-grow-1 text-truncate">${esc(r.req.name)}</span><b>${RM2(r.approvedPrice - sumPaid(r))}</b></li>`).join('')}</ul>` : emptyState('bi-check2-all', 'Nothing outstanding', 'All approved repairs are fully paid.');
  }
  repairFin(); Sync.watch(repairFin);
}
