/* ==========================================================================
   VOLTORA - Dashboard
   KPIs, charts, recent activity and upcoming deadlines, all computed from the
   stored tasks/staff/expenses. The Period / Staff / Status filters re-compute
   every number and chart. Staff users only see their own tasks.
   ========================================================================== */
/* Customer dashboard: read only, own repairs only (matched by the email / phone used on the request). */
function customerDash() {
  const me = session(), main = $('main');
  const h = new Date().getHours();
  $('#greet').textContent = `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}, ${me.name.split(' ')[0]}`;
  $('#heroActions').innerHTML = '<a class="btn btn-v" href="services.html"><i class="bi bi-plus-lg"></i> Request a repair</a><a class="btn btn-o" href="repairs.html"><i class="bi bi-wrench-adjustable-circle"></i> My repairs</a><a class="btn btn-o" href="schedule.html"><i class="bi bi-calendar3"></i> Schedule</a>';
  [...main.children].forEach(el => { if (!el.matches('.hero-card, .crumbs')) el.classList.add('d-none'); });
  main.insertAdjacentHTML('beforeend', `<section id="custSec" aria-label="My repairs">
    <div class="sv-disc mb-3"><i class="bi bi-eye-fill me-1"></i> Customer view: you can follow your own repairs here, but you cannot edit anything. Prices are estimates until the manager confirms them.</div>
    <div class="row g-3 mb-3" id="custKpis"></div>
    <div class="row g-3 mb-3"><div class="col-lg-4"><article class="card-v h-100"><div class="card-head"><h2 class="card-title">My repairs by status</h2></div><div class="chart-box"><canvas id="cCust"></canvas></div></article></div>
      <div class="col-lg-8"><article class="card-v h-100"><div class="card-head"><h2 class="card-title">My repairs</h2><a class="btn btn-o btn-sm" href="repairs.html">View all</a></div><div id="custList"></div></article></div></div></section>`);
  function draw() {
    const R = visibleRepairs(), live = R.filter(r => r.status !== 'Cancelled'), act = live.filter(r => r.status !== 'Completed');
    $('#greetSub').textContent = `${new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${act.length} active repair${act.length === 1 ? '' : 's'}`;
    const ready = live.filter(r => r.ful.status === 'Available for Collection').length, deliv = live.filter(r => ['Delivery Requested', 'Preparing for Delivery', 'Out for Delivery'].includes(r.ful.status)).length;
    const cards = [['My Repairs', R.length, 'bi-tools', ''], ['In Progress', act.length, 'bi-wrench-adjustable', 'info'], ['Ready for Collection', ready, 'bi-bag-check-fill', 'ok'], ['Delivery on the way', deliv, 'bi-truck', 'warn'], ['Completed', live.filter(r => r.status === 'Completed').length, 'bi-check-circle-fill', 'ok']];
    $('#custKpis').innerHTML = cards.map(k => `<div class="col-6 col-lg"><article class="card-v lift kpi-card t-${k[3] || 'accent'}"><div class="kpi-top"><span class="kpi-label">${k[0]}</span><span class="kpi-ico ${k[3]}"><i class="bi ${k[2]}"></i></span></div><div class="kpi-value num">${k[1]}</div></article></div>`).join('');
    const present = R_STATUS.filter(s => R.some(r => r.status === s)), cols = ['#94a3b8', '#f59e0b', '#3b82f6', '#fb923c', '#60a5fa', CHART_COLORS.accent, '#ef4444', '#a78bfa', '#16a34a', '#64748b'];
    if (R.length) Charts.make('cCust', 'doughnut', present, [{ data: present.map(s => R.filter(r => r.status === s).length), backgroundColor: present.map(s => cols[R_STATUS.indexOf(s)]), borderWidth: 2, borderColor: cssv('--card') }]);
    $('#custList').innerHTML = R.length ? R.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(r => `<a class="d-block text-reset text-decoration-none py-2 border-bottom" href="repairs.html?id=${r.id}">
      <div class="d-flex flex-wrap justify-content-between gap-2"><span><b>${esc(r.id)}</b> · ${esc(r.req.serviceName)}</span>${rBadge(r.status)}</div>
      <div class="small mu">${esc(deviceLabel(r))} · ${r.due ? 'Estimated completion ' + fmtShort(r.due) : 'Waiting for manager review'}</div>
      ${['Cancelled'].includes(r.status) ? '' : `<div class="pbar mt-2"><span style="width:${r.progress || 0}%"></span></div>`}</a>`).join('') : emptyState('bi-tools', 'No repairs yet', 'Requests you submit with your email or phone number appear here.');
  }
  draw(); Sync.watch(draw); Motion.page();
}

