/* ==========================================================================
   VOLTORA - Shared layout
   Builds the sidebar, top bar (search, notifications, profile) and footer on
   every page, guards routes by role, and provides toast + confirm helpers.
   Usage on a page:  layout('tasks', { title: 'Task Management', roles: ['admin'] })
   ========================================================================== */

/* Navigation per role. `key` matches the value passed to layout(). */
const NAV = {
  admin: [
    ['dashboard', 'Dashboard', 'bi-grid-1x2-fill', 'dashboard.html'],
    ['staff', 'Staff Management', 'bi-people-fill', 'staff.html'],
    ['tasks', 'Task Management', 'bi-check2-square', 'tasks.html'],
    ['services', 'Services', 'bi-tools', 'services.html'],
    ['repairs', 'Repair Management', 'bi-wrench-adjustable-circle-fill', 'repairs.html'],
    ['schedule', 'Schedule', 'bi-calendar3', 'schedule.html'],
    ['finance', 'Finance', 'bi-wallet2', 'finance.html'],
    ['reports', 'Reports', 'bi-bar-chart-line-fill', 'reports.html'],
    ['settings', 'Settings', 'bi-gear-fill', 'settings.html']
  ],
  customer: [   // read only, own repairs only
    ['dashboard', 'Dashboard', 'bi-grid-1x2-fill', 'dashboard.html'],
    ['tasks', 'Task Management', 'bi-check2-square', 'tasks.html'],
    ['services', 'Services', 'bi-tools', 'services.html'],
    ['repairs', 'Repair Management', 'bi-wrench-adjustable-circle-fill', 'repairs.html'],
    ['schedule', 'Schedule', 'bi-calendar3', 'schedule.html'],
    ['settings', 'Settings', 'bi-gear-fill', 'settings.html']
  ],
  staff: [
    ['dashboard', 'Dashboard', 'bi-grid-1x2-fill', 'dashboard.html'],
    ['tasks', 'My Tasks', 'bi-check2-square', 'tasks.html'],
    ['services', 'Services', 'bi-tools', 'services.html'],
    ['schedule', 'Schedule', 'bi-calendar3', 'schedule.html'],
    ['staff', 'My Performance', 'bi-graph-up-arrow', 'staff-profile.html'],
    ['settings', 'Settings', 'bi-gear-fill', 'settings.html']
  ]
};

