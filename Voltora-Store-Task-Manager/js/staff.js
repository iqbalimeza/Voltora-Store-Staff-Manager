/* ==========================================================================
   VOLTORA - Staff management (admin only)
   Searchable / filterable staff table with add, edit, view and delete.
   Adding staff also creates a login (demo password) so the role system can be tested.
   ========================================================================== */
if (layout('staff', { title: 'Staff Management', roles: ['admin'] })) {
  const me = session(), PER = 10; let page = 1;
  const modalEl = $('#staffModal'), modal = new bootstrap.Modal(modalEl);
  const opts = a => a.map(x => `<option>${esc(x)}</option>`).join('');
  $('#fStatus').innerHTML = '<option value="">All</option>' + opts(STAFF_STATUS); $('#fPos').innerHTML = '<option value="">All positions</option>' + opts(POSITIONS);
  $('#sPos').innerHTML = opts(POSITIONS); $('#sStatus').innerHTML = opts(STAFF_STATUS);

  function render(first) {
    const q = $('#q').value.trim().toLowerCase(), fs = $('#fStatus').value, fp = $('#fPos').value, tasks = getTasks();
    const list = getStaff().filter(s => (!fs || s.status === fs) && (!fp || s.pos === fp) && `${s.id} ${s.name} ${s.email} ${s.pos}`.toLowerCase().includes(q));
    const pg = paginate(list, page, PER); page = pg.page;
    $('#tbody').innerHTML = pg.items.length ? pg.items.map(s => { const st = staffStats(s.id, tasks);
      return `<tr><td class="num fw-semibold">${esc(s.id)}</td>
        <td><div class="cell-user">${avatar(s.name, s.id)}<div class="text-truncate"><a class="t-title" href="staff-profile.html?id=${s.id}">${esc(s.name)}</a><small>${esc(s.email)}</small></div></div></td>
        <td class="hide-md">${esc(s.pos)}</td><td class="text-center num">${st.total}</td>
        <td class="text-center num"><b>${st.completed}</b> <span class="mu small">(${st.rate}%)</span></td><td>${badge(s.status)}</td>
        <td class="text-end text-nowrap">
          <a class="btn btn-o btn-icon btn-sm" href="staff-profile.html?id=${s.id}" aria-label="View ${esc(s.name)}" title="View"><i class="bi bi-eye"></i></a>
          <button class="btn btn-o btn-icon btn-sm" data-edit="${s.id}" aria-label="Edit ${esc(s.name)}" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-o btn-icon btn-sm danger" data-del="${s.id}" aria-label="Delete ${esc(s.name)}" title="Delete"><i class="bi bi-trash"></i></button></td></tr>`; }).join('')
      : `<tr><td colspan="7">${emptyState('bi-person-x', 'No staff members found.', 'Try changing your search or filter.')}</td></tr>`;
    $('#pager').innerHTML = pagerHTML(pg, 'staff');
    if (first) Motion.page(); else Motion.rows($('#tbody'));
  }
  ['q', 'fStatus', 'fPos'].forEach(id => $('#' + id).addEventListener(id === 'q' ? 'input' : 'change', () => { page = 1; render(); }));
  $('#fReset').onclick = () => { ['q', 'fStatus', 'fPos'].forEach(id => $('#' + id).value = ''); page = 1; render(); };
  $('#pager').onclick = e => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { page = +b.dataset.page; render(); } };

  function openForm(s) {
    $$('.is-invalid', modalEl).forEach(el => el.classList.remove('is-invalid')); $('#staffForm').reset();
    $('#staffModalTitle').textContent = s ? 'Edit staff' : 'Add staff'; $('#sId').value = s ? s.id : '';
    $('#sName').value = s ? s.name : ''; $('#sPos').value = s ? s.pos : POSITIONS[2]; $('#sStatus').value = s ? s.status : 'Active';
    $('#sEmail').value = s ? s.email : ''; $('#sPhone').value = s ? s.phone : '';
    $('#sHint').classList.toggle('d-none', !!s); modal.show();
  }
  $('#addBtn').onclick = () => openForm(null);

  $('#tbody').addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
    if (ed) openForm(staffById(ed.dataset.edit));
    if (dl) {
      const s = staffById(dl.dataset.del);
      if (s.id === me.staffId) return toast('⚠ You cannot delete your own account.', 'error');
      const n = getTasks().filter(t => t.staff === s.id && statusOf(t) !== 'Completed').length;
      if (await confirmBox({ title: `Delete ${s.name}?`, body: n ? `${n} open task${n > 1 ? 's' : ''} will become unassigned. This cannot be undone.` : 'This cannot be undone.', okText: 'Delete staff' })) {
        store.set('staff', getStaff().filter(x => x.id !== s.id));
        saveTasks(getTasks().map(t => t.staff === s.id ? { ...t, staff: '' } : t));
        store.set('users', store.get('users', []).filter(u => u.staffId !== s.id));
        const r = store.get('roster', {}); delete r[s.id]; store.set('roster', r);
        logActivity(`${s.name} was removed from the team`, 'info'); render(); toast('✓ Staff deleted successfully.');
      }
    }
  });

  $('#staffForm').addEventListener('submit', e => {
    e.preventDefault(); $$('.is-invalid', modalEl).forEach(el => el.classList.remove('is-invalid'));
    const id = $('#sId').value, name = $('#sName').value.trim(), email = $('#sEmail').value.trim().toLowerCase(); let ok = true;
    const users = store.get('users', []);
    if (!name) { $('#sName').classList.add('is-invalid'); ok = false; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { $('#sEmailErr').textContent = 'Enter a valid email address.'; $('#sEmail').classList.add('is-invalid'); ok = false; }
    else if (users.some(u => u.email === email && u.staffId !== id)) { $('#sEmailErr').textContent = 'That email is already used by another account.'; $('#sEmail').classList.add('is-invalid'); ok = false; }
    if (!ok) return toast('⚠ Unable to save staff. Please check the required fields.', 'error');
    const data = { name, pos: $('#sPos').value, status: $('#sStatus').value, email, phone: $('#sPhone').value.trim() }, all = getStaff();
    if (id) {
      Object.assign(all.find(s => s.id === id), data); const u = users.find(x => x.staffId === id);
      if (u) { u.name = name; u.email = email; u.phone = data.phone; }
    } else {
      const nid = nextId('S', all); all.push({ id: nid, ...data });
      users.push({ email, user: email.split('@')[0], name, phone: data.phone, role: 'staff', staffId: nid, h: hashPw('Voltora@123') });
      const r = store.get('roster', {}); r[nid] = ['Off', 'Full', 'Full', 'Full', 'Full', 'Full', 'Off']; store.set('roster', r);
      logActivity(`${name} joined the team`, 'info', '', nid);
    }
    store.set('staff', all); store.set('users', users); modal.hide(); render(); toast(id ? '✓ Staff updated successfully.' : '✓ Staff added successfully.');
  });

  render(true);
  if (qs().get('new')) openForm(null);
}
