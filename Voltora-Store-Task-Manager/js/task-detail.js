/* ==========================================================================
   VOLTORA - Task detail page
   Read-only information plus progress / status / remarks updates.
   ========================================================================== */
if (layout('tasks', { title: 'Task Details' })) {
  const id = qs().get('id'), me = session(), admin = isAdmin(), customer = isCustomer();
  const task = () => getTasks().find(t => t.id === id);
  let t = task();
  const mine = t && (admin || (customer ? visibleTasks().some(x => x.id === id) : t.staff === me.staffId));

  if (!t || !mine) {
    $('#notFound').classList.remove('d-none');
    $('#notFound').innerHTML = emptyState('bi-search', 'Task not found', t ? (customer ? 'You can only open tasks of your own repairs.' : 'You can only open tasks assigned to you.') : 'It may have been deleted. Go back to the task list.') + '<div class="text-center"><a class="btn btn-v" href="tasks.html">Back to tasks</a></div>';
    Motion.page();
  } else {
    $('#detail').classList.remove('d-none');
    const isRep = !!t.repairId;
    $('#pStatus').innerHTML = (isRep ? R_STAFF_STATUS : STORED_STATUS).map(s => `<option>${s}</option>`).join('');
    if (isRep && admin) { $('#delBtn').classList.add('d-none'); $('#editBtn').href = 'repairs.html?id=' + t.repairId; $('#editBtn').innerHTML = '<i class="bi bi-tools"></i> Manage repair'; }
    if (customer) {   // read only: no progress sliders, no remarks, no save buttons
      $('#pRange').disabled = true; $('#pStatus').disabled = true; $('#saveProg').classList.add('d-none');
      $('#saveRem').closest('.card-v').classList.add('d-none');
    }
    if (admin) { $('#editBtn').classList.remove('d-none'); $('#editBtn').href = `tasks.html?edit=${id}`; $('#delBtn').classList.remove('d-none'); }

    function render() {
      t = task(); const st = statusOf(t), left = diffDays(t.due, today());
      $('#dTitle').textContent = t.title;
      $('#dBadges').innerHTML = `${badge(st)} ${priTag(t.pri)}`;
      $('#dMeta').textContent = `${t.id} · ${t.cat}`;
      const who = admin ? `<a href="staff-profile.html?id=${t.staff}">${esc(staffName(t.staff))}</a>` : customer ? 'Voltora technician team' : esc(staffName(t.staff));
      $('#dInfo').innerHTML = [
        ['Description', esc(t.desc) || '<span class="mu">No description.</span>'], ['Assigned staff', customer ? who : `<span class="cell-user">${avatar(staffName(t.staff), t.staff, 'av-sm')}${who}</span>`],
        ['Category', esc(t.cat)], ['Priority', priTag(t.pri)], ['Start date', fmtDate(t.start)], ['Due date', fmtDate(t.due)],
        ['Status', badge(st)], ['Completed on', t.done ? fmtDate(t.done) : '<span class="mu">Not completed yet</span>']
      ].map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('');
      $('#remarks').value = t.remarks || '';
      $('#pRange').value = t.progress; $('#pOut').textContent = t.progress + '%';
      if (t.repairId) { const r = repairById(t.repairId); $('#pStatus').value = R_STAFF_STATUS.includes(r.status) ? r.status : 'In Progress'; renderRepair(r); } else $('#pStatus').value = t.status;
      $('#ringVal').textContent = t.progress + '%';
      const arc = $('#ringArc'); arc.dataset.ring = t.progress; arc.style.strokeDashoffset = 251.33 * (1 - t.progress / 100); arc.style.stroke = { Completed: CHART_COLORS.ok, Overdue: CHART_COLORS.danger, Pending: CHART_COLORS.warn }[st] || CHART_COLORS.info;
      const bar = $('#dBar'); bar.className = 'pbar ' + barTone(st); $('#dBar span').dataset.progress = t.progress; $('#dBar span').style.width = t.progress + '%';
      $('#dueNote').innerHTML = st === 'Completed' ? `<i class="bi bi-check-circle-fill text-success"></i> Completed ${fmtDate(t.done)}` : left < 0 ? `<span class="text-danger fw-semibold"><i class="bi bi-exclamation-triangle-fill"></i> ${-left} day${-left > 1 ? 's' : ''} overdue</span>` : left === 0 ? '<b>Due today</b>' : `${left} day${left > 1 ? 's' : ''} left`;
      const hist = store.get('activity', []).filter(a => a.taskId === t.id).slice(0, 6);
      $('#dHistory').innerHTML = hist.length ? hist.map(a => `<li><span class="tl-dot ${a.type === 'completed' ? 'ok' : a.type === 'created' ? 'info' : ''}"><i class="bi ${a.type === 'completed' ? 'bi-check-lg' : a.type === 'created' ? 'bi-plus-lg' : 'bi-arrow-repeat'}"></i></span>${esc(a.text)}<small>${relTime(a.ts)}</small></li>`).join('') : emptyState('bi-clock-history', 'No activity yet', 'Updates to this task will appear here.');
    }
    /* Repair tasks: extra information + "Start repair" shortcut. The status select writes the REPAIR status (task follows). */
    function renderRepair(r) {
      $('#repairPanel').classList.remove('d-none'); $('#repBadge').innerHTML = rBadge(r.status);
      $('#repInfo').innerHTML = [['Repair ID', `<b>${esc(r.id)}</b>`], ['Customer', `${esc(r.req.name)} · ${esc(r.req.phone)}`], ['Device', `${esc(r.req.deviceCat)} · ${esc(deviceLabel(r))}`], ['Repair service', esc(r.req.serviceName)],
        ['Problem description', esc(r.req.problem)], ['Estimated duration', esc(r.estDuration || '-')], ['Assigned technician', customer ? 'Voltora technician team' : esc(staffName(r.staff))], ['Fulfilment', `${r.ful.method === 'pickup' ? 'Store collection' : 'Delivery'} · <span class="mu">${esc(r.ful.status)}</span>`]].map(x => `<dt>${x[0]}</dt><dd>${x[1]}</dd>`).join('');
      $('#repActions').innerHTML = (r.status === 'Assigned' && !customer ? '<button class="btn btn-v btn-sm" id="startRep"><i class="bi bi-play-fill"></i> Start repair</button>' : '') + (admin || customer ? `<a class="btn btn-o btn-sm" href="repairs.html?id=${r.id}">Open in Repair Management</a>` : '');
      const sb = $('#startRep'); if (sb) sb.onclick = () => { updateRepair(r.id, { status: 'In Progress' }); render(); toast('✓ Repair started. The manager can see the update.'); };
    }
    render(); Motion.page();

    $('#pRange').addEventListener('input', e => { const v = +e.target.value; $('#pOut').textContent = v + '%'; if (v === 100) $('#pStatus').value = 'Completed'; else if (v > 0 && $('#pStatus').value === 'Pending') $('#pStatus').value = 'In Progress'; });
    $('#pStatus').addEventListener('change', e => { if (e.target.value === 'Completed') { $('#pRange').value = 100; $('#pOut').textContent = '100%'; } });
    $('#saveProg').onclick = () => {
      const ok = t.repairId ? updateRepair(t.repairId, { status: $('#pStatus').value, progress: +$('#pRange').value }) : saveTaskChange(id, { status: $('#pStatus').value, progress: +$('#pRange').value });
      if (!ok) return toast('⚠ Unable to save the update.', 'error');
      render(); Motion.progress($('#detail')); Motion.pulse($('.ring')); toast('✓ Task updated successfully.');
    };
    $('#saveRem').onclick = () => { if (!saveTaskChange(id, { remarks: $('#remarks').value.trim(), status: t.status, progress: t.progress })) return toast('⚠ Unable to save remarks.', 'error'); toast('✓ Remarks saved successfully.'); };
    $('#delBtn').onclick = async () => {
      if (await confirmBox({ title: 'Delete this task?', body: `"${t.title}" will be permanently removed.`, okText: 'Delete task' })) { deleteTask(id); flash('Task deleted successfully.', 'success'); location.href = 'tasks.html'; }
    };
  }
}