/* ---------- Toast notifications ---------- */
function toast(message, type = 'success') {
  let stack = $('#toastStack');
  if (!stack) { stack = document.createElement('div'); stack.id = 'toastStack'; stack.className = 'toast-stack'; stack.setAttribute('aria-live', 'polite'); document.body.append(stack); }
  const icon = { success: 'bi-check-circle-fill', error: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[type] || 'bi-check-circle-fill';
  const el = document.createElement('div');
  el.className = `toast-v ${type}`; el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `<i class="bi ${icon}"></i><div>${message}</div>`;
  stack.append(el);
  const close = () => { if (window.gsap && !(window.Motion && Motion.reduced())) gsap.to(el, { opacity: 0, x: 24, duration: .25, onComplete: () => el.remove() }); else el.remove(); };
  setTimeout(close, type === 'error' ? 5000 : 3200);
}
/* Show a toast after a redirect (e.g. "access denied"). */
function flash(message, type) { sessionStorage.setItem('vt_flash', JSON.stringify({ message, type })); }

/* ---------- Confirm dialog (replaces window.confirm) ---------- */
function confirmBox({ title = 'Are you sure?', body = '', okText = 'Confirm', danger = true } = {}) {
  return new Promise(resolve => {
    let m = $('#confirmModal');
    if (!m) {
      m = document.createElement('div'); m.className = 'modal fade'; m.id = 'confirmModal'; m.tabIndex = -1;
      m.setAttribute('aria-labelledby', 'cfTitle'); m.setAttribute('aria-hidden', 'true');
      m.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-sm"><div class="modal-content"><div class="modal-body text-center p-4">
        <div class="kpi-ico danger mx-auto mb-3" style="width:52px;height:52px"><i class="bi bi-exclamation-triangle"></i></div>
        <h2 class="h5 fw-bold" id="cfTitle"></h2><p class="mu mb-4" id="cfBody"></p>
        <div class="d-flex gap-2 justify-content-center"><button class="btn btn-o" data-bs-dismiss="modal">Cancel</button><button class="btn btn-v btn-danger" id="cfOk"></button></div></div></div></div>`;
      document.body.append(m);
    }
    $('#cfTitle', m).textContent = title; $('#cfBody', m).textContent = body;
    const ok = $('#cfOk', m); ok.textContent = okText; ok.className = 'btn btn-v' + (danger ? ' btn-danger' : '');
    const modal = bootstrap.Modal.getOrCreateInstance(m); let answered = false;
    ok.onclick = () => { answered = true; modal.hide(); resolve(true); };
    m.addEventListener('hidden.bs.modal', () => { if (!answered) resolve(false); }, { once: true });
    modal.show();
  });
}

/* ---------- Empty state markup ---------- */
const emptyState = (icon, title, text) => `<div class="empty-state"><i class="bi ${icon}"></i><h3>${esc(title)}</h3><p class="mb-0">${esc(text)}</p></div>`;

/* ---------- Simple client-side pagination ---------- */
function paginate(list, page, per) {
  const pages = Math.max(1, Math.ceil(list.length / per)), p = Math.min(Math.max(1, page), pages);
  return { items: list.slice((p - 1) * per, p * per), page: p, pages, total: list.length, from: list.length ? (p - 1) * per + 1 : 0, to: Math.min(p * per, list.length) };
}
function pagerHTML(pg, label) {
  if (!pg.total) return '';
  const btn = (n, txt, dis, act) => `<li class="page-item ${dis ? 'disabled' : ''} ${act ? 'active' : ''}"><button class="page-link" data-page="${n}" ${dis ? 'disabled' : ''}>${txt}</button></li>`;
  let nums = ''; for (let i = 1; i <= pg.pages; i++) nums += btn(i, i, false, i === pg.page);
  return `<div class="pager"><span>Showing ${pg.from}-${pg.to} of ${pg.total} ${label}</span>${pg.pages > 1 ? `<ul class="pagination pagination-sm">${btn(pg.page - 1, '&laquo;', pg.page === 1)}${nums}${btn(pg.page + 1, '&raquo;', pg.page === pg.pages)}</ul>` : ''}</div>`;
}

/* ---------- Main layout builder ---------- */
function layout(active, opts = {}) {
  seed(); seedCatalogue();
  const me = session();
  if (!me && opts.public) { publicShell(active, opts); return true; }       // customer-facing pages (Services, Track repair)
  if (!me) { location.href = 'login.html'; return false; }
  if (opts.roles && !opts.roles.includes(me.role)) { flash('You do not have access to that page.', 'error'); location.href = 'dashboard.html'; return false; }

  document.body.classList.add('app');
  if (store.get('sc', false)) document.body.classList.add('sc');
  if (store.get('rm', false)) document.body.classList.add('reduce-motion');

  const items = NAV[me.role] || NAV.staff;
  const link = it => {
    const href = it[0] === 'staff' && me.role === 'staff' ? `staff-profile.html?id=${me.staffId}` : it[3];
    return `<a class="sb-link ${it[0] === active ? 'active' : ''}" href="${href}" title="${it[1]}" ${it[0] === active ? 'aria-current="page"' : ''}><i class="bi ${it[2]}"></i><span class="sb-text">${it[1]}</span></a>`;
  };
  const title = opts.title || (items.find(i => i[0] === active) || [0, 'Voltora'])[1];

  /* Sidebar + backdrop */
  $('#nav').innerHTML = `
    <div class="sb-backdrop" id="sbBackdrop"></div>
    <aside class="sidebar" id="sidebar" aria-label="Main navigation">
      <div class="mac-dots" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="sb-head">
        <a class="sb-brand" href="dashboard.html" aria-label="Voltora home"><img class="sb-logo-full" src="assets/logo/voltora-logo-900.png" alt="Voltora Store" width="190" height="40"><img class="sb-logo-mark" src="assets/logo/voltora-mark.png" alt="Voltora" width="34" height="34"></a>
        <button class="sb-toggle" id="sbCollapse" aria-label="Collapse sidebar"><i class="bi bi-layout-sidebar-inset"></i></button>
      </div>
      <div class="sb-label">Menu</div>
      <nav class="sb-nav" aria-label="Primary">${items.map(link).join('')}</nav>
      <div class="sb-foot">
        <div class="sb-user">${avatar(me.name, me.staffId || me.email)}<div class="sb-meta text-truncate"><b class="text-truncate">${esc(me.name)}</b><small>${roleLabel(me.role)}</small></div></div>
        <button class="sb-link sb-logout border-0 bg-transparent w-100" id="sbLogout"><i class="bi bi-box-arrow-left"></i><span class="sb-text">Logout</span></button>
      </div>
    </aside>`;

  /* Top bar */
  const notes = visibleNotes(), unread = notes.filter(n => !n.read).length;
  const topbar = document.createElement('header');
  topbar.className = 'topbar'; topbar.id = 'topbar';
  topbar.innerHTML = `
    <button class="icon-btn top-menu" id="menuBtn" aria-label="Open menu" aria-controls="sidebar" aria-expanded="false"><i class="bi bi-list fs-5"></i></button>
    <p class="top-title" id="topTitle">${esc(title)}</p>
    <span class="top-date hide-md">${new Date().toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
    <div class="top-spacer"></div>
    <div class="search-box" id="searchBox" role="search">
      <i class="bi bi-search"></i>
      <input id="gSearch" type="search" placeholder="Search tasks${me.role === 'admin' ? ' or staff' : ''}..." aria-label="Search" autocomplete="off">
      <div class="search-results" id="gResults" role="listbox"></div>
    </div>
    <button class="icon-btn search-toggle" id="searchToggle" aria-label="Search"><i class="bi bi-search"></i></button>
    <div class="quick-tools" id="quickTools"></div>
    <button class="icon-btn theme-toggle" id="themeBtn" aria-label="Switch between dark and light mode" title="Dark / light mode"><i class="bi bi-moon-stars-fill"></i><i class="bi bi-sun-fill"></i></button>
    <div class="dropdown">
      <button class="icon-btn" id="bellBtn" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false" aria-label="Notifications"><i class="bi bi-bell"></i><span class="dot-badge ${unread ? '' : 'd-none'}" id="bellCount">${unread}</span></button>
      <div class="dropdown-menu dropdown-menu-end notif-menu" id="bellMenu"></div>
    </div>
    <div class="dropdown">
      <button class="user-chip" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Profile menu">${avatar(me.name, me.staffId || me.email, 'av-sm')}<span class="u-meta"><b>${esc(me.name.split(' ')[0])}</b><small>${roleLabel(me.role)}</small></span><i class="bi bi-chevron-down small"></i></button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item" href="settings.html"><i class="bi bi-person-gear me-2"></i>Profile &amp; settings</a></li>
        ${me.role === 'staff' ? `<li><a class="dropdown-item" href="staff-profile.html?id=${me.staffId}"><i class="bi bi-graph-up-arrow me-2"></i>My performance</a></li>` : ''}
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item text-danger" id="ddLogout"><i class="bi bi-box-arrow-left me-2"></i>Logout</button></li>
      </ul>
    </div>`;
  const main = $('main'); const wrap = document.createElement('div'); wrap.className = 'app-main'; wrap.id = 'appMain';
  main.before(wrap); wrap.append(topbar, main);
  if (me.role === 'customer') {   // customers get a read-only view: no global search, no staff notifications (settings stays available)
    ['#searchBox', '#searchToggle'].forEach(s => topbar.querySelector(s).classList.add('d-none'));
    topbar.querySelector('#bellBtn').parentElement.classList.add('d-none');
  }
  main.id = 'main'; main.classList.add('pg'); main.tabIndex = -1;
  document.body.insertAdjacentHTML('afterbegin', '<a class="skip-link" href="#main">Skip to main content</a>');

  /* Footer */
  const flinks = items.map(i => `<a href="${i[0] === 'staff' && me.role === 'staff' ? `staff-profile.html?id=${me.staffId}` : i[3]}">${i[1]}</a>`).join('');
  wrap.insertAdjacentHTML('beforeend', `
    <footer class="site-foot" id="siteFoot"><div class="inner">
      <div class="row g-4">
        <div class="col-lg-5"><img class="foot-logo" src="assets/logo/voltora-logo-900.png" alt="Voltora Store" width="210" height="44">
          <p class="mt-3 mb-1 text-white fw-semibold">Electronics Repair, Service &amp; Staff Management System</p>
          <p class="small mb-0">Repair requests, technician tasks, staff performance, schedules and store finances connected in one system.</p></div>
        <div class="col-6 col-lg-3"><h2>Navigate</h2>${flinks}</div>
        <div class="col-6 col-lg-4"><h2>Store information</h2>
          <p class="small mb-1"><i class="bi bi-geo-alt me-2"></i>12 Jalan Teknologi, Subang Jaya, Selangor</p>
          <p class="small mb-1"><i class="bi bi-clock me-2"></i>Mon-Sat 10am-9pm, Sun 11am-6pm</p>
          <p class="small mb-0"><i class="bi bi-envelope me-2"></i>hello@voltora.my</p></div>
      </div><hr>
      <div class="legal"><span>&copy; 2026 Voltora Store &middot; Electronics Repair, Service &amp; Staff Management</span></div><p class="foot-disc"><b>Disclaimer:</b> Voltora Store is a fictional store created for the IMS566 prototype. Demo data is stored only in your browser, and all prices and durations are placeholders, not official quotations.</p>
    </div></footer>`);

  renderBell();
  wireShell(me);
  runRepairReminders(); renderBell();
  const f = sessionStorage.getItem('vt_flash'); if (f) { sessionStorage.removeItem('vt_flash'); const o = JSON.parse(f); setTimeout(() => toast(o.message, o.type || 'info'), 300); }
  return true;
}

const NOTE_ICON = { Task: 'bi-check2-square', Finance: 'bi-wallet2', Repair: 'bi-tools' };
/* Notification dropdown contents */
function renderBell() {
  const notes = visibleNotes(), unread = notes.filter(n => !n.read).length, menu = $('#bellMenu'); if (!menu) return;
  const c = $('#bellCount'); c.textContent = unread; c.classList.toggle('d-none', !unread);
  menu.innerHTML = `<div class="nm-head"><b>Notifications</b><button class="btn btn-sm btn-o" id="bellAll" ${unread ? '' : 'disabled'}>Mark all read</button></div>` +
    (notes.length ? notes.slice(0, 5).map(n => `<${n.link ? 'a href="' + esc(n.link) + '"' : 'div'} class="nm-item ${n.read ? '' : 'unread'}"><i class="bi ${NOTE_ICON[n.cat] || 'bi-bell'} mt-1"></i><div><div class="${n.read ? '' : 'fw-semibold'}">${esc(n.text)}</div><small class="mu">${fmtDate(n.date)}</small></div></${n.link ? 'a' : 'div'}>`).join('') : emptyState('bi-bell-slash', 'All caught up', 'No notifications yet.')) +
    `<div class="nm-foot"><a href="notifications.html">View all notifications</a></div>`;
  const all = $('#bellAll'); if (all) all.onclick = () => { store.set('notes', store.get('notes', []).map(n => noteVisible(n) ? { ...n, read: true } : n)); renderBell(); };
}

/* Behaviour: collapse, drawer, global search, logout */
function wireShell(me) {
  const sb = $('#sidebar'), bd = $('#sbBackdrop'), menuBtn = $('#menuBtn');
  const drawer = open => { sb.classList.toggle('open', open); bd.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); if (open && window.Motion) Motion.sidebarIn(); };
  menuBtn.onclick = () => drawer(!sb.classList.contains('open'));
  bd.onclick = () => drawer(false);
  $$('.sb-link', sb).forEach(a => a.addEventListener('click', () => drawer(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { drawer(false); closeResults(); $('#searchBox').classList.remove('open'); } });
  $('#sbCollapse').onclick = () => { document.body.classList.toggle('sc'); store.set('sc', document.body.classList.contains('sc')); };
  $('#sbLogout').onclick = $('#ddLogout').onclick = logout;
  $('#themeBtn').onclick = toggleTheme;
  $('#searchToggle').onclick = () => { $('#searchBox').classList.add('open'); $('#gSearch').focus(); };

  /* Global search over tasks (and staff for admins) */
  const input = $('#gSearch'), box = $('#gResults');
  const closeResults = () => box.classList.remove('show');
  function run() {
    const q = input.value.trim().toLowerCase(); if (!q) return closeResults();
    const tasks = visibleTasks().filter(t => `${t.id} ${t.title} ${staffName(t.staff)}`.toLowerCase().includes(q)).slice(0, 5);
    const staff = me.role === 'admin' ? getStaff().filter(s => `${s.id} ${s.name} ${s.pos}`.toLowerCase().includes(q)).slice(0, 4) : [];
    let h = '';
    if (tasks.length) h += '<div class="grp">Tasks</div>' + tasks.map(t => `<a href="task-detail.html?id=${t.id}"><i class="bi bi-check2-square"></i><span class="flex-grow-1 text-truncate">${esc(t.title)}</span>${badge(statusOf(t))}</a>`).join('');
    if (staff.length) h += '<div class="grp">Staff</div>' + staff.map(s => `<a href="staff-profile.html?id=${s.id}">${avatar(s.name, s.id, 'av-sm')}<span class="flex-grow-1">${esc(s.name)}<small class="d-block mu">${esc(s.pos)}</small></span></a>`).join('');
    box.innerHTML = h || `<div class="none"><i class="bi bi-search d-block fs-4 mb-1"></i>No results for "${esc(input.value)}"</div>`;
    box.classList.add('show');
  }
  input.addEventListener('input', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = $('a', box); if (a) location.href = a.href; } });
  document.addEventListener('click', e => { if (!e.target.closest('#searchBox') && !e.target.closest('#searchToggle')) { closeResults(); $('#searchBox').classList.remove('open'); } });
}

/* Dark / light switch (charts are drawn with theme colours, so pages with charts are redrawn) */
function toggleTheme() {
  Theme.set({ mode: Theme.resolved() === 'dark' ? 'light' : 'dark' });
  if (document.querySelector('canvas:not(.fx-canvas)')) location.reload();
}

/* ---------- Public shell: customer-facing pages (no sign-in needed) ---------- */
function publicShell(active, opts) {
  document.body.classList.add('public');
  document.body.insertAdjacentHTML('afterbegin', `<a class="skip-link" href="#main">Skip to main content</a>
    <header class="pub-nav" id="pubNav"><div class="pub-inner">
      <a class="pub-brand" href="services.html" aria-label="Voltora Store - Services"><img src="assets/logo/voltora-logo-900.png" alt="Voltora Store" width="170" height="36"></a>
      <nav class="pub-links" aria-label="Customer navigation">
        <a href="services.html" class="${active === 'services' ? 'active' : ''}">Services</a>
        <a href="track.html" class="${active === 'track' ? 'active' : ''}">Track repair</a>
        <a href="login.html">Login</a>
      </nav>
      <div class="quick-tools" id="quickTools"></div>
      <button class="icon-btn theme-toggle" id="themeBtn" aria-label="Switch between dark and light mode"><i class="bi bi-moon-stars-fill"></i><i class="bi bi-sun-fill"></i></button>
    </div></header>`);
  const main = $('main'); main.id = 'main'; main.classList.add('pub-main'); main.tabIndex = -1;
  main.insertAdjacentHTML('afterend', `<footer class="site-foot pub-foot"><div class="inner"><div class="row g-4">
      <div class="col-lg-5"><img class="foot-logo" src="assets/logo/voltora-logo-900.png" alt="Voltora Store" width="210" height="44"><p class="mt-3 mb-1 text-white fw-semibold">Electronics repair &amp; technical services</p><p class="small mb-0">Smartphones, laptops, desktop and gaming PCs, accessories, cameras and more.</p></div>
      <div class="col-6 col-lg-3"><h2>Customers</h2><a href="services.html">Our services</a><a href="track.html">Track my repair</a></div>
      <div class="col-6 col-lg-4"><h2>Store information</h2><p class="small mb-1"><i class="bi bi-geo-alt me-2"></i>12 Jalan Teknologi, Subang Jaya, Selangor</p><p class="small mb-1"><i class="bi bi-clock me-2"></i>Mon-Sat 10am-9pm, Sun 11am-6pm</p><p class="small mb-0"><i class="bi bi-envelope me-2"></i>hello@voltora.my</p></div>
    </div><hr><div class="legal"><span>&copy; 2026 Voltora Store &middot; Electronics Repair &amp; Technical Services</span></div><p class="foot-disc"><b>Disclaimer:</b> Voltora Store is a fictional store created for the IMS566 prototype. Prices and durations are placeholder estimates, not official quotations, and requests are stored only in your browser.</p></div></footer>`);
  $('#themeBtn').onclick = toggleTheme;
}
