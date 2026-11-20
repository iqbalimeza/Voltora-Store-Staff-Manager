/* ==========================================================================
   VOLTORA - Data layer
   Shared helpers, localStorage store, seed data, authentication helpers and
   the business rules (task status/progress, analytics filters).
   All data is fictional and lives in the browser (localStorage) so the app can
   be hosted on GitHub Pages without a server.
   ========================================================================== */

/* ---------- DOM + formatting helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sum = a => a.reduce((x, y) => x + y, 0);
const RM = n => 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const RM2 = n => 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const slug = s => String(s).toLowerCase().replace(/[^a-z]/g, '');
const initials = n => String(n).split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

/* Dates are handled as local YYYY-MM-DD strings (avoids UTC off-by-one bugs). */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => new Date(s + 'T00:00:00');
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const today = () => iso(new Date());
const diffDays = (a, b) => Math.round((parseD(a) - parseD(b)) / 864e5);
const fmtDate = s => s ? parseD(s).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtShort = s => s ? parseD(s).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : '-';
const monthKey = s => s.slice(0, 7);
const monthLabel = k => new Date(k + '-01T00:00:00').toLocaleDateString('en-MY', { month: 'short', year: '2-digit' });
const addMonths = (n) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const relTime = ts => {
  const m = Math.round((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'Just now'; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24); return d === 1 ? 'Yesterday' : `${d} days ago`;
};

/* ---------- localStorage wrapper ---------- */
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('vt_' + k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem('vt_' + k, JSON.stringify(v)); },
  del(k) { localStorage.removeItem('vt_' + k); }
};

