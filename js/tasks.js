/* ==========================================================================
   VOLTORA - Task management
   Table with search, filters, sort and pagination; add / edit / delete through
   modals. Admins manage every task; staff only update progress, status and
   remarks on their own tasks.
   ========================================================================== */
if (layout('tasks', { title: 'Task Management' })) {
  const me = session(), admin = isAdmin(), customer = isCustomer(), PER = 10;
  let page = 1;
  const modalEl = $('#taskModal'), modal = new bootstrap.Modal(modalEl);
  const opts = (arr, f) => arr.map(x => f ? `<option value="${esc(x[0])}">${esc(x[1])}</option>` : `<option>${esc(x)}</option>`).join('');

  /* ----- role-specific page copy + control population ----- */
  if (customer) { $('#pageH1').textContent = 'Task Management'; $('#pageSub').textContent = 'Read only: the tasks created for your repair requests. You can follow progress here but cannot edit.'; $('#fStaffWrap').classList.add('d-none'); $('#thStaff').classList.add('d-none'); }
  else if (!admin) { $('#pageH1').textContent = 'My Tasks'; $('#pageSub').textContent = 'Tasks assigned to you. Update progress and status as you work.'; $('#fStaffWrap').classList.add('d-none'); $('#thStaff').classList.add('d-none'); }
  else $('#addBtn').classList.remove('d-none');
  $('#fStaff').innerHTML = '<option value="">All staff</option>' + opts(getStaff().map(s => [s.id, s.name]), true);
  $('#fPri').innerHTML = '<option value="">All</option>' + opts(PRI); $('#fStatus').innerHTML = '<option value="">All</option>' + opts(STATUSES);
  $('#tCat').innerHTML = opts(CATS); $('#tPri').innerHTML = opts(PRI); $('#tStatus').innerHTML = opts(STORED_STATUS);
  $('#tStaff').innerHTML = '<option value="">Select staff</option>' + opts(getStaff().filter(s => s.status !== 'Inactive').map(s => [s.id, s.name]), true);

  /* preset filters from the URL (dashboard charts link here) */
  const P = qs(); if (P.get('status')) $('#fStatus').value = P.get('status'); if (P.get('staff') && admin) $('#fStaff').value = P.get('staff'); if (P.get('pri')) $('#fPri').value = P.get('pri'); if (P.get('q')) $('#q').value = P.get('q');

  /* ----- filtering / sorting ----- */
  function filtered() {
    const q = $('#q').value.trim().toLowerCase(), fs = $('#fStaff').value, fp = $('#fPri').value, fst = $('#fStatus').value, fd = $('#fDate').value, so = $('#fSort').value;
    const t0 = today(), monthStart = t0.slice(0, 8) + '01', monthEnd = t0.slice(0, 8) + '31';
    return visibleTasks().filter(t =>
      (!fs || t.staff === fs) && (!fp || t.pri === fp) && (!fst || statusOf(t) === fst) &&
      (!fd || (fd === 'today' && t.due === t0) || (fd === 'week' && t.due >= t0 && t.due <= day(7)) || (fd === 'month' && t.due >= monthStart && t.due <= monthEnd) || (fd === 'past' && t.due < t0)) &&
      (!q || `${t.id} ${t.title} ${customer ? '' : staffName(t.staff)} ${t.cat}`.toLowerCase().includes(q))
    ).sort((a, b) => (so === 'due' ? ((statusOf(a) === 'Completed') - (statusOf(b) === 'Completed')) : 0) || (so === 'pri' ? PRI.indexOf(a.pri) - PRI.indexOf(b.pri) : so === 'progress' ? b.progress - a.progress : so === 'title' ? a.title.localeCompare(b.title) : a.due.localeCompare(b.due)));
  }

  function render(first) {
    const list = filtered(), pg = paginate(list, page, PER); page = pg.page;
    $('#tbody').innerHTML = pg.items.length ? pg.items.map(t => `<tr>
      <td style="min-width:200px"><a class="t-title" href="task-detail.html?id=${t.id}">${esc(t.title)}</a><div class="small mu">${esc(t.id)} &middot; ${esc(t.cat)}${t.repairId ? ` &middot; <a href="${admin || customer ? 'repairs.html?id=' + t.repairId : 'task-detail.html?id=' + t.id}"><i class="bi bi-tools"></i> Repair ${esc(t.repairId)}</a>` : ''}</div><div class="small show-sm-only mt-1">Due ${fmtShort(t.due)} &middot; ${esc(t.pri)} &middot; ${t.progress}%</div><div class="show-sm-only mt-1">${badge(statusOf(t))}</div></td>
      ${admin ? `<td class="hide-md"><div class="cell-user">${avatar(staffName(t.staff), t.staff, 'av-sm')}<span>${esc(staffName(t.staff))}</span></div></td>` : ''}
      <td class="hide-sm">${priTag(t.pri)}</td><td class="hide-xl text-nowrap">${fmtDate(t.start)}</td><td class="text-nowrap hide-sm">${fmtDate(t.due)}</td>
      <td class="hide-sm">${progressCell(t)}</td><td class="hide-sm">${badge(statusOf(t))}</td>
      <td class="text-end text-nowrap">
        <a class="btn btn-o btn-icon btn-sm" href="task-detail.html?id=${t.id}" aria-label="View ${esc(t.title)}" title="View"><i class="bi bi-eye"></i></a>
        ${customer ? '' : `<button class="btn btn-o btn-icon btn-sm" data-edit="${t.id}" aria-label="${admin ? 'Edit' : 'Update'} ${esc(t.title)}" title="${admin ? 'Edit' : 'Update progress'}"><i class="bi bi-pencil"></i></button>`}
        ${admin && !t.repairId ? `<button class="btn btn-o btn-icon btn-sm danger" data-del="${t.id}" aria-label="Delete ${esc(t.title)}" title="Delete"><i class="bi bi-trash"></i></button>` : ''}
      </td></tr>`).join('')
      : `<tr><td colspan="8">${emptyState('bi-clipboard-x', 'No tasks found.', 'Try changing your search or filter.')}</td></tr>`;
    $('#pager').innerHTML = pagerHTML(pg, 'tasks');
    if (first) Motion.page(); else { Motion.rows($('#tbody')); Motion.progress($('#tbody')); }
  }
  ['q', 'fStaff', 'fPri', 'fStatus', 'fDate', 'fSort'].forEach(id => $('#' + id).addEventListener(id === 'q' ? 'input' : 'change', () => { page = 1; render(); }));
  $('#fReset').onclick = () => { ['q', 'fStaff', 'fPri', 'fStatus', 'fDate'].forEach(id => $('#' + id).value = ''); $('#fSort').value = 'due'; page = 1; render(); };
  $('#pager').onclick = e => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { page = +b.dataset.page; render(); } };

  /* ----- add / edit modal ----- */
  const field = id => $('#' + id);
  const lockFields = locked => ['tTitle', 'tCat', 'tDesc', 'tStaff', 'tPri', 'tStart', 'tDue'].forEach(id => field(id).disabled = locked);
  const clearInvalid = () => $$('.is-invalid', modalEl).forEach(el => el.classList.remove('is-invalid'));
  function openForm(t) {
    clearInvalid(); $('#taskForm').reset(); lockFields(!admin && !!t);
    $('#taskModalTitle').textContent = t ? (admin ? 'Edit task' : 'Update progress') : 'Add task';
    $('#tId').value = t ? t.id : '';
    field('tTitle').value = t ? t.title : ''; field('tCat').value = t ? t.cat : CATS[0]; field('tDesc').value = t ? t.desc : '';
    field('tStaff').value = t ? t.staff : (P.get('staff') || ''); field('tPri').value = t ? t.pri : 'Medium'; field('tStatus').value = t ? t.status : 'Pending';
    field('tStart').value = t ? t.start : today(); field('tDue').value = t ? t.due : day(3); field('tProg').value = t ? t.progress : 0; field('tRem').value = t ? t.remarks : '';
    $('#tProgOut').textContent = field('tProg').value + '%'; modal.show();
  }
  field('tProg').addEventListener('input', () => { $('#tProgOut').textContent = field('tProg').value + '%'; const v = +field('tProg').value; if (v === 100) field('tStatus').value = 'Completed'; else if (v > 0 && field('tStatus').value === 'Pending') field('tStatus').value = 'In Progress'; });
  field('tStatus').addEventListener('change', () => { if (field('tStatus').value === 'Completed') { field('tProg').value = 100; $('#tProgOut').textContent = '100%'; } });
  $('#addBtn').onclick = () => openForm(null);

  $('#tbody').onclick = async e => {
    const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
    if (ed) openForm(getTasks().find(t => t.id === ed.dataset.edit));
    if (dl) {
      const t = getTasks().find(x => x.id === dl.dataset.del);
      if (await confirmBox({ title: 'Delete this task?', body: `"${t.title}" will be permanently removed.`, okText: 'Delete task' })) { deleteTask(t.id); render(); toast('✓ Task deleted successfully.'); }
    }
  };

  $('#taskForm').addEventListener('submit', e => {
    e.preventDefault(); clearInvalid(); const id = $('#tId').value;
    const v = { title: field('tTitle').value.trim(), staff: field('tStaff').value, start: field('tStart').value, due: field('tDue').value };
    let ok = true; const bad = (el, msg) => { field(el).classList.add('is-invalid'); if (msg) $('#tDueErr').textContent = msg; ok = false; };
    if (admin || !id) {
      if (!v.title) bad('tTitle'); if (!v.staff) bad('tStaff'); if (!v.start) bad('tStart');
      if (!v.due) bad('tDue', 'Choose a due date.'); else if (v.start && v.due < v.start) bad('tDue', 'Due date cannot be before the start date.');
    }
    if (!ok) { toast('⚠ Unable to save task. Please check the required fields.', 'error'); return; }
    const patch = { status: field('tStatus').value, progress: +field('tProg').value, remarks: field('tRem').value.trim() };
    if (admin) Object.assign(patch, { title: v.title, cat: field('tCat').value, desc: field('tDesc').value.trim(), staff: v.staff, pri: field('tPri').value, start: v.start, due: v.due });
    if (id) { if (!saveTaskChange(id, patch)) { toast('⚠ Unable to save task.', 'error'); return; } }
    else createTask(patch);
    modal.hide(); render(); toast(id ? '✓ Task updated successfully.' : '✓ Task added successfully.');
  });

  $('#exportBtn').onclick = () => {
    const rows = filtered(); if (!rows.length) return toast('⚠ There are no tasks to export.', 'error');
    downloadCSV('voltora-tasks.csv', [['ID', 'Task', 'Category', 'Staff', 'Priority', 'Start', 'Due', 'Progress %', 'Status'], ...rows.map(t => [t.id, t.title, t.cat, staffName(t.staff), t.pri, t.start, t.due, t.progress, statusOf(t)])]);
  };

  render(true);
  if (admin && P.get('new')) openForm(null);
  if (admin && P.get('edit')) { const et = getTasks().find(x => x.id === P.get('edit')); if (et) openForm(et); }
}
