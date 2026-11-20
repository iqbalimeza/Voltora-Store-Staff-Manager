/* ==========================================================================
   VOLTORA - Reports (admin only)
   Three report sections (tasks, staff, finance) driven by Period / Staff /
   Status filters, with CSV export and print.
   ========================================================================== */
if (layout('reports', { title: 'Reports', roles: ['admin'] })) {
  const F = { days: 90, staff: '', status: '' };
  $('#fStaff').innerHTML = '<option value="">All staff</option>' + getStaff().map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  const bind = () => { F.days = +$('#fPeriod').value; F.staff = $('#fStaff').value; F.status = $('#fStatus').value; draw(false); };
  ['fPeriod', 'fStaff', 'fStatus'].forEach(id => $('#' + id).addEventListener('change', bind));
  $('#fReset').onclick = () => { $('#fPeriod').value = '90'; $('#fStaff').value = ''; $('#fStatus').value = ''; bind(); };
  const link = q => 'tasks.html?' + new URLSearchParams(q);
  const card = (label, val, icon, tone, sub, extra = {}) => `<div class="col-6 col-lg-4 col-xl"><article class="card-v kpi-card t-${tone || 'accent'}"><div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-ico ${tone}"><i class="bi ${icon}"></i></span></div><div class="kpi-value num" style="font-size:1.6rem"><span data-count="${val}" data-prefix="${extra.pre || ''}" data-suffix="${extra.suf || ''}">${extra.pre || ''}${val}${extra.suf || ''}</span></div><div class="kpi-sub">${sub || '&nbsp;'}</div></article></div>`;
  let cache = {};

  let draw = function (first) {
    const set = filterTasks(F, getTasks()), c = s => set.filter(t => statusOf(t) === s).length, total = set.length, rate = total ? Math.round(c('Completed') / total * 100) : 0;

    /* 1. Task performance */
    $('#taskCards').innerHTML = [card('Total Tasks', total, 'bi-list-task', '', 'In the selected period'), card('Completed', c('Completed'), 'bi-check-circle-fill', 'ok', `${rate}% completion`), card('Pending', c('Pending'), 'bi-hourglass-split', 'warn', 'Not started'), card('In Progress', c('In Progress'), 'bi-arrow-repeat', 'info', 'Being worked on'), card('Overdue', c('Overdue'), 'bi-exclamation-triangle-fill', 'danger', 'Past due date'), card('Completion Rate', rate, 'bi-pie-chart-fill', '', `${c('Completed')} of ${total}`, { suf: '%' })].join('');
    Charts.make('rStatus', 'doughnut', STATUSES, [{ data: STATUSES.map(c), backgroundColor: [CHART_COLORS.warn, CHART_COLORS.info, CHART_COLORS.ok, CHART_COLORS.danger], borderWidth: 2, borderColor: cssv('--card') }], { onPick: (i, l) => { location.href = link({ status: l }); } });
    Charts.make('rPri', 'bar', PRI, [{ label: 'Tasks', data: PRI.map(p => set.filter(t => t.pri === p).length), backgroundColor: [CHART_COLORS.danger, CHART_COLORS.warn, CHART_COLORS.slate], borderRadius: 6 }], { legend: false, yTitle: 'Number of tasks', xTitle: 'Priority', onPick: (i, l) => { location.href = link({ pri: l }); } });
    Charts.make('rCat', 'bar', CATS.map(x => x.replace('Customer Service', 'Cust. Service')), [{ label: 'Tasks', data: CATS.map(x => set.filter(t => t.cat === x).length), backgroundColor: CHART_COLORS.accent, borderRadius: 6 }], { legend: false, indexAxis: 'y', extra: { scales: { x: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Number of tasks' } }, y: { grid: { display: false } } } } });

    /* 2. Staff performance */
    const staff = getStaff().filter(s => !F.staff || s.id === F.staff), rows = staff.map(s => { const st = staffStats(s.id, set); return { s, ...st }; });
    $('#staffRows').innerHTML = rows.length ? rows.map(r => `<tr><td><div class="cell-user">${avatar(r.s.name, r.s.id, 'av-sm')}<a class="t-title" href="staff-profile.html?id=${r.s.id}">${esc(r.s.name)}</a></div></td><td class="text-center num">${r.total}</td><td class="text-center num">${r.completed}</td><td class="text-center num hide-lg">${r.pending + r.inProgress}</td><td class="text-center num ${r.overdue ? 'text-danger fw-bold' : ''}">${r.overdue}</td>
      <td><div class="pcell"><div class="pbar ${r.rate >= 70 ? 'ok' : r.rate >= 40 ? '' : 'warn'}"><span data-progress="${r.rate}" style="width:${r.rate}%"></span></div><small class="num">${r.rate}%</small></div></td></tr>`).join('') : `<tr><td colspan="6">${emptyState('bi-person-x', 'No staff found.', 'Try changing the filter.')}</td></tr>`;
    Charts.make('rStaff', 'bar', rows.map(r => r.s.name.split(' ')[0]), [{ label: 'Completion rate %', data: rows.map(r => r.rate), backgroundColor: rows.map(r => r.rate >= 70 ? CHART_COLORS.ok : r.rate >= 40 ? CHART_COLORS.info : CHART_COLORS.warn), borderRadius: 6 }],
      { legend: false, indexAxis: 'y', onPick: i => { location.href = link({ staff: rows[i].s.id }); }, extra: { scales: { x: { min: 0, max: 100, title: { display: true, text: 'Completion rate (%)' } }, y: { grid: { display: false } } } } });

    /* 3. Finance */
    const from = F.days ? day(-(F.days - 1)) : '0000-00-00', ex = getExpenses().filter(e => e.date >= from), bud = getBudget(), cm = addMonths(0);
    const spent = sum(getExpenses().filter(e => monthKey(e.date) === cm).map(e => e.amt)), totalEx = sum(ex.map(e => e.amt));
    $('#finCards').innerHTML = [card('Total Expenses', totalEx, 'bi-receipt', 'warn', `${ex.length} records`, { pre: 'RM ' }), card('Paid', sum(ex.filter(e => e.status === 'Paid').map(e => e.amt)), 'bi-check-circle-fill', 'ok', 'Settled', { pre: 'RM ' }), card('Pending', sum(ex.filter(e => e.status === 'Pending').map(e => e.amt)), 'bi-hourglass-split', 'warn', 'Awaiting payment', { pre: 'RM ' }), card('Monthly Budget', bud, 'bi-piggy-bank-fill', '', 'Set in Finance', { pre: 'RM ' }), card('Budget Remaining', Math.max(0, bud - spent), 'bi-wallet2', spent > bud ? 'danger' : 'ok', spent > bud ? `Over budget by ${RM(spent - bud)}` : 'This month', { pre: 'RM ' })].join('');
    const months = [-5, -4, -3, -2, -1, 0].map(addMonths), tot = months.map(m => sum(getExpenses().filter(e => monthKey(e.date) === m).map(e => e.amt)));
    Charts.make('rMonthly', 'bar', months.map(monthLabel), [{ type: 'bar', label: 'Expenses', data: tot, backgroundColor: tot.map(v => v > bud ? CHART_COLORS.danger : CHART_COLORS.accent), borderRadius: 6 }, { type: 'line', label: 'Monthly budget', data: months.map(() => bud), borderColor: CHART_COLORS.warn, borderDash: [6, 4], pointRadius: 0, borderWidth: 2 }],
      { legend: true, yTitle: 'Amount (RM)', xTitle: 'Month', yFormat: v => 'RM ' + v.toLocaleString(), tooltip: { callbacks: { label: c => `${c.dataset.label}: ${RM(c.parsed.y)}` } } });
    const bycat = EXP_CATS.map(k => [k, sum(ex.filter(e => e.cat === k).map(e => e.amt))]).sort((a, b) => b[1] - a[1]);
    $('#catRows').innerHTML = bycat.map(r => { const sh = totalEx ? Math.round(r[1] / totalEx * 100) : 0; return `<tr><td>${esc(r[0])}</td><td class="text-end num">${RM(r[1])}</td><td><div class="pcell"><div class="pbar accent"><span data-progress="${sh}" style="width:${sh}%"></span></div><small class="num">${sh}%</small></div></td></tr>`; }).join('');

    cache = { set, rows, ex };
    if (first) Motion.page(); else { Motion.counters(document, .6); Motion.progress(document); }
  };

  /* exports + print */
  $$('[data-export]').forEach(b => b.onclick = () => {
    const k = b.dataset.export, { set, rows, ex } = cache;
    if (k === 'tasks') { if (!set.length) return toast('⚠ There are no tasks to export.', 'error'); downloadCSV('voltora-task-report.csv', [['ID', 'Task', 'Category', 'Staff', 'Priority', 'Due', 'Progress %', 'Status'], ...set.map(t => [t.id, t.title, t.cat, staffName(t.staff), t.pri, t.due, t.progress, statusOf(t)])]); }
    if (k === 'staff') downloadCSV('voltora-staff-performance.csv', [['Staff', 'Assigned', 'Completed', 'Pending', 'In progress', 'Overdue', 'Completion %'], ...rows.map(r => [r.s.name, r.total, r.completed, r.pending, r.inProgress, r.overdue, r.rate])]);
    if (k === 'finance') { if (!ex.length) return toast('⚠ There are no expenses to export.', 'error'); downloadCSV('voltora-expense-report.csv', [['ID', 'Expense', 'Category', 'Amount (RM)', 'Date', 'Status'], ...ex.map(e => [e.id, e.name, e.cat, e.amt, e.date, e.status])]); }
  });
  $('#printBtn').onclick = () => window.print();
  draw(true);

  /* ----- 4. Repair report (period + staff filters; money only from recorded payments) ----- */
  { const sec = document.createElement('section'); sec.className = 'mt-4'; sec.setAttribute('aria-labelledby', 'repRepH');
    sec.innerHTML = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2"><h2 class="dash-sec-title m-0" id="repRepH"><i class="bi bi-tools"></i> Repair report</h2><button class="btn btn-o btn-sm" id="repExport"><i class="bi bi-download"></i> Export CSV</button></div>
      <div class="row g-3 mb-3" id="repCards"></div>
      <div class="row g-3 mb-3"><div class="col-lg-6"><article class="card-v h-100"><div class="card-head"><h2 class="card-title">Repairs by service category</h2></div><div class="chart-box"><canvas id="rRepCat"></canvas></div></article></div>
      <div class="col-lg-6"><article class="card-v h-100"><div class="card-head"><h2 class="card-title">Completion report</h2></div><div class="table-wrap"><table class="table table-v"><thead><tr><th>Repair</th><th class="hide-sm">Technician</th><th>Status</th><th class="hide-md">Fulfilment</th><th class="text-end">Received</th></tr></thead><tbody id="repRows"></tbody></table></div></article></div></div>`;
    document.querySelector('main').append(sec); }
  let repCache = [];
  function repairReport() {
    const from = F.days ? day(-(F.days - 1)) : '0000-00-00', R = repairs().filter(r => r.createdAt.slice(0, 10) >= from && (!F.staff || r.staff === F.staff)); repCache = R;
    const live = R.filter(r => r.status !== 'Cancelled'), done = live.filter(r => r.status === 'Completed'), rate = live.length ? Math.round(done.length / live.length * 100) : 0;
    const d = done.filter(r => r.start && r.completedAt), avg = d.length ? (sum(d.map(r => Math.max(0, diffDays(r.completedAt, r.start)))) / d.length).toFixed(1) : null, f = repairFinance(R);
    $('#repCards').innerHTML = [['Repair requests', R.length, 'bi-inbox-fill', '', `${R.filter(r => r.status === 'Cancelled').length} cancelled`], ['Completed', done.length, 'bi-check-circle-fill', 'ok', `${rate}% of active requests`], ['Avg. completion', avg === null ? 'n/a' : avg + ' days', 'bi-stopwatch', 'info', avg === null ? 'No completed repairs' : `${d.length} repairs`], ['Payments received', RM(f.received), 'bi-cash-coin', 'ok', 'Recorded only'], ['Repair costs', RM(f.parts + f.delivery), 'bi-box-seam', 'warn', 'Parts + delivery']]
      .map(c => `<div class="col-6 col-xl"><article class="card-v kpi-card t-${c[3] || 'accent'}"><div class="kpi-top"><span class="kpi-label">${c[0]}</span><span class="kpi-ico ${c[3]}"><i class="bi ${c[2]}"></i></span></div><div class="kpi-value num" style="font-size:1.4rem">${c[1]}</div><div class="kpi-sub">${c[4]}</div></article></div>`).join('');
    const cats = getSvCats();
    Charts.make('rRepCat', 'bar', cats.map(c => c.short), [{ label: 'Requested', data: cats.map(c => live.filter(r => (r.svc || {}).cat === c.id).length), backgroundColor: CHART_COLORS.accent, borderRadius: 6 }, { label: 'Completed', data: cats.map(c => done.filter(r => (r.svc || {}).cat === c.id).length), backgroundColor: CHART_COLORS.ok, borderRadius: 6 }], { legend: true, yTitle: 'Repairs', extra: { scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40, font: { size: 10 } } }, y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Repairs' } } } } });
    $('#repRows').innerHTML = done.length ? done.sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 10).map(r => `<tr><td><a href="repairs.html?id=${r.id}"><b>${esc(r.id)}</b></a><div class="small mu">${esc(r.req.serviceName)}</div></td><td class="hide-sm">${esc(firstName(r.staff))}</td><td>${rBadge(r.status)}</td><td class="hide-md">${rBadge(r.ful.status)}</td><td class="text-end num">${RM(sumPaid(r))}</td></tr>`).join('') : `<tr><td colspan="5">${emptyState('bi-tools', 'No completed repairs', 'Nothing completed in this period.')}</td></tr>`;
  }
  $('#repExport').onclick = () => { if (!repCache.length) return toast('⚠ There are no repairs to export.', 'error'); downloadCSV('voltora-repair-report.csv', [['Repair ID', 'Service', 'Technician', 'Status', 'Fulfilment', 'Requested', 'Completed', 'Approved price (RM)', 'Received (RM)', 'Parts cost (RM)', 'Delivery cost (RM)'], ...repCache.map(r => [r.id, r.req.serviceName, staffName(r.staff), r.status, r.ful.status, r.createdAt.slice(0, 10), r.completedAt || '', r.approvedPrice ?? '', sumPaid(r), r.partsCost, r.deliveryCost])]); };
  const _draw = draw; draw = function (first) { _draw(first); repairReport(); };
  repairReport(); Sync.watch(() => draw(false));
}
