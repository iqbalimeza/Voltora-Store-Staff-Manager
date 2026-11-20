/* ==========================================================================
   VOLTORA - Notification centre (opened from the bell in the top bar)
   Managers see manager notifications, staff see only the ones addressed to them.
   No email or SMS is sent: notifications are in-app only.
   ========================================================================== */
if (layout('', { title: 'Notifications', roles: ['admin', 'staff'] })) {
  const mine = () => visibleNotes();
  const patchAll = fn => { store.set('notes', store.get('notes', []).map(n => noteVisible(n) ? fn(n) : n).filter(Boolean)); renderBell(); };
  function render(first) {
    const L = mine().filter(n => !$('#nFilter').value || !n.read);
    $('#list').innerHTML = L.length ? L.map(n => `<div class="d-flex align-items-center gap-3 py-3 border-bottom">
      <span class="kpi-ico ${n.cat === 'Finance' ? 'warn' : n.cat === 'Repair' ? 'ok' : 'info'}"><i class="bi ${NOTE_ICON[n.cat] || 'bi-bell'}"></i></span>
      <div class="flex-grow-1"><div class="${n.read ? 'mu' : 'fw-semibold'}">${n.link ? `<a class="text-reset" href="${esc(n.link)}">${esc(n.text)}</a>` : esc(n.text)}</div><small class="mu">${fmtDate(n.date)} &middot; ${esc(n.cat)}${n.read ? '' : ' &middot; <b class="text-primary">New</b>'}</small></div>
      ${n.read ? '' : `<button class="btn btn-o btn-sm" data-read="${n.id}">Mark read</button>`}<button class="btn btn-o btn-icon btn-sm danger" data-x="${n.id}" aria-label="Delete notification"><i class="bi bi-x-lg"></i></button></div>`).join('')
      : emptyState('bi-bell-slash', 'No notifications.', $('#nFilter').value ? 'You have no unread notifications.' : 'New task, repair and finance alerts will appear here.');
    if (first) Motion.page();
  }
  $('#nFilter').onchange = () => render();
  $('#list').onclick = e => { const b = e.target.closest('button'); if (!b) return; const id = b.dataset.read || b.dataset.x; patchAll(n => String(n.id) !== id ? n : b.dataset.x ? null : { ...n, read: true }); render(); };
  $('#readAll').onclick = () => { patchAll(n => ({ ...n, read: true })); render(); toast('✓ All notifications marked as read.'); };
  $('#clearAll').onclick = async () => { if (mine().length && await confirmBox({ title: 'Clear all notifications?', body: 'This removes every notification shown here.', okText: 'Clear all' })) { patchAll(() => null); render(); toast('✓ Notifications cleared.'); } };
  render(true);
  Sync.watch(() => render());
}