const _dashOk = layout('dashboard', { title: 'Dashboard' });
if (_dashOk && isCustomer()) customerDash();
else if (_dashOk) {
  const me = session(), admin = isAdmin();
  const F = { days: 30, staff: admin ? '' : me.staffId, status: '' };

  /* ----- greeting + quick actions ----- */
  const h = new Date().getHours();
  $('#greet').textContent = `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}, ${me.name.split(' ')[0]}`;
  $('#heroActions').innerHTML = admin
    ? `<a class="btn btn-v" href="repairs.html"><i class="bi bi-tools"></i> Repair requests</a><a class="btn btn-o" href="tasks.html?new=1"><i class="bi bi-plus-lg"></i> New task</a><a class="btn btn-o" href="staff.html?new=1"><i class="bi bi-person-plus"></i> Add staff</a><a class="btn btn-o" href="schedule.html"><i class="bi bi-calendar3"></i> Schedule</a>`
    : `<a class="btn btn-v" href="tasks.html"><i class="bi bi-check2-square"></i> My tasks</a><a class="btn btn-o" href="services.html"><i class="bi bi-tools"></i> Services</a><a class="btn btn-o" href="schedule.html"><i class="bi bi-calendar3"></i> My schedule</a>`;
  { const open = visibleTasks().filter(t => statusOf(t) !== 'Completed');
    const over = open.filter(t => statusOf(t) === 'Overdue').length, soon = open.filter(t => t.due >= today() && t.due <= day(7)).length;
    $('#greetSub').textContent = `${new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${over} overdue · ${soon} due in the next 7 days`; }

  /* ----- filters ----- */
  const sel = $('#fStaff');
  if (admin) sel.innerHTML = '<option value="">All staff</option>' + getStaff().map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  else $('#fStaffWrap').classList.add('d-none');
  const bind = () => { F.days = +$('#fPeriod').value; F.staff = admin ? sel.value : me.staffId; F.status = $('#fStatus').value; draw(false); };
  ['fPeriod', 'fStaff', 'fStatus'].forEach(id => $('#' + id).addEventListener('change', bind));
  $('#fReset').onclick = () => { $('#fPeriod').value = '30'; sel.value = ''; $('#fStatus').value = ''; bind(); };

  const periodText = () => F.days ? `last ${F.days} days` : 'all time';
  const link = (q) => `tasks.html?${new URLSearchParams(q)}`;

  /* ----- KPI cards ----- */
  function kpis(set) {
    const c = s => set.filter(t => statusOf(t) === s).length;
    const total = set.length, done = c('Completed'), rate = total ? Math.round(done / total * 100) : 0;
    const exp = getExpenses().filter(e => !F.days || e.date >= day(-(F.days - 1)));
    const cards = [
      ['Active Tasks', c('Pending') + c('In Progress') + c('Overdue'), 'bi-lightning-charge-fill', '', `${c('In Progress')} in progress`, '', link({ status: 'In Progress' })],
      ['Completed', done, 'bi-check-circle-fill', 'ok', `${rate}% of ${periodText()}`, '', link({ status: 'Completed' })],
      ['Pending', c('Pending'), 'bi-hourglass-split', 'warn', 'Not started yet', '', link({ status: 'Pending' })],
      ['Overdue', c('Overdue'), 'bi-exclamation-triangle-fill', 'danger', c('Overdue') ? 'Need attention' : 'Nothing overdue', '', link({ status: 'Overdue' })]
    ];
    const extra = [];
    if (admin) extra.push(['Total Tasks', total, 'bi-list-task', 'info', `${periodText()}`, '', 'tasks.html']);
    if (admin) {
      const st = getStaff();
      extra.push(['Total Staff', st.length, 'bi-people-fill', 'info', `${st.filter(s => s.status === 'Active').length} active · ${st.filter(s => s.status === 'On Leave').length} on leave`, '', 'staff.html']);
    }
    extra.push(['Completion Rate', rate, 'bi-pie-chart-fill', '', `${done} of ${total} tasks`, 'ring', 'reports.html', '%']);
    if (admin) { const mo = getExpenses().filter(e => monthKey(e.date) === addMonths(0)); extra.push(['Monthly Store Expenses', sum(mo.map(e => e.amt)), 'bi-wallet2', 'warn', `${RM(sum(mo.filter(e => e.status === 'Pending').map(e => e.amt)))} still pending`, '', 'finance.html', '', 'RM ']); }
    const card = (k, i, big) => `<div class="${big ? 'col-6 col-xl-3' : 'col-12 col-sm-6 col-lg-3'}"><a href="${k[6]}" class="text-decoration-none text-reset d-block h-100"><article class="card-v lift kpi-card t-${k[3] || 'accent'}" data-anim="kpi">
      <div class="kpi-top"><span class="kpi-label">${k[0]}</span><span class="kpi-ico ${k[3]}"><i class="bi ${k[2]}"></i></span></div>
      <div class="kpi-value num"><span data-count="${k[1]}" data-prefix="${k[8] || ''}" data-suffix="${k[7] || ''}">${k[8] || ''}${k[1]}${k[7] || ''}</span></div>
      ${k[5] === 'ring' ? `<div class="pbar accent mt-1"><span data-progress="${k[1]}" style="width:${k[1]}%"></span></div>` : ''}
      <div class="kpi-sub">${k[4]}</div></article></a></div>`;
    $('#kpis').innerHTML = cards.map((k, i) => card(k, i, true)).join('') + extra.map(k => card(k, 0, false)).join('');
  }

  /* ----- charts ----- */
  function charts(set) {
    const base = visibleTasks().filter(t => !F.staff || t.staff === F.staff);
    const days = F.days || 90, win = day(-(days - 1));
    // Trend: completed by completion date vs assigned by start date
    const done = bucketCounts(base.filter(t => t.status === 'Completed'), 'done', days), made = bucketCounts(base, 'start', days);
    const lab = done.labels.map(d => done.step > 1 ? 'Wk ' + fmtShort(d) : fmtShort(d));
    $('#trendSub').textContent = `Tasks completed vs. assigned per ${done.step > 1 ? 'week' : 'day'}${F.staff ? ' for ' + staffName(F.staff) : ''}`;
    Charts.make('cTrend', 'line', lab, [
      { label: 'Completed', data: done.values, borderColor: CHART_COLORS.accent, backgroundColor: 'rgba(' + cssv('--accent-rgb') + ',.14)', fill: true, tension: .3, cubicInterpolationMode: 'monotone', pointRadius: days > 31 ? 3 : 2, borderWidth: 2.5 },
      { label: 'Assigned', data: made.values, borderColor: CHART_COLORS.slate, borderDash: [5, 4], tension: .3, cubicInterpolationMode: 'monotone', pointRadius: 0, borderWidth: 2 }
    ], { xTitle: done.step > 1 ? 'Week starting' : 'Date', yTitle: 'Number of tasks' });

    // Status doughnut (click a segment to drill down)
    const counts = STATUSES.map(s => set.filter(t => statusOf(t) === s).length);
    Charts.make('cStatus', 'doughnut', STATUSES, [{ data: counts, backgroundColor: [CHART_COLORS.warn, CHART_COLORS.info, CHART_COLORS.ok, CHART_COLORS.danger], borderWidth: 2, borderColor: cssv('--card') }],
      { onPick: (i, l) => { location.href = link({ status: l, ...(F.staff && admin ? { staff: F.staff } : {}) }); } });

    // Staff performance (admin) or own priority mix (staff)
    if (admin) {
      const staff = getStaff().filter(s => s.status !== 'Inactive' && (!F.staff || s.id === F.staff));
      const forStaff = s => set.filter(t => t.staff === s.id);
      Charts.make('cPerf', 'bar', staff.map(s => s.name.split(' ')[0]), [
        { label: 'Completed', data: staff.map(s => forStaff(s).filter(t => statusOf(t) === 'Completed').length), backgroundColor: CHART_COLORS.accent, borderRadius: 6 },
        { label: 'Still open', data: staff.map(s => forStaff(s).filter(t => statusOf(t) !== 'Completed').length), backgroundColor: '#cbd5e1', borderRadius: 6 }
      ], { indexAxis: 'y', xTitle: 'Number of tasks', onPick: i => { location.href = link({ staff: staff[i].id }); },
        extra: { scales: { x: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Number of tasks' } }, y: { grid: { display: false } } } } });
    } else {
      $('#perfTitle').textContent = 'My Tasks by Priority'; $('#perfSub').textContent = 'How my workload is spread';
      Charts.make('cPerf', 'doughnut', PRI, [{ data: PRI.map(p => set.filter(t => t.pri === p).length), backgroundColor: [CHART_COLORS.danger, CHART_COLORS.warn, CHART_COLORS.slate], borderWidth: 2, borderColor: cssv('--card') }]);
    }

    // Monthly expenses vs budget (admin) or my progress by task (staff)
    if (admin) {
      const months = [-5, -4, -3, -2, -1, 0].map(addMonths), ex = getExpenses(), bud = getBudget();
      Charts.make('cFourth', 'bar', months.map(monthLabel), [
        { type: 'bar', label: 'Expenses', data: months.map(m => sum(ex.filter(e => monthKey(e.date) === m).map(e => e.amt))), backgroundColor: months.map(m => sum(ex.filter(e => monthKey(e.date) === m).map(e => e.amt)) > bud ? CHART_COLORS.danger : CHART_COLORS.accent), borderRadius: 6 },
        { type: 'line', label: 'Monthly budget', data: months.map(() => bud), borderColor: CHART_COLORS.warn, borderDash: [6, 4], pointRadius: 0, borderWidth: 2 }
      ], { yTitle: 'Amount (RM)', xTitle: 'Month', legend: true, yFormat: v => 'RM ' + v.toLocaleString(), onPick: i => { location.href = 'finance.html?month=' + months[i]; },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${RM(c.parsed.y)}` } } });
    } else {
      $('#fourthTitle').textContent = 'My Open Tasks'; $('#fourthSub').textContent = 'Progress of tasks still in the queue';
      const open = set.filter(t => statusOf(t) !== 'Completed').slice(0, 8);
      Charts.make('cFourth', 'bar', open.map(t => t.title.length > 18 ? t.title.slice(0, 17) + '…' : t.title), [{ label: 'Progress %', data: open.map(t => t.progress), backgroundColor: CHART_COLORS.info, borderRadius: 6 }],
        { indexAxis: 'y', legend: false, extra: { scales: { x: { min: 0, max: 100, title: { display: true, text: 'Progress (%)' } }, y: { grid: { display: false } } } }, onPick: i => { location.href = 'task-detail.html?id=' + open[i].id; } });
    }
  }

  /* ----- repair operations (admin) + my assigned repairs (staff) ----- */
  const repLink = q => `repairs.html?${new URLSearchParams(q)}`;
  function repairSet() { return repairs().filter(r => !F.staff || r.staff === F.staff); }
  function repairKpis() {
    if (!admin) return;
    $('#repairKpiSec').classList.remove('d-none'); $('#repairChartSec').classList.remove('d-none');
    const set = repairSet(), win = F.days ? day(-(F.days - 1)) : '0000-00-00', st = repairStats(set);
    const doneIn = set.filter(r => r.status === 'Completed' && (r.completedAt || '') >= win).length, newIn = set.filter(r => ['New Request', 'Under Review'].includes(r.status)).length;
    $('#rkNote').textContent = `Follows the Staff filter; "Completed" follows the Period (${periodText()}).`;
    const cards = [['Active Repairs', st.active, 'bi-wrench-adjustable', '', `${st.overdue} overdue`, '', repLink({ status: '' })], ['New Repair Requests', newIn, 'bi-inbox-fill', 'warn', 'Waiting for review', '', repLink({ status: 'New Request' })],
      ['Repairs In Progress', st.working, 'bi-tools', 'info', 'Being repaired now', '', repLink({ status: 'In Progress' })], ['Completed Repairs', doneIn, 'bi-check-circle-fill', 'ok', periodText(), '', repLink({ status: 'Completed' })],
      ['Ready for Collection', st.ready, 'bi-bag-check-fill', 'ok', 'Customer has not collected', '', repLink({ status: 'Completed' })], ['Pending Deliveries', st.deliveries, 'bi-truck', 'warn', 'Delivery not yet complete', '', repLink({ status: 'Completed' })]];
    $('#repairKpis').innerHTML = cards.map(k => `<div class="col-6 col-md-4 col-xl-2"><a href="${k[6]}" class="text-decoration-none text-reset d-block h-100"><article class="card-v lift kpi-card t-${k[3] || 'accent'}" data-anim="kpi">
      <div class="kpi-top"><span class="kpi-label">${k[0]}</span><span class="kpi-ico ${k[3]}"><i class="bi ${k[2]}"></i></span></div><div class="kpi-value num"><span data-count="${k[1]}">${k[1]}</span></div><div class="kpi-sub">${k[4]}</div></article></a></div>`).join('');
  }
  function repairCharts() {
    if (!admin) return;
    const set = repairSet().filter(r => r.status !== 'Cancelled' || true), cats = getSvCats(), live = set.filter(r => r.status !== 'Cancelled');
    const catOf = r => (r.svc || {}).cat || 'other';
    Charts.make('cRCat', 'bar', cats.map(c => c.short), [{ label: 'Requests', data: cats.map(c => live.filter(r => catOf(r) === c.id).length), backgroundColor: CHART_COLORS.accent, borderRadius: 6 }], { legend: false, yTitle: 'Repair requests', xTitle: 'Category', onPick: () => { location.href = 'repairs.html'; }, extra: { scales: { x: { grid: { display: false }, ticks: { maxRotation: 40, minRotation: 0, autoSkip: false, font: { size: 10 } } }, y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Repair requests' } } } } });
    const stColors = ['#94a3b8', '#f59e0b', '#3b82f6', '#fb923c', '#60a5fa', CHART_COLORS.accent, '#ef4444', '#a78bfa', '#16a34a', '#64748b'];
    const cnt = R_STATUS.map(s => set.filter(r => r.status === s).length), keep = R_STATUS.map((s, i) => i).filter(i => cnt[i]);
    Charts.make('cRStatus', 'doughnut', keep.map(i => R_STATUS[i]), [{ data: keep.map(i => cnt[i]), backgroundColor: keep.map(i => stColors[i]), borderWidth: 2, borderColor: cssv('--card') }], { onPick: (i, l) => { location.href = repLink({ status: l }); } });
    const months = [-5, -4, -3, -2, -1, 0].map(addMonths);
    Charts.make('cRMonth', 'bar', months.map(monthLabel), [{ label: 'Completed repairs', data: months.map(m => set.filter(r => r.status === 'Completed' && r.completedAt && monthKey(r.completedAt) === m).length), backgroundColor: CHART_COLORS.ok, borderRadius: 6 }], { legend: false, yTitle: 'Repairs completed', xTitle: 'Month' });
    const techs = getStaff().filter(s => repairs().some(r => r.staff === s.id) && (!F.staff || s.id === F.staff)), rs = techs.map(s => repairStaffStats(s.id));
    Charts.make('cRStaff', 'bar', techs.map(s => s.name.split(' ')[0]), [{ label: 'Completed', data: rs.map(x => x.completed), backgroundColor: CHART_COLORS.ok, borderRadius: 4 }, { label: 'In progress', data: rs.map(x => x.working), backgroundColor: CHART_COLORS.info, borderRadius: 4 }, { label: 'Not started', data: rs.map(x => x.pending), backgroundColor: CHART_COLORS.warn, borderRadius: 4 }, { label: 'Overdue', data: rs.map(x => x.overdue), backgroundColor: CHART_COLORS.danger, borderRadius: 4 }],
      { yTitle: 'Repair jobs', xTitle: 'Technician', onPick: i => { location.href = 'repairs.html'; }, extra: { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Repair jobs' } } } } });
    const done = live.filter(r => r.status === 'Completed' && r.completedAt && r.start), avg = c => { const l = done.filter(r => catOf(r) === c.id); return l.length ? +(sum(l.map(r => Math.max(0, diffDays(r.completedAt, r.start)))) / l.length).toFixed(1) : null; };
    const have = cats.map(c => [c, avg(c)]).filter(x => x[1] !== null);
    $('#rAvgSub').textContent = done.length >= 3 ? `Average days from start to completion (${done.length} completed repairs)` : 'Not enough completed repairs yet for a reliable average';
    if (done.length >= 3) Charts.make('cRAvg', 'bar', have.map(x => x[0].short), [{ label: 'Average days', data: have.map(x => x[1]), backgroundColor: CHART_COLORS.accent2, borderRadius: 6 }], { legend: false, indexAxis: 'y', extra: { scales: { x: { beginAtZero: true, title: { display: true, text: 'Days' } }, y: { grid: { display: false } } } } });
    else { const c = $('#cRAvg').getContext('2d'); c.clearRect(0, 0, 999, 999); }
  }
  function myRepairs() {
    if (admin) return;
    const mine = repairs().filter(r => r.staff === me.staffId && R_ACTIVE.includes(r.status)).sort((a, b) => (a.due || '').localeCompare(b.due || ''));
    $('#myRepairsSec').classList.remove('d-none');
    $('#myRepairs').innerHTML = mine.length ? mine.map(r => `<div class="col-md-6 col-xl-4"><div class="rp-sec mb-0 h-100 d-flex flex-column gap-1"><div class="d-flex justify-content-between align-items-start gap-2"><b>${esc(r.id)}</b>${rBadge(r.status)}</div>
      <div class="small mu">Service</div><div class="fw-semibold">${esc(r.req.serviceName)}</div><div class="small mu mt-1">Device</div><div>${esc(deviceLabel(r))}</div>
      <div class="d-flex gap-3 mt-1 small"><span>${priTag(r.priority)}</span><span class="${isRepairOverdue(r) ? 'text-danger fw-semibold' : ''}">Due ${fmtShort(r.due)}</span></div>
      <div class="pbar mt-2"><span style="width:${r.progress}%"></span></div>
      <div class="d-flex gap-2 mt-auto pt-2"><a class="btn btn-o btn-sm flex-fill" href="task-detail.html?id=${r.taskId}">View Task</a>${r.status === 'Assigned' ? `<button class="btn btn-v btn-sm flex-fill" data-start="${r.id}"><i class="bi bi-play-fill"></i> Start Repair</button>` : ''}</div></div></div>`).join('')
      : `<div class="col-12">${emptyState('bi-tools', 'No repairs assigned', 'Repairs assigned to you by the manager will appear here.')}</div>`;
  }
  $('#myRepairs').onclick = e => { const b = e.target.closest('[data-start]'); if (!b) return; updateRepair(b.dataset.start, { status: 'In Progress' }); toast('✓ Repair started. The manager can see the update.'); draw(false); };

  /* ----- activity + upcoming ----- */
  function lists(set) {
    const overdue = set.filter(t => statusOf(t) === 'Overdue').length;
    const act = store.get('activity', []).filter(a => admin || a.staffId === me.staffId).slice(0, 6);
    const dot = { completed: ['ok', 'bi-check-lg'], created: ['info', 'bi-plus-lg'], progress: ['', 'bi-arrow-repeat'], overdue: ['danger', 'bi-exclamation'], info: ['', 'bi-info'] };
    const items = (overdue ? [{ type: 'overdue', text: `${overdue} task${overdue > 1 ? 's are' : ' is'} overdue`, ts: new Date().toISOString(), live: true }] : []).concat(act).slice(0, 7);
    $('#activity').innerHTML = items.length ? items.map(a => { const d = dot[a.type] || dot.info;
      return `<li><span class="tl-dot ${d[0]}"><i class="bi ${d[1]}"></i></span>${a.taskId ? `<a href="task-detail.html?id=${a.taskId}" class="text-reset">${esc(a.text)}</a>` : esc(a.text)}<small>${a.live ? 'Right now' : relTime(a.ts)}</small></li>`; }).join('')
      : emptyState('bi-clock-history', 'No activity yet', 'Updates will appear here as tasks change.');
    const up = visibleTasks().filter(t => statusOf(t) !== 'Completed' && (!F.staff || t.staff === F.staff)).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);
    const rel = t => { const d = diffDays(t.due, today()); return d < 0 ? `<span class="text-danger fw-semibold">${fmtShort(t.due)} (${-d}d late)</span>` : d === 0 ? '<b>Today</b>' : `${fmtShort(t.due)} (${d}d)`; };
    $('#upcoming').innerHTML = up.length ? up.map(t => `<tr><td><a class="t-title" href="task-detail.html?id=${t.id}">${esc(t.title)}</a><div class="small mu">${priTag(t.pri)}</div></td><td class="hide-sm">${esc(firstName(t.staff))}</td><td class="text-nowrap">${rel(t)}</td><td>${badge(statusOf(t))}</td></tr>`).join('')
      : `<tr><td colspan="4">${emptyState('bi-check2-all', 'No upcoming tasks', 'Everything is up to date.')}</td></tr>`;
  }

  function draw(first) {
    const set = filterTasks(F);
    kpis(set); repairKpis(); charts(set); repairCharts(); myRepairs(); lists(set);
    if (first) Motion.page(); else { Motion.counters($('#kpis'), .6); Motion.progress($('#kpis')); }
  }
  draw(true);
  Sync.watch(() => draw(false));   // near-real-time: picks up repair / task changes made in another tab or by the technician
}