/* ---------- Password hashing (SHA-256 + salt, pure JS so it works on file:// too) ---------- */
function sha256(str) {
  const primes = []; for (let n = 2; primes.length < 64; n++) if (primes.every(p => n % p)) primes.push(n);
  const frac = x => Math.floor((x - Math.floor(x)) * 4294967296);
  const K = primes.map(p => frac(Math.cbrt(p)));
  let H = primes.slice(0, 8).map(p => frac(Math.sqrt(p)));
  const rr = (n, x) => (x >>> n) | (x << (32 - n));
  const bytes = new TextEncoder().encode(str), len = bytes.length, total = ((len + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(total); buf.set(bytes); buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 4, (len * 8) >>> 0); dv.setUint32(total - 8, Math.floor(len * 8 / 4294967296));
  const w = new Uint32Array(64);
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      w[i] = (w[i - 16] + (rr(7, a) ^ rr(18, a) ^ (a >>> 3)) + w[i - 7] + (rr(17, b) ^ rr(19, b) ^ (b >>> 10))) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rr(6, e) ^ rr(11, e) ^ rr(25, e)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rr(2, a) ^ rr(13, a) ^ rr(22, a)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H = H.map((v, i) => (v + [a, b, c, d, e, f, g, h][i]) | 0);
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}
const hashPw = pw => sha256('voltora-demo-salt:' + pw);   // demo only: client-side hashing is not real security

/* ---------- Domain constants ---------- */
const CATS = ['Inventory', 'Customer Service', 'Sales', 'Delivery', 'Maintenance', 'Administration', 'Repair'];
const PRI = ['High', 'Medium', 'Low'];
const STORED_STATUS = ['Pending', 'In Progress', 'Completed'];   // Overdue is derived from the due date
const STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue'];
const POSITIONS = ['Store Manager', 'Assistant Manager', 'Sales Assistant', 'Inventory Assistant', 'Customer Service Staff', 'Delivery Staff', 'Maintenance Staff', 'Cashier', 'Repair Technician'];
const STAFF_STATUS = ['Active', 'On Leave', 'Inactive'];
const EXP_CATS = ['Utilities', 'Maintenance', 'Cleaning', 'Staff Supplies', 'Equipment', 'Other'];
const EXP_STATUS = ['Paid', 'Pending'];
const SHIFTS = ['Off', 'Morning', 'Evening', 'Full'];
const SHIFT_TIME = { Off: 'Off', Morning: '10am-3pm', Evening: '3pm-9pm', Full: '10am-9pm' };
const EVENT_TYPES = ['Stock take', 'Meeting', 'Payroll', 'Promotion', 'Audit', 'Other'];
/* accent follows the selected theme colour (see theme.js) */
const CHART_COLORS = { ok: '#16a34a', info: '#3b82f6', warn: '#f59e0b', danger: '#dc2626', get accent() { return (typeof cssv === 'function' && cssv('--accent')) || '#2563eb'; }, get accent2() { return (typeof cssv === 'function' && cssv('--accent-2')) || '#38bdf8'; }, slate: '#94a3b8' };
const DATA_VERSION = 6;
const KEEP_KEYS = ['vt_sc', 'vt_theme', 'vt_accent', 'vt_rm'];   // display preferences survive a data reset

/* ---------- Seed data (only written when storage is empty or the schema changed) ---------- */
function monthDate(m, d) {            // date in month offset m, never later than today
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + m);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  let dd = Math.min(d, last);
  if (m === 0) dd = Math.min(dd, new Date().getDate());
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(dd)}`;
}

function seed() {
  if (store.get('ver') === DATA_VERSION && store.get('staff')) return;
  Object.keys(localStorage).filter(k => k.startsWith('vt_') && !KEEP_KEYS.includes(k)).forEach(k => localStorage.removeItem(k));
  sessionStorage.removeItem('vt_session');
  seedCatalogue();

  const staff = [
    ['S001', 'Iqbal Hakimi', 'Store Manager', 'Active'], ['S002', 'Adli Harun', 'Inventory Assistant', 'Active'],
    ['S003', 'Daniel Lee', 'Sales Assistant', 'Active'], ['S004', 'Sarah Tan', 'Customer Service Staff', 'Active'],
    ['S005', 'Adam Zikri', 'Delivery Staff', 'Active'], ['S006', 'Nurul Izzati', 'Sales Assistant', 'Active'],
    ['S007', 'Haziq Rahman', 'Maintenance Staff', 'Active'], ['S008', 'Mei Ling', 'Cashier', 'On Leave'],
    ['S009', 'Farid Azman', 'Repair Technician', 'Active'], ['S010', 'Jason Lim', 'Repair Technician', 'Active']
  ].map(s => ({
    id: s[0], name: s[1], pos: s[2], status: s[3],
    email: s[1].split(' ')[0].toLowerCase() + '@voltora.my', phone: '01' + (2 + (+s[0].slice(1) % 4)) + '-' + (3000000 + +s[0].slice(1) * 111111)
  }));
  store.set('staff', staff);

  // title, description, category, staff, priority, startOffset, dueOffset, status, progress, doneOffset, remarks
  const rows = [
    ['Check laptop stock levels', 'Count ASUS and Acer laptops on the shelves and in the storeroom.', 'Inventory', 'S002', 'High', -9, -6, 'Completed', 100, -6, 'Two units missing a box; reported to the manager.'],
    ['Update promotional price tags', 'Replace tags for the weekend promotion.', 'Sales', 'S003', 'Medium', -12, -8, 'Completed', 100, -9, ''],
    ['Replace printer toner', 'Replace toner in the back-office printers and test print.', 'Maintenance', 'S007', 'Low', -8, -5, 'Completed', 100, -5, ''],
    ['Reconcile weekly cash drawer', 'Match the cash drawer against the weekly takings sheet.', 'Administration', 'S008', 'High', -7, -4, 'Completed', 100, -4, 'Balanced with RM 3 variance.'],
    ['Reply to customer enquiries', 'Clear the pending enquiry inbox.', 'Customer Service', 'S004', 'Medium', -6, -3, 'Completed', 100, -3, ''],
    ['Pack courier parcels (batch A)', 'Pack and label parcels for the courier pick-up.', 'Delivery', 'S005', 'High', -5, -3, 'Completed', 100, -3, ''],
    ['Clean display shelves', 'Dust and reorganise the accessories shelves.', 'Maintenance', 'S007', 'Low', -4, -2, 'Completed', 100, -2, ''],
    ['Prepare daily sales report', 'Compile yesterday\'s sales summary for the manager.', 'Sales', 'S006', 'High', -3, -2, 'Completed', 100, -2, ''],
    ['Tag new smartphone stock', 'Apply security tags and price labels to new arrivals.', 'Inventory', 'S002', 'Medium', -3, -1, 'Completed', 100, -1, ''],
    ['Train new cashier on POS', 'Walk the new cashier through the POS terminal.', 'Administration', 'S001', 'Medium', -5, -1, 'Completed', 100, -1, ''],
    ['Test demo monitors', 'Check every demo monitor for dead pixels and cables.', 'Maintenance', 'S007', 'Low', -4, 0, 'Completed', 100, 0, ''],
    ['Arrange headphones display', 'Set up the new headphones display wall.', 'Sales', 'S006', 'Low', -2, 0, 'Completed', 100, 0, ''],
    ['Update staff roster for the month', 'Publish the monthly shift roster.', 'Administration', 'S001', 'High', -20, -14, 'Completed', 100, -15, ''],
    ['Quarterly stock take', 'Full physical stock count across all sections.', 'Inventory', 'S002', 'High', -35, -28, 'Completed', 100, -29, 'Variance under 1%.'],
    ['Install new price scanners', 'Mount and configure two price-check scanners.', 'Maintenance', 'S007', 'Medium', -30, -24, 'Completed', 100, -25, ''],
    ['Process returned-item paperwork', 'File all return forms from last week.', 'Customer Service', 'S004', 'Medium', -22, -18, 'Completed', 100, -19, ''],
    ['Deliver bulk corporate order', 'Deliver the office-equipment order to the client.', 'Delivery', 'S005', 'High', -26, -20, 'Completed', 100, -21, ''],
    ['Month-end sales summary', 'Prepare the monthly sales summary.', 'Sales', 'S003', 'High', -45, -40, 'Completed', 100, -41, ''],
    ['Audit air-con servicing', 'Confirm the servicing schedule with the contractor.', 'Maintenance', 'S007', 'Low', -55, -50, 'Completed', 100, -52, ''],
    ['Review customer feedback forms', 'Summarise comments from the feedback box.', 'Customer Service', 'S004', 'Low', -65, -60, 'Completed', 100, -61, ''],
    ['File supplier invoices', 'Sort and file supplier invoices for the quarter.', 'Administration', 'S008', 'Medium', -75, -70, 'Completed', 100, -71, ''],
    ['Run store security checklist', 'Check CCTV, alarms and door locks.', 'Administration', 'S001', 'High', -85, -80, 'Completed', 100, -82, ''],
    ['Verify delivery addresses', 'Confirm addresses for tomorrow\'s deliveries.', 'Delivery', 'S005', 'Medium', -6, -2, 'In Progress', 60, null, 'Waiting on two customers to confirm.'],
    ['Submit weekly inventory report', 'Send the weekly stock movement report to head office.', 'Inventory', 'S002', 'High', -8, -3, 'Pending', 0, null, ''],
    ['Fix POS terminal 2', 'Terminal 2 freezes during card payments; arrange repair.', 'Maintenance', 'S007', 'High', -5, -1, 'In Progress', 40, null, 'Technician booked for this week.'],
    ['Restock smartphone accessories', 'Refill chargers, cables and cases on the wall.', 'Inventory', 'S002', 'High', -2, 2, 'In Progress', 55, null, ''],
    ['Prepare weekend promotion', 'Set up banners and shelf talkers for the weekend promotion.', 'Sales', 'S003', 'High', -3, 1, 'In Progress', 80, null, ''],
    ['Follow up customer complaints', 'Call back customers with open complaints.', 'Customer Service', 'S004', 'High', -2, 1, 'In Progress', 30, null, ''],
    ['Organise cable and charger wall', 'Re-sort the cable wall by connector type.', 'Sales', 'S006', 'Medium', -1, 4, 'In Progress', 25, null, ''],
    ['Schedule monthly staff meeting', 'Book the meeting room and send the agenda.', 'Administration', 'S001', 'Medium', 0, 3, 'Pending', 0, null, ''],
    ['Prepare delivery route plan', 'Plan next week\'s courier routes.', 'Delivery', 'S005', 'Medium', 0, 4, 'Pending', 0, null, ''],
    ['Clean storage room', 'Clear boxes and sweep the storage room.', 'Maintenance', 'S007', 'Low', 1, 6, 'Pending', 0, null, ''],
    ['Cash handover training', 'Brief weekend staff on the cash handover routine.', 'Administration', 'S006', 'Low', 0, 7, 'Pending', 0, null, '']
  ];
  const tasks = rows.map((r, i) => ({
    id: 'T' + pad(i + 1).padStart(3, '0'), title: r[0], desc: r[1], cat: r[2], staff: r[3], pri: r[4],
    start: day(r[5]), due: day(r[6]), status: r[7], progress: r[8], done: r[9] === null ? null : day(r[9]), remarks: r[10]
  }));
  store.set('tasks', tasks);

  // Activity log built from the seeded tasks (completed in the last 14 days + recently started)
  const nm = id => staff.find(s => s.id === id).name;
  const act = [];
  tasks.filter(t => t.done && diffDays(today(), t.done) <= 14).forEach(t => act.push({ ts: t.done + 'T1' + (t.id.slice(-1) % 6) + ':30:00', type: 'completed', text: `${nm(t.staff)} completed ${t.title}`, taskId: t.id, staffId: t.staff }));
  tasks.filter(t => t.status === 'In Progress' || t.status === 'Pending').forEach(t => act.push({ ts: t.start + 'T09:' + pad(+t.id.slice(-2) % 60) + ':00', type: 'created', text: `${nm('S001')} assigned ${t.title} to ${nm(t.staff)}`, taskId: t.id, staffId: t.staff }));
  tasks.filter(t => t.status === 'In Progress').forEach(t => act.push({ ts: day(0) + 'T08:' + pad(+t.id.slice(-2) % 60) + ':00', type: 'progress', text: `${nm(t.staff)} updated ${t.title} to ${t.progress}%`, taskId: t.id, staffId: t.staff }));
  store.set('activity', act.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 80).map((a, i) => ({ id: i + 1, ...a })));

  store.set('notes', [
    { id: 1, cat: 'Task', text: 'Fix POS terminal 2 is overdue.', date: day(0), read: false, to: 'admin' },
    { id: 2, cat: 'Task', text: 'Submit weekly inventory report is overdue.', date: day(0), read: false, to: 'admin' },
    { id: 3, cat: 'Finance', text: 'Some expenses are waiting for payment.', date: day(-1), read: false, to: 'admin' },
    { id: 4, cat: 'Task', text: 'Reply to customer enquiries was completed.', date: day(-3), read: true, to: 'admin' }
  ]);

  // Expenses: six months of store-operation costs (no sales or products)
  const ex = []; const add = (m, d, name, cat, amt, note = '') => ex.push({ m, d, name, cat, amt, note });
  const ele = [1180, 1260, 1340, 1410, 1290, 1220], wat = [86, 92, 88, 95, 90, 91], cln = [110, 95, 140, 120, 105, 98];
  [-5, -4, -3, -2, -1, 0].forEach((m, i) => {
    add(m, 3, 'TNB electricity bill', 'Utilities', ele[i]); add(m, 5, 'Water bill', 'Utilities', wat[i]);
    add(m, 8, 'Fibre internet', 'Utilities', 199); add(m, 10, 'Cleaning service contract', 'Cleaning', 650);
    add(m, 12, 'Cleaning supplies', 'Cleaning', cln[i]); add(m, 15, 'Staff refreshments', 'Staff Supplies', 150);
  });
  add(-5, 6, 'Air-con servicing', 'Maintenance', 480); add(-5, 18, 'Shelving units for storage', 'Equipment', 2100);
  add(-4, 9, 'Display shelf repair', 'Maintenance', 320); add(-4, 20, 'Staff uniforms', 'Staff Supplies', 900);
  add(-3, 11, 'Barcode scanners (3 units)', 'Equipment', 1350); add(-3, 22, 'Pest control', 'Maintenance', 220);
  add(-2, 7, 'Air-con servicing', 'Maintenance', 480); add(-2, 19, 'Signage repair', 'Other', 310);
  add(-1, 13, 'Label printer', 'Equipment', 780); add(-1, 21, 'Stationery and packaging tape', 'Other', 180);
  add(0, 6, 'POS terminal repair', 'Maintenance', 280); add(0, 14, 'Safety signs', 'Other', 95);
  store.set('expenses', ex.map((e, i) => {
    const date = monthDate(e.m, e.d);
    return { id: 'EX-' + String(i + 1).padStart(3, '0'), name: e.name, cat: e.cat, amt: e.amt, date, status: e.m === 0 && (e.d >= 12 || e.name === 'POS terminal repair') ? 'Pending' : 'Paid', note: e.note };
  }));
  store.set('budget', { monthly: 4500 });

  // Weekly roster indexed by getDay(): 0=Sun ... 6=Sat
  const R = { S001: ['Off', 'Full', 'Full', 'Full', 'Full', 'Full', 'Morning'], S002: ['Off', 'Morning', 'Morning', 'Morning', 'Full', 'Full', 'Off'], S003: ['Evening', 'Evening', 'Evening', 'Off', 'Evening', 'Evening', 'Full'], S004: ['Off', 'Morning', 'Full', 'Morning', 'Morning', 'Evening', 'Evening'], S005: ['Off', 'Full', 'Off', 'Full', 'Full', 'Morning', 'Morning'], S006: ['Morning', 'Off', 'Evening', 'Evening', 'Off', 'Full', 'Full'], S007: ['Off', 'Morning', 'Morning', 'Off', 'Morning', 'Morning', 'Evening'], S008: ['Off', 'Off', 'Off', 'Off', 'Off', 'Off', 'Off'], S009: ['Off', 'Full', 'Full', 'Full', 'Full', 'Morning', 'Evening'], S010: ['Evening', 'Full', 'Full', 'Off', 'Full', 'Full', 'Morning'] };
  store.set('roster', R);
  store.set('events', [
    { id: 'E1', title: 'Monthly stock take', date: day(5), type: 'Stock take' }, { id: 'E2', title: 'Staff meeting', date: day(2), type: 'Meeting' },
    { id: 'E3', title: 'Payroll processing', date: monthDate(0, 28) >= today() ? monthDate(0, 28) : day(10), type: 'Payroll' },
    { id: 'E4', title: 'Weekend promotion starts', date: day(3), type: 'Promotion' }, { id: 'E5', title: 'Supplier audit visit', date: day(12), type: 'Audit' }
  ]);

  // Accounts: every staff member can sign in with the demo password; S001 is the admin
  store.set('users', [...staff.map(s => ({ email: s.email, user: s.name.split(' ')[0].toLowerCase(), name: s.name, phone: s.phone, role: s.id === 'S001' ? 'admin' : 'staff', staffId: s.id, h: hashPw('Voltora@123') })),
    /* demo customer: sees only the repairs submitted with this email / phone, read only */
    { email: 'customer@voltora.my', user: 'customer', name: 'Jamal Ariffin', phone: '0123456789', role: 'customer', staffId: '', h: hashPw('Voltora@123') }]);
  seedRepairs();
  { const R = repairs().filter(r => r.staff && r.status !== 'Cancelled'), A = store.get('activity', []);
    R.filter(r => r.status === 'Completed' && r.completedAt && diffDays(today(), r.completedAt) <= 14).forEach(r => A.push({ ts: r.completedAt + 'T15:20:00', type: 'completed', text: `${staffName(r.staff)} completed repair ${r.id}`, taskId: r.taskId, staffId: r.staff }));
    R.filter(r => R_WORKING.includes(r.status)).forEach(r => A.push({ ts: day(0) + 'T09:10:00', type: 'progress', text: `${staffName(r.staff)} updated repair ${r.id} to ${r.status}`, taskId: r.taskId, staffId: r.staff }));
    R.filter(r => r.status === 'Assigned').forEach(r => A.push({ ts: r.start + 'T11:00:00', type: 'created', text: `Repair ${r.id} was assigned to ${staffName(r.staff)}`, taskId: r.taskId, staffId: r.staff }));
    store.set('activity', A.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 80).map((a, i) => ({ id: i + 1, ...a }))); }
  store.set('ver', DATA_VERSION);
}

/* ---------- Session / auth ---------- */
const session = () => { try { const s = JSON.parse(localStorage.getItem('vt_session') || sessionStorage.getItem('vt_session') || 'null'); return s && s.role ? s : null; } catch { return null; } };
const isAdmin = () => (session() || {}).role === 'admin';
const isCustomer = () => (session() || {}).role === 'customer';
const roleLabel = r => ({ admin: 'Administrator', staff: 'Staff', customer: 'Customer' }[r] || 'Staff');
function logout() { localStorage.removeItem('vt_session'); sessionStorage.removeItem('vt_session'); location.href = 'login.html'; }

/* ---------- Staff helpers ---------- */
const getStaff = () => store.get('staff', []);
const staffById = id => getStaff().find(s => s.id === id);
const staffName = id => (staffById(id) || { name: 'Unassigned' }).name;
const firstName = id => staffName(id).split(' ')[0];
const nextId = (prefix, list, width = 3) => prefix + String(Math.max(0, ...list.map(x => parseInt(String(x.id).replace(/\D/g, ''), 10) || 0)) + 1).padStart(width, '0');
const AV_COLORS = ['#5b3fd4', '#2563eb', '#0d9488', '#c2410c', '#be185d', '#4d7c0f', '#7c3aed', '#0369a1'];
const avatar = (name, id = name, cls = '') => `<span class="av ${cls}" style="background:${AV_COLORS[(parseInt(String(id).replace(/\D/g, ''), 10) || name.length) % AV_COLORS.length]}" aria-hidden="true">${esc(initials(name))}</span>`;

/* ---------- Task rules ---------- */
const getTasks = () => store.get('tasks', []);
const saveTasks = t => store.set('tasks', t);
/** Visible tasks: admin sees everything, staff see only their own. */
const visibleTasks = () => {
  if (isAdmin()) return getTasks();
  if (isCustomer()) { const ids = new Set(visibleRepairs().map(r => r.id)); return getTasks().filter(t => t.repairId && ids.has(t.repairId)); }   // customers: only tasks of their own repairs, read only
  return getTasks().filter(t => t.staff === (session() || {}).staffId);
};
/** Effective status: a task past its due date that is not completed is Overdue. */
const statusOf = t => t.status === 'Completed' ? 'Completed' : (t.due < today() ? 'Overdue' : t.status);
/** Keep status, progress and completion date consistent. */
function applyProgress(t, { status, progress }) {
  let st = status ?? t.status, pr = Math.max(0, Math.min(100, Math.round(+(progress ?? t.progress) || 0)));
  if (st === 'Overdue') st = pr > 0 ? 'In Progress' : 'Pending';
  if (st === 'Completed') pr = 100;
  else if (pr === 100) st = 'Completed';
  else if (pr > 0 && st === 'Pending') st = 'In Progress';
  if (st !== 'Completed' && pr === 100) pr = 90;
  if (st === 'Completed' && !t.done) t.done = today();
  if (st !== 'Completed') t.done = null;
  t.status = st; t.progress = pr; return t;
}
const badge = s => `<span class="bd bd-${slug(s)}">${esc(s)}</span>`;
const priTag = p => `<span class="pri pri-${slug(p)}"><i class="bi bi-flag-fill"></i>${esc(p)}</span>`;
const barTone = s => s === 'Completed' ? 'ok' : s === 'Overdue' ? 'danger' : s === 'Pending' ? 'warn' : '';
const progressCell = t => `<div class="pcell"><div class="pbar ${barTone(statusOf(t))}" role="progressbar" aria-valuenow="${t.progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress"><span data-progress="${t.progress}" style="width:${t.progress}%"></span></div><small class="num">${t.progress}%</small></div>`;

/** Per-staff statistics. */
function staffStats(id, tasks = getTasks()) {
  const a = tasks.filter(t => t.staff === id), c = a.filter(t => statusOf(t) === 'Completed').length;
  const o = a.filter(t => statusOf(t) === 'Overdue').length, p = a.filter(t => statusOf(t) === 'Pending').length, ip = a.filter(t => statusOf(t) === 'In Progress').length;
  return { total: a.length, completed: c, overdue: o, pending: p, inProgress: ip, rate: a.length ? Math.round(c / a.length * 100) : 0 };
}

/**
 * Analytics filter used by Dashboard and Reports.
 * days  : window length ending today (0 = all time)
 * staff : staff id or ''      status : effective status or ''
 * A task counts in the period when it is still open, or was completed inside the window.
 */
function filterTasks({ days = 0, staff = '', status = '' } = {}, tasks = visibleTasks()) {
  const from = days ? day(-(days - 1)) : '0000-00-00';
  return tasks.filter(t => (!staff || t.staff === staff) && (!status || statusOf(t) === status) &&
    (t.status !== 'Completed' || (t.done || t.due) >= from));
}
/** Count tasks per bucket (day / week) for a key like 'done' or 'start' inside a window. */
function bucketCounts(tasks, key, days) {
  const step = days > 31 ? 7 : 1, start = day(-(days - 1));
  const labels = []; for (let i = 0; i < days; i += step) labels.push(day(-(days - 1) + i));
  const values = labels.map(() => 0);
  tasks.forEach(t => {
    const d = t[key]; if (!d || d < start || d > today()) return;
    const b = Math.floor(diffDays(d, start) / step); if (values[b] !== undefined) values[b]++;
  });
  return { labels, values, step };
}

/* ---------- Activity, notifications, expenses ---------- */
function logActivity(text, type = 'info', taskId = '', staffId = '') {
  const a = store.get('activity', []); a.unshift({ id: Date.now(), ts: new Date().toISOString(), type, text, taskId, staffId });
  store.set('activity', a.slice(0, 80));
}
/** Notifications are addressed: to = 'admin' | a staff id | 'all'. link = page that the notification opens. */
function addNote(cat, text, to = 'admin', link = '') { const n = store.get('notes', []); n.unshift({ id: Date.now() + Math.random(), cat, text, date: today(), read: false, to, link }); store.set('notes', n.slice(0, 120)); }
const noteVisible = n => { const me = session(); return !!me && me.role !== 'customer' && (!n.to || n.to === 'all' || (me.role === 'admin' ? n.to === 'admin' : n.to === me.staffId)); };
const visibleNotes = () => store.get('notes', []).filter(noteVisible);
const getExpenses = () => store.get('expenses', []);
const getBudget = () => (store.get('budget', { monthly: 4500 })).monthly;

/* ---------- CSV + URL helpers ---------- */
function downloadCSV(name, rows) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const qs = () => new URLSearchParams(location.search);

/* ---------- Task persistence (shared by Tasks + Task detail pages) ---------- */
/** Create a task (admin only) and log the assignment. */
function createTask(data) {
  if (!isAdmin()) return null;
  const all = getTasks(), t = { id: nextId('T', all), done: null, remarks: '', progress: 0, status: 'Pending', ...data };
  applyProgress(t, { status: t.status, progress: t.progress });
  all.push(t); saveTasks(all);
  logActivity(`${staffName('S001')} assigned ${t.title} to ${staffName(t.staff)}`, 'created', t.id, t.staff);
  addNote('Task', `New task assigned to you: ${t.title}.`, t.staff, 'task-detail.html?id=' + t.id);
  return t;
}
/** Update a task. Staff may only change status, progress and remarks of their own tasks. */
function saveTaskChange(id, patch) {
  const me = session(), all = getTasks(), t = all.find(x => x.id === id);
  if (!t || !me || me.role === 'customer' || (!isAdmin() && t.staff !== me.staffId)) return null;
  if (t.repairId) return saveRepairTaskChange(t, patch);        // repair tasks are written through the repair module so both stay in sync
  const { status, progress, ...rest } = patch;
  const prev = { status: t.status, progress: t.progress, staff: t.staff };
  if (isAdmin()) Object.assign(t, rest); else if ('remarks' in rest) t.remarks = rest.remarks;
  applyProgress(t, { status, progress });
  saveTasks(all);
  if (t.staff !== prev.staff) { logActivity(`${t.title} was reassigned to ${staffName(t.staff)}`, 'created', t.id, t.staff); addNote('Task', `${t.title} was assigned to you.`, t.staff, 'task-detail.html?id=' + t.id); }
  if (t.status === 'Completed' && prev.status !== 'Completed') { logActivity(`${staffName(t.staff)} completed ${t.title}`, 'completed', t.id, t.staff); if (!isAdmin()) addNote('Task', `${staffName(t.staff)} completed ${t.title}.`); }
  else if (t.progress !== prev.progress) logActivity(`${staffName(t.staff)} updated ${t.title} to ${t.progress}%`, 'progress', t.id, t.staff);
  return t;
}
function deleteTask(id) {
  if (!isAdmin()) return false;
  const t = getTasks().find(x => x.id === id); if (!t || t.repairId) return false;   // repair tasks are removed by cancelling the repair
  saveTasks(getTasks().filter(x => x.id !== id)); logActivity(`${t.title} was deleted`, 'info', '', t.staff); return true;
}
