/* ==========================================================================
   VOLTORA - Staff profile / "My Performance"
   Admins can open any profile; staff can only open their own.
   ========================================================================== */
const _me = session();
if (layout('staff', { title: _me && _me.role === 'staff' ? 'My Performance' : 'Staff Profile' })) {
  const me = session(), admin = isAdmin();
  const id = qs().get('id') || me.staffId, s = staffById(id), allowed = s && (admin || id === me.staffId);
  $('#crumbList').innerHTML = admin
    ? '<li class="breadcrumb-item"><a href="dashboard.html">Home</a></li><li class="breadcrumb-item"><a href="staff.html">Staff</a></li><li class="breadcrumb-item active" aria-current="page">Staff Profile</li>'
    : '<li class="breadcrumb-item"><a href="dashboard.html">Home</a></li><li class="breadcrumb-item active" aria-current="page">My Performance</li>';

  if (!allowed) {
    $('#notFound').classList.remove('d-none');
    $('#notFound').innerHTML = emptyState('bi-person-x', 'Profile not available', s ? 'You can only view your own profile.' : 'This staff member does not exist.') + `<div class="text-center"><a class="btn btn-v" href="${admin ? 'staff.html' : 'dashboard.html'}">Go back</a></div>`;
    Motion.page();
  } else {
    $('#profile').classList.remove('d-none');
    const tasks = getTasks().filter(t => t.staff === id), st = staffStats(id);
    $('#pAvatar').innerHTML = avatar(s.name, s.id, 'av-lg'); $('#pName').textContent = s.name; $('#pPos').textContent = s.pos; $('#pStatus').innerHTML = badge(s.status);
    $('#pId').innerHTML = `<i class="bi bi-person-badge me-1"></i>${esc(s.id)}`; $('#pEmail').innerHTML = `<i class="bi bi-envelope me-1"></i>${esc(s.email)}`; $('#pPhone').innerHTML = `<i class="bi bi-telephone me-1"></i>${esc(s.phone || 'No number')}`;
    if (admin) $('#pActions').innerHTML = `<a class="btn btn-v" href="tasks.html?new=1&staff=${s.id}"><i class="bi bi-plus-lg"></i> Assign task</a><a class="btn btn-o" href="staff.html"><i class="bi bi-arrow-left"></i> Back</a>`;
    else { $('#pActions').innerHTML = '<a class="btn btn-o" href="settings.html"><i class="bi bi-gear"></i> Settings</a>'; }
    $('#allTasks').href = admin ? `tasks.html?staff=${id}` : 'tasks.html';

    /* statistics */
    const cards = [['Total Tasks', st.total, 'bi-list-task', ''], ['Completed', st.completed, 'bi-check-circle-fill', 'ok'], ['Pending', st.pending + st.inProgress, 'bi-hourglass-split', 'warn', `${st.inProgress} in progress`], ['Overdue', st.overdue, 'bi-exclamation-triangle-fill', 'danger'], ['Completion Rate', st.rate, 'bi-pie-chart-fill', '', `${st.completed} of ${st.total} done`, '%']];
    $('#stats').innerHTML = cards.map(c => `<div class="col-6 col-lg"><article class="card-v lift kpi-card t-${c[3] || 'accent'}" data-anim="kpi"><div class="kpi-top"><span class="kpi-label">${c[0]}</span><span class="kpi-ico ${c[3]}"><i class="bi ${c[2]}"></i></span></div>
      <div class="kpi-value num"><span data-count="${c[1]}" data-suffix="${c[5] || ''}">${c[1]}${c[5] || ''}</span></div>${c[0] === 'Completion Rate' ? `<div class="pbar accent mt-1"><span data-progress="${c[1]}" style="width:${c[1]}%"></span></div>` : ''}<div class="kpi-sub">${c[4] || '&nbsp;'}</div></article></div>`).join('');

    /* repair jobs (also counted once in the task totals above, because every repair is one task) */
    { const rs = repairStaffStats(id), recent = repairs().filter(r => r.staff === id && r.status !== 'Cancelled').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 4);
      if (rs.assigned) $('#stats').insertAdjacentHTML('afterend', `<section class="card-v mb-3" aria-labelledby="rjH"><div class="card-head"><h2 class="card-title" id="rjH"><i class="bi bi-tools me-2"></i>Repair jobs</h2><small class="mu">Included in the task totals above, shown separately for information</small></div>
        <div class="row g-3 text-center mb-3">${[['Assigned', rs.assigned], ['Completed', rs.completed], ['Pending', rs.pending + rs.working], ['Overdue', rs.overdue], ['Completion', rs.rate + '%']].map(x => `<div class="col"><div class="fw-bold fs-4">${x[1]}</div><small class="mu">${x[0]}</small></div>`).join('')}</div>
        <ul class="list-unstyled mb-0">${recent.map(r => `<li class="d-flex flex-wrap justify-content-between gap-2 py-2 border-top"><span><b>${esc(r.id)}</b> · ${esc(r.req.serviceName)}</span>${rBadge(r.status)}</li>`).join('')}</ul></section>`); }

    /* current tasks */
    const open = tasks.filter(t => statusOf(t) !== 'Completed').sort((a, b) => a.due.localeCompare(b.due));
    $('#current').innerHTML = open.length ? `<div class="table-wrap"><table class="table table-v"><thead><tr><th>Task</th><th>Due</th><th>Progress</th><th>Status</th></tr></thead><tbody>${open.map(t => `<tr><td><a class="t-title" href="task-detail.html?id=${t.id}">${esc(t.title)}</a></td><td class="text-nowrap">${fmtShort(t.due)}</td><td>${progressCell(t)}</td><td>${badge(statusOf(t))}</td></tr>`).join('')}</tbody></table></div>`
      : emptyState('bi-check2-all', 'No open tasks', 'All assigned tasks are complete.');

    /* weekly schedule (Mon-Sun) from the roster */
    const roster = store.get('roster', {})[id] || Array(7).fill('Off'), order = [1, 2, 3, 4, 5, 6, 0], names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], todayDow = new Date().getDay();
    $('#week').innerHTML = order.map(d => `<div class="col"><div class="text-center border rounded-3 p-2 ${d === todayDow ? 'border-2' : ''}" style="${d === todayDow ? 'border-color:var(--accent)!important;background:var(--accent-soft)' : ''}"><div class="small fw-bold ${d === todayDow ? 'text-primary' : 'mu'}">${names[d]}</div><span class="shift ${roster[d]} mt-1" style="min-width:0;width:100%">${roster[d]}</span><div class="small mu mt-1" style="font-size:.68rem">${SHIFT_TIME[roster[d]]}</div></div></div>`).join('');

    /* status chart + activity */
    Charts.make('cStatus', 'doughnut', STATUSES, [{ data: STATUSES.map(x => tasks.filter(t => statusOf(t) === x).length), backgroundColor: [CHART_COLORS.warn, CHART_COLORS.info, CHART_COLORS.ok, CHART_COLORS.danger], borderWidth: 2, borderColor: cssv('--card') }], { title: '' });
    const act = store.get('activity', []).filter(a => a.staffId === id).slice(0, 6);
    $('#activity').innerHTML = act.length ? act.map(a => `<li><span class="tl-dot ${a.type === 'completed' ? 'ok' : a.type === 'created' ? 'info' : ''}"><i class="bi ${a.type === 'completed' ? 'bi-check-lg' : a.type === 'created' ? 'bi-plus-lg' : 'bi-arrow-repeat'}"></i></span>${esc(a.text)}<small>${relTime(a.ts)}</small></li>`).join('') : emptyState('bi-clock-history', 'No recent activity', 'Updates will appear here.');
    Motion.page();
  }
}
