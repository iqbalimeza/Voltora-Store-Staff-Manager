/* ==========================================================================
   VOLTORA - Repair module (data + business rules)
   Collections (localStorage, prefix vt_):
     service_cats       service categories                       services          the 60-service catalogue (admin editable)
     repair_requests    what the customer submitted (immutable)  repair_jobs       status, staff, task link, quote, payments
     repair_fulfilments collection / delivery (separate status)   repair_history    every status change (kept permanently)
     tasks              the EXISTING task collection: an assigned repair job owns one task (task.repairId = job.id)
   One writer: updateRepair() changes the job AND its linked task in a single commit, so the staff view,
   manager dashboard, repair table, finance and reports always read the same records.
   Customer tracking, validation and roles are enforced in the browser only (static demo, see README).
   ========================================================================== */
const R_STATUS = ['New Request', 'Under Review', 'Approved', 'Pending Assignment', 'Assigned', 'In Progress', 'Waiting for Parts', 'Quality Check', 'Completed', 'Cancelled'];
const R_MEANING = {
  'New Request': 'Customer has submitted a repair request.', 'Under Review': 'Manager is reviewing the request.', 'Approved': 'Repair has been accepted.',
  'Pending Assignment': 'Awaiting technician assignment.', 'Assigned': 'Technician has been assigned.', 'In Progress': 'Repair is ongoing.',
  'Waiting for Parts': 'Required components are unavailable.', 'Quality Check': 'Repair is undergoing final inspection.', 'Completed': 'Repair work has been completed.', 'Cancelled': 'Repair request has been cancelled.'
};
const R_ACTIVE = ['Approved', 'Pending Assignment', 'Assigned', 'In Progress', 'Waiting for Parts', 'Quality Check'];
const R_WORKING = ['In Progress', 'Waiting for Parts', 'Quality Check'];
const R_STAFF_STATUS = ['In Progress', 'Waiting for Parts', 'Quality Check', 'Completed'];
const F_FLOW = { pickup: ['Awaiting Repair', 'Available for Collection', 'Collected Successfully'], delivery: ['Awaiting Repair', 'Delivery Requested', 'Preparing for Delivery', 'Out for Delivery', 'Delivered Successfully'] };
const F_DONE = ['Collected Successfully', 'Delivered Successfully'];
const DEV_CATS = ['Smartphone', 'Laptop', 'Desktop / Gaming PC', 'Accessory / Peripheral', 'Tablet', 'Smartwatch', 'Camera', 'Other'];
const PRICE_DISCLAIMER = 'Prices shown are estimates. Final repair costs may vary depending on device model, hardware requirements and the extent of damage. A final quotation will be provided after inspection.';
const TIME_DISCLAIMER = 'Repair duration is an estimate and may change depending on device condition, spare-part availability and repair complexity.';

/* ---------- Catalogue ---------- */
function seedCatalogue() {
  if (!store.get('service_cats')) store.set('service_cats', SV_CATS_DEFAULT);
  if (!store.get('services')) store.set('services', buildDefaultServices());
}
const getSvCats = () => store.get('service_cats', SV_CATS_DEFAULT);
const getServices = () => store.get('services', []);
const serviceById = id => getServices().find(s => s.id === id);
const svCat = id => getSvCats().find(c => c.id === id) || { id, name: id, short: id };
/* The Services interface uses no pictures: every category has a Bootstrap icon instead. */
const SV_ICONS = { smartphone: 'bi-phone', laptop: 'bi-laptop', desktop: 'bi-pc-display-horizontal', accessories: 'bi-keyboard', software: 'bi-hdd-stack', camera: 'bi-camera' };
const svIcon = cat => SV_ICONS[cat] || 'bi-tools';
const priceRange = s => `RM ${(+s.min).toLocaleString('en-MY')} – RM ${(+s.max).toLocaleString('en-MY')}`;

/* ---------- Collections ---------- */
const getJobs = () => store.get('repair_jobs', []);
const getReqs = () => store.get('repair_requests', []);
const getFul = () => store.get('repair_fulfilments', []);
const getHist = () => store.get('repair_history', []);
const jobById = id => getJobs().find(j => j.id === id);
const reqById = id => getReqs().find(r => r.id === id);
const fulById = id => getFul().find(f => f.repairId === id);
/** Job joined with its request, service and fulfilment (read model used by every page). */
function repairs() {
  const rq = Object.fromEntries(getReqs().map(r => [r.id, r])), fl = Object.fromEntries(getFul().map(f => [f.repairId, f])), sv = Object.fromEntries(getServices().map(s => [s.id, s]));
  return getJobs().map(j => ({ ...j, req: rq[j.id] || {}, ful: fl[j.id] || { method: 'pickup', status: 'Awaiting Repair' }, svc: sv[(rq[j.id] || {}).serviceId] || null }));
}
const repairById = id => repairs().find(r => r.id === id);
/** A customer owns a repair when the request used the same email or the same phone number as the account. */
const ownsRepair = (r, me) => { const dg = x => String(x || '').replace(/\D/g, ''); return !!me && ((me.email && String(r.req.email || '').toLowerCase() === String(me.email).toLowerCase()) || (dg(me.phone).length >= 9 && dg(r.req.phone) === dg(me.phone))); };
const visibleRepairs = () => { const me = session(); return isAdmin() ? repairs() : (me && me.role === 'customer') ? repairs().filter(r => ownsRepair(r, me)) : repairs().filter(r => r.staff === (me || {}).staffId); };
const taskById = id => getTasks().find(t => t.id === id);
const isRepairOverdue = r => r.staff && R_ACTIVE.includes(r.status) && r.due && r.due < today();
const phoneDigits = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('60')) d = '0' + d.slice(2); return d; };
const deviceLabel = r => [r.req.brand, r.req.model].filter(Boolean).join(' ') || r.req.deviceCat || '-';
const sumPaid = j => sum((j.payments || []).map(p => +p.amt || 0));
const money = n => 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function nextRepairId() {
  const y = new Date().getFullYear(), pre = `VR-${y}-`;
  const n = Math.max(0, ...getReqs().filter(r => r.id.startsWith(pre)).map(r => +r.id.slice(pre.length) || 0));
  return pre + String(n + 1).padStart(4, '0');
}
function hist(repairId, kind, status, text, by, at) {
  return { id: 'H' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), repairId, kind, status, text, by: by || 'System', ts: at || new Date().toISOString() };
}
const actorName = () => { const m = session(); return m ? m.name : 'Customer'; };

/* ---------- Customer request ---------- */
/* ---------- Customer photos of the damaged device ----------
   Stored separately from the request so a full storage quota can never lose
   the repair itself; each photo is already resized and compressed in the form. */
const getPhotos = () => store.get('repair_photos', {});
const repairPhotos = id => getPhotos()[id] || [];
function savePhotos(id, list) {
  if (!list || !list.length) return true;
  try { const all = getPhotos(); all[id] = list; store.set('repair_photos', all); return true; }
  catch { return false; }                      /* localStorage full: keep the request, drop the photos */
}

function createRepairRequest(f) {
  const svc = serviceById(f.serviceId), id = nextRepairId(), now = new Date().toISOString();
  const req = { id, createdAt: now, name: f.name, phone: f.phone, email: f.email, deviceCat: f.deviceCat, brand: f.brand, model: f.model, serviceId: f.serviceId, serviceName: svc ? svc.name : f.serviceId, problem: f.problem, prefDate: f.prefDate || '', notes: f.notes || '', fulfil: f.fulfil, delivery: f.fulfil === 'delivery' ? f.delivery : null };
  const job = { id, status: 'New Request', priority: 'Medium', staff: '', taskId: '', start: '', due: '', estDuration: svc ? svc.duration : '', quoteMin: svc ? svc.min : 0, quoteMax: svc ? svc.max : 0, approvedPrice: null, payments: [], partsCost: 0, deliveryCost: 0, progress: 0, techRemarks: '', managerNote: '', createdAt: now, updatedAt: now, completedAt: null };
  store.set('repair_requests', [...getReqs(), req]); store.set('repair_jobs', [...getJobs(), job]);
  store.set('repair_fulfilments', [...getFul(), { repairId: id, method: f.fulfil, status: 'Awaiting Repair', trackingRef: '', updatedAt: now }]);
  const photoOk = savePhotos(id, f.photos);
  req.photos = photoOk ? (f.photos || []).length : 0;
  store.set('repair_requests', [...getReqs().filter(x => x.id !== id), req]);
  store.set('repair_history', [...getHist(), hist(id, 'repair', 'New Request', `Repair request submitted by the customer.${req.photos ? ' ' + req.photos + ' photo(s) attached.' : ''}`, f.name, now)]);
  addNote('Repair', `New repair request ${id}: ${req.serviceName} (${deviceLabel({ req })}).`, 'admin', 'repairs.html?id=' + id);
  logActivity(`New repair request ${id} for ${req.serviceName}`, 'created');
  return req;
}

/* ---------- Task link ---------- */
const TASK_FROM_REPAIR = { 'Assigned': ['Pending', 0], 'In Progress': ['In Progress'], 'Waiting for Parts': ['In Progress'], 'Quality Check': ['In Progress'], 'Completed': ['Completed', 100] };
function taskFields(j, req, svcName) {
  const m = TASK_FROM_REPAIR[j.status] || ['Pending', 0];
  const t = { title: `${j.id} · ${svcName} (${deviceLabel({ req })})`, desc: `Customer: ${req.name} · ${req.phone}\nDevice: ${req.deviceCat} ${deviceLabel({ req })}\nProblem: ${req.problem}`, cat: 'Repair', staff: j.staff, pri: j.priority, start: j.start, due: j.due, repairId: j.id, remarks: j.techRemarks || '' };
  t.status = m[0]; t.progress = j.status === 'Completed' ? 100 : j.status === 'Assigned' ? 0 : Math.max(j.progress, j.status === 'Quality Check' ? 90 : 10);
  if (t.status === 'Pending') t.progress = 0;
  return t;
}

/* ---------- The single writer: job + task + fulfilment + history + notifications ---------- */
/**
 * updateRepair(id, patch)
 * patch: status, progress, techRemarks (staff + admin); priority, due, start, estDuration, approvedPrice, managerNote, staff (admin)
 * Staff may only change status (R_STAFF_STATUS), progress and remarks on their own job.
 */
function updateRepair(id, patch, opts = {}) {
  const me = session(), jobs = getJobs(), j = jobs.find(x => x.id === id), req = reqById(id);
  if (!j || !req) return null;
  if (me && me.role === 'customer') return null;                       // customers are read only
  if (me && !isAdmin() && j.staff !== me.staffId) return null;
  const admin = !me || isAdmin(), by = opts.by || actorName(), prev = { status: j.status, staff: j.staff, progress: j.progress, due: j.due, priority: j.priority };
  const p = { ...patch }, oldRem = j.techRemarks;
  if (!admin) { ['priority', 'due', 'start', 'estDuration', 'approvedPrice', 'managerNote', 'staff', 'partsCost', 'deliveryCost'].forEach(k => delete p[k]); if (p.status && !R_STAFF_STATUS.includes(p.status)) delete p.status; }
  Object.assign(j, Object.fromEntries(Object.entries(p).filter(([k]) => !['status', 'progress'].includes(k))));
  let st = p.status || j.status, pr = p.progress !== undefined ? Math.max(0, Math.min(100, Math.round(+p.progress || 0))) : j.progress;
  if (!p.status && p.progress !== undefined && j.staff && !['Completed', 'Cancelled'].includes(j.status)) {      // progress drives status when no explicit status
    if (pr >= 100) st = 'Completed'; else if (pr > 0 && (j.status === 'Assigned')) st = 'In Progress';
  }
  if (st === 'Completed') pr = 100; else if (pr === 100) pr = 90;
  if (st === 'In Progress' && pr === 0) pr = 10;
  if (st === 'Quality Check' && pr < 90) pr = 90;
  if (st === 'Assigned') pr = 0;
  j.status = st; j.progress = pr; j.updatedAt = new Date().toISOString();
  if (st === 'Completed' && prev.status !== 'Completed') j.completedAt = today();
  if (st !== 'Completed') j.completedAt = null;

  /* linked task (reuses the existing task collection) */
  let tasks = getTasks(), t = tasks.find(x => x.id === j.taskId);
  if (st === 'Cancelled') { if (t) { tasks = tasks.filter(x => x.id !== t.id); t = null; } j.taskId = ''; }
  else if (j.staff && ['Assigned', ...R_WORKING, 'Completed'].includes(st)) {
    const svc = serviceById(req.serviceId), f = taskFields(j, req, req.serviceName || (svc && svc.name) || 'Repair');
    if (!t) { t = { id: nextId('T', tasks), done: null, ...f }; tasks.push(t); j.taskId = t.id; }
    else { Object.assign(t, f); }
    t.done = st === 'Completed' ? (j.completedAt || today()) : null;
  }
  /* fulfilment is a separate record: starts when the repair completes, resets if re-opened */
  const fl = getFul(), fu = fl.find(x => x.repairId === id);
  if (fu) {
    if (st === 'Completed' && prev.status !== 'Completed' && fu.status === 'Awaiting Repair') { fu.status = F_FLOW[fu.method][1]; fu.updatedAt = new Date().toISOString(); }
    if (st !== 'Completed' && prev.status === 'Completed' && !F_DONE.includes(fu.status)) { fu.status = 'Awaiting Repair'; fu.updatedAt = new Date().toISOString(); }
  }
  const H = [...getHist()];
  if (st !== prev.status) H.push(hist(id, 'repair', st, opts.text || R_MEANING[st], by));
  if (j.staff !== prev.staff && j.staff) H.push(hist(id, 'repair', st, `Assigned to ${staffName(j.staff)}.`, by));
  if (p.techRemarks !== undefined && p.techRemarks !== oldRem && p.techRemarks && !opts.quiet) H.push(hist(id, 'note', st, 'Technician remarks updated.', by));
  /* commit everything together */
  store.set('repair_jobs', jobs); store.set('tasks', tasks); store.set('repair_fulfilments', fl); store.set('repair_history', H.slice(-800));
  /* notifications + activity */
  const lbl = `${id} (${req.serviceName})`, tid = j.taskId;
  if (st !== prev.status) {
    logActivity(`${lbl}: ${prev.status} → ${st}`, st === 'Completed' ? 'completed' : 'progress', tid, j.staff);
    if (me && me.role === 'staff' && st !== 'Completed') addNote('Repair', `${staffName(j.staff)} updated ${lbl} to ${st}.`, 'admin', 'repairs.html?id=' + id);
    if (st === 'Completed' && me && me.role === 'staff') addNote('Repair', `${staffName(j.staff)} completed repair ${lbl}. ${fu && fu.method === 'delivery' ? 'Delivery is pending.' : 'Device is awaiting collection.'}`, 'admin', 'repairs.html?id=' + id);
    if (me && me.role === 'admin' && j.staff && st !== 'Completed') addNote('Repair', st === 'Cancelled' ? `Repair ${lbl} was cancelled.` : `Repair ${lbl} status changed to ${st}.`, j.staff, tid ? 'task-detail.html?id=' + tid : '');
  }
  if (j.staff && j.staff !== prev.staff && st !== 'Cancelled') addNote('Repair', `New repair task assigned: ${lbl}.`, j.staff, tid ? 'task-detail.html?id=' + tid : '');
  else if (admin && j.staff && (j.due !== prev.due || j.priority !== prev.priority) && !opts.quiet && st === prev.status) addNote('Repair', `Repair task ${lbl} was updated (due ${fmtDate(j.due)}, ${j.priority} priority).`, j.staff, tid ? 'task-detail.html?id=' + tid : '');
  return repairById(id);
}

/* ---------- Manager actions ---------- */
const startReview = id => updateRepair(id, { status: 'Under Review' });
function approveRepair(id, o) {
  // approve; if a technician is chosen the task is created straight away, otherwise the job waits for assignment
  const base = { priority: o.priority, due: o.due, start: o.start || today(), estDuration: o.estDuration, approvedPrice: o.approvedPrice === '' ? null : +o.approvedPrice, managerNote: o.managerNote || '' };
  updateRepair(id, { ...base, status: 'Approved' }, { text: 'Repair approved by the manager.' });
  return o.staff ? updateRepair(id, { ...base, staff: o.staff, status: 'Assigned' }, { text: `Technician assigned: ${staffName(o.staff)}.` }) : updateRepair(id, { status: 'Pending Assignment' });
}
const assignRepair = (id, o) => updateRepair(id, { staff: o.staff, priority: o.priority, due: o.due, start: o.start || today(), status: ['Approved', 'Pending Assignment', 'Assigned'].includes(jobById(id).status) ? 'Assigned' : jobById(id).status }, { text: `Technician assigned: ${staffName(o.staff)}.` });
const cancelRepair = (id, reason) => updateRepair(id, { status: 'Cancelled', managerNote: reason || '' }, { text: 'Repair request cancelled' + (reason ? ': ' + reason : '.') });

function setFulfilmentMethod(id, method) {
  const fl = getFul(), f = fl.find(x => x.repairId === id), j = jobById(id); if (!f || f.method === method) return;
  f.method = method; f.updatedAt = new Date().toISOString(); f.trackingRef = method === 'pickup' ? '' : f.trackingRef;
  f.status = j.status === 'Completed' ? F_FLOW[method][1] : 'Awaiting Repair';
  store.set('repair_fulfilments', fl);
  store.set('repair_history', [...getHist(), hist(id, 'fulfilment', f.status, method === 'pickup' ? 'Fulfilment set to store collection.' : 'Fulfilment set to delivery.', actorName())]);
}
function setFulfilmentStatus(id, status, trackingRef) {
  const fl = getFul(), f = fl.find(x => x.repairId === id), j = jobById(id); if (!f || !F_FLOW[f.method].includes(status)) return false;
  if (j.status !== 'Completed' && status !== 'Awaiting Repair') return false;           // cannot collect/deliver before the repair is completed
  const changed = f.status !== status; f.status = status; f.updatedAt = new Date().toISOString(); if (trackingRef !== undefined) f.trackingRef = String(trackingRef).trim();
  store.set('repair_fulfilments', fl);
  if (changed) {
    store.set('repair_history', [...getHist(), hist(id, 'fulfilment', status, `Fulfilment: ${status}.`, actorName())]);
    const r = repairById(id); if (r.staff) addNote('Repair', `Repair ${id}: fulfilment is now "${status}".`, r.staff);
    logActivity(`${id} fulfilment: ${status}`, 'info', j.taskId, j.staff);
  }
  return true;
}
function recordPayment(id, amt, date, method) {
  const jobs = getJobs(), j = jobs.find(x => x.id === id); if (!j || !(+amt > 0)) return false;
  j.payments = [...(j.payments || []), { amt: +amt, date: date || today(), method: method || 'Cash' }]; store.set('repair_jobs', jobs);
  store.set('repair_history', [...getHist(), hist(id, 'note', j.status, `Payment recorded: ${money(amt)}.`, actorName())]); return true;
}
function setRepairCosts(id, parts, delivery) { const jobs = getJobs(), j = jobs.find(x => x.id === id); if (!j) return; j.partsCost = Math.max(0, +parts || 0); j.deliveryCost = Math.max(0, +delivery || 0); store.set('repair_jobs', jobs); }

/* ---------- Customer tracking (ID + registered phone number) ---------- */
function trackRepair(id, phone) {
  const r = repairById(String(id || '').trim().toUpperCase());
  if (!r || !r.req.phone || phoneDigits(r.req.phone) !== phoneDigits(phone) || phoneDigits(phone).length < 9) return null;
  const events = getHist().filter(h => h.repairId === r.id && h.kind !== 'note').map(h => ({ ts: h.ts, status: h.status, kind: h.kind, text: h.text }));
  return { id: r.id, service: r.req.serviceName, device: deviceLabel(r), submitted: r.createdAt, status: r.status, due: r.due, estDuration: r.estDuration, method: r.ful.method, fulfil: r.ful.status, trackingRef: r.ful.trackingRef, events, completedAt: r.completedAt, approvedPrice: r.approvedPrice };
}
const TRACK_LIMIT = { max: 5, lockMs: 30000 };
function trackGuard(ok) {
  const k = 'vt_track', s = JSON.parse(sessionStorage.getItem(k) || '{"n":0,"until":0}');
  if (ok === undefined) return s.until > Date.now() ? Math.ceil((s.until - Date.now()) / 1000) : 0;
  if (ok) s.n = 0; else { s.n++; if (s.n >= TRACK_LIMIT.max) { s.until = Date.now() + TRACK_LIMIT.lockMs; s.n = 0; } }
  sessionStorage.setItem(k, JSON.stringify(s)); return 0;
}

/* ---------- Analytics (dashboard, reports, finance) ---------- */
function repairStats(list = repairs()) {
  const c = f => list.filter(f).length;
  return {
    total: list.length, newReq: c(r => ['New Request', 'Under Review'].includes(r.status)), active: c(r => R_ACTIVE.includes(r.status)), working: c(r => R_WORKING.includes(r.status)),
    completed: c(r => r.status === 'Completed'), cancelled: c(r => r.status === 'Cancelled'), overdue: c(isRepairOverdue),
    ready: c(r => r.ful.status === 'Available for Collection'), deliveries: c(r => ['Delivery Requested', 'Preparing for Delivery', 'Out for Delivery'].includes(r.ful.status))
  };
}
function repairFinance(list = repairs()) {
  const live = list.filter(r => r.status !== 'Cancelled'), months = {};
  const m = k => months[k] || (months[k] = { received: 0, costs: 0 });
  live.forEach(r => { (r.payments || []).forEach(p => { m(monthKey(p.date)).received += +p.amt; }); const k = monthKey(r.completedAt || r.createdAt.slice(0, 10)); m(k).costs += (+r.partsCost || 0) + (+r.deliveryCost || 0); });
  const approved = sum(live.filter(r => r.approvedPrice != null).map(r => +r.approvedPrice)), received = sum(live.map(sumPaid));
  const owed = sum(live.filter(r => r.approvedPrice != null).map(r => Math.max(0, +r.approvedPrice - sumPaid(r))));
  return { quotedMin: sum(live.filter(r => R_ACTIVE.includes(r.status) || ['New Request', 'Under Review'].includes(r.status)).map(r => +r.quoteMin || 0)), quotedMax: sum(live.filter(r => R_ACTIVE.includes(r.status) || ['New Request', 'Under Review'].includes(r.status)).map(r => +r.quoteMax || 0)), approved, received, outstanding: owed, parts: sum(live.map(r => +r.partsCost || 0)), delivery: sum(live.map(r => +r.deliveryCost || 0)), months };
}
function repairStaffStats(id, list = repairs()) {
  const a = list.filter(r => r.staff === id && r.status !== 'Cancelled'), done = a.filter(r => r.status === 'Completed');
  return { assigned: a.length, completed: done.length, pending: a.filter(r => ['Assigned'].includes(r.status)).length, working: a.filter(r => R_WORKING.includes(r.status)).length, overdue: a.filter(isRepairOverdue).length, rate: a.length ? Math.round(done.length / a.length * 100) : 0 };
}

/* ---------- Reminders (due soon / overdue / waiting review), once per day per item ---------- */
function runRepairReminders() {
  const seen = store.get('remind', {}), t0 = today(); let ch = false;
  const once = (k, fn) => { if (seen[k]) return; seen[k] = t0; fn(); ch = true; };
  repairs().forEach(r => {
    if (!R_ACTIVE.includes(r.status) || !r.due) return;
    const d = diffDays(r.due, t0), link = r.taskId ? 'task-detail.html?id=' + r.taskId : '';
    if (d < 0) once(`ov:${r.id}:${t0}`, () => { addNote('Repair', `Repair ${r.id} is overdue (due ${fmtShort(r.due)}).`, 'admin', 'repairs.html?id=' + r.id); if (r.staff) addNote('Repair', `Repair ${r.id} is overdue.`, r.staff, link); });
    else if (d <= 1 && r.staff) once(`due:${r.id}:${t0}`, () => addNote('Repair', `Repair ${r.id} is due ${d === 0 ? 'today' : 'tomorrow'}.`, r.staff, link));
  });
  const wait = repairs().filter(r => r.status === 'New Request').length;
  if (wait) once(`rev:${t0}`, () => addNote('Repair', `${wait} repair request${wait > 1 ? 's are' : ' is'} awaiting review.`, 'admin', 'repairs.html?status=New%20Request'));
  if (ch) store.set('remind', Object.fromEntries(Object.entries(seen).slice(-200)));
}

/* ---------- Near-real-time refresh: storage event (other tabs) + 10 s polling ---------- */
const Sync = {
  sig: () => ['repair_jobs', 'repair_fulfilments', 'tasks', 'repair_history'].map(k => (localStorage.getItem('vt_' + k) || '').length + ':' + (localStorage.getItem('vt_' + k) || '').slice(-40)).join('|'),
  watch(fn, ms = 10000) {
    let last = Sync.sig(); const check = () => { const s = Sync.sig(); if (s !== last) { last = s; fn(); } };
    window.addEventListener('storage', e => { if (e.key && e.key.startsWith('vt_')) check(); });
    setInterval(() => { if (!document.hidden) check(); }, ms);
  }
};

/* ---------- Badges ---------- */
const rBadge = s => `<span class="bd bd-${slug(s)}">${esc(s)}</span>`;

/* ---------- Seed demo repairs (called from seed()) ---------- */
function seedRepairs(staffIds) {
  const D = off => day(off), T = off => day(off) + 'T10:00:00';
  const P = {
    A: ['Jamal Ariffin', '0123456789'], B: ['Ravi Chandran', '0171234567'], C: ['Siti Aminah', '0198765432'], D: ['Lim Jun Hao', '0165551234'], E: ['Farah Nabila', '0112233445'],
    F: ['Kumar Selvam', '0139988776'], G: ['Hannah Wong', '0145556677'], H: ['Zulkifli Ahmad', '0187654321'], I: ['Aisyah Rahman', '0126677889'], J: ['Daniel Ong', '0103344556']
  };
  // [serviceId, person, devCat, brand, model, problem, fulfil, status, staff, createdOffset, startOffset, dueOffset, doneOffset, progress, priority, approved, paid, parts, delivery, ful]
  const rows = [
    ['SV001', 'A', 'Smartphone', 'Samsung', 'Galaxy A54', 'Screen cracked after a fall; touch still works in the middle only.', 'pickup', 'Completed', 'S009', -150, -149, -148, -148, 100, 'Medium', 280, 280, 150, 0, 'Collected Successfully'],
    ['SV012', 'B', 'Laptop', 'Lenovo', 'IdeaPad 3', 'Several keys do not respond, spilled tea last week.', 'pickup', 'Completed', 'S010', -128, -127, -123, -124, 100, 'Medium', 240, 240, 130, 0, 'Collected Successfully'],
    ['SV018', 'C', 'Laptop', 'Acer', 'Aspire 5', 'Very slow start-up, wants a faster SSD.', 'delivery', 'Completed', 'S010', -105, -104, -102, -103, 100, 'Low', 320, 320, 210, 12, 'Delivered Successfully'],
    ['SV002', 'D', 'Smartphone', 'Apple', 'iPhone 12', 'Battery drains within a few hours.', 'pickup', 'Completed', 'S009', -92, -91, -90, -90, 100, 'Medium', 180, 180, 95, 0, 'Collected Successfully'],
    ['SV026', 'E', 'Desktop / Gaming PC', 'Custom', 'Ryzen 5 build', 'Very loud fans and high temperatures when gaming.', 'pickup', 'Completed', 'S007', -76, -75, -74, -74, 100, 'Low', 90, 90, 0, 0, 'Collected Successfully'],
    ['SV036', 'F', 'Accessory / Peripheral', 'Dell', 'U2419H monitor', 'Screen flickers then turns off.', 'pickup', 'Completed', 'S010', -62, -61, -56, -57, 100, 'Medium', 210, 210, 120, 0, 'Collected Successfully'],
    ['SV051', 'G', 'Camera', 'Canon', 'EOS 750D', 'Rear LCD cracked.', 'delivery', 'Completed', 'S009', -50, -49, -42, -43, 100, 'Medium', 330, 330, 200, 15, 'Delivered Successfully'],
    ['SV004', 'H', 'Smartphone', 'Xiaomi', 'Redmi Note 11', 'Rear camera shows a black screen.', 'pickup', 'Completed', 'S009', -40, -39, -37, -37, 100, 'Medium', 160, 160, 90, 0, 'Collected Successfully'],
    ['SV011', 'I', 'Laptop', 'HP', 'Pavilion 14', 'Cracked laptop screen after being pressed in a bag.', 'delivery', 'Completed', 'S010', -30, -29, -24, -25, 100, 'High', 520, 520, 340, 14, 'Delivered Successfully'],
    ['SV016', 'J', 'Laptop', 'ASUS', 'VivoBook 15', 'Overheats and the fan is very loud.', 'pickup', 'Completed', 'S007', -24, -23, -22, -22, 100, 'Medium', 70, 70, 0, 0, 'Collected Successfully'],
    ['SV003', 'A', 'Smartphone', 'Oppo', 'A78', 'Charges only when the cable is held at an angle.', 'pickup', 'Completed', 'S009', -14, -13, -11, -12, 100, 'Medium', 120, 120, 40, 0, 'Available for Collection'],
    ['SV023', 'B', 'Desktop / Gaming PC', 'Custom', 'Intel i5 build', 'New graphics card needs to be fitted.', 'pickup', 'Completed', 'S007', -9, -8, -7, -7, 100, 'Low', 70, 70, 0, 0, 'Available for Collection'],
    ['SV013', 'C', 'Laptop', 'Dell', 'Inspiron 15', 'Battery lasts under 30 minutes.', 'delivery', 'Completed', 'S010', -8, -7, -5, -2, 100, 'Medium', 260, 0, 160, 12, 'Out for Delivery'],
    ['SV001', 'D', 'Smartphone', 'Apple', 'iPhone 13', 'Screen cracked, Face ID still works.', 'pickup', 'In Progress', 'S009', -4, -3, 1, null, 55, 'High', 380, 0, 0, 0, 'Awaiting Repair'],
    ['SV036', 'E', 'Accessory / Peripheral', 'LG', '24MP60 monitor', 'No picture, power light blinks.', 'pickup', 'Waiting for Parts', 'S010', -6, -5, 3, null, 40, 'Medium', 200, 0, 0, 0, 'Awaiting Repair'],
    ['SV054', 'F', 'Camera', 'Nikon', 'D3500', 'Shutter makes a grinding noise and photos are dark.', 'delivery', 'Quality Check', 'S009', -10, -9, 0, null, 90, 'High', 420, 100, 180, 0, 'Awaiting Repair'],
    ['SV008', 'G', 'Smartphone', 'Samsung', 'Galaxy S21', 'Back glass shattered.', 'pickup', 'Assigned', 'S007', -2, -1, 4, null, 0, 'Medium', 250, 0, 0, 0, 'Awaiting Repair'],
    ['SV018', 'H', 'Laptop', 'Lenovo', 'ThinkPad E14', 'Please upgrade to a 512GB SSD and move my files.', 'pickup', 'Assigned', 'S010', -1, 0, 5, null, 0, 'Low', 330, 0, 0, 0, 'Awaiting Repair'],
    ['SV003', 'H', 'Smartphone', 'Vivo', 'Y36', 'Phone sometimes does not charge.', 'pickup', 'Pending Assignment', '', -2, null, null, null, 0, 'Medium', null, 0, 0, 0, 'Awaiting Repair'],
    ['SV056', 'I', 'Camera', 'Sony', 'A6000', 'Memory card is not detected.', 'delivery', 'Under Review', '', -1, null, null, null, 0, 'Medium', null, 0, 0, 0, 'Awaiting Repair'],
    ['SV041', 'J', 'Laptop', 'HP', '250 G8', 'Need Microsoft Office installed.', 'pickup', 'New Request', '', 0, null, null, null, 0, 'Low', null, 0, 0, 0, 'Awaiting Repair'],
    ['SV009', 'A', 'Smartphone', 'Huawei', 'Nova 9', 'Phone fell in the sink, now turns off randomly.', 'delivery', 'New Request', '', 0, null, null, null, 0, 'High', null, 0, 0, 0, 'Awaiting Repair'],
    ['SV036', 'D', 'Accessory / Peripheral', 'Samsung', 'Odyssey G5', 'Broken screen after moving house.', 'pickup', 'Cancelled', '', -20, null, null, null, 0, 'Low', null, 0, 0, 0, 'Awaiting Repair']
  ];
  const svs = getServices(), reqs = [], jobs = [], fuls = [], H = [], tasks = getTasks().slice(); let yrCount = {};
  rows.forEach(r => {
    const svc = svs.find(s => s.id === r[0]), who = P[r[1]], dt = new Date(); dt.setDate(dt.getDate() + r[9]); const y = dt.getFullYear();
    yrCount[y] = (yrCount[y] || 0) + 1; const id = `VR-${y}-${String(yrCount[y]).padStart(4, '0')}`, created = T(r[9]);
    const fulfil = r[6], st = r[7];
    reqs.push({ id, createdAt: created, name: who[0], phone: who[1], email: who[0] === 'Jamal Ariffin' ? 'customer@voltora.my' : who[0].split(' ')[0].toLowerCase() + '@example.com', deviceCat: r[2], brand: r[3], model: r[4], serviceId: r[0], serviceName: svc.name, problem: r[5], prefDate: '', notes: '', fulfil, delivery: fulfil === 'delivery' ? { address: `${10 + r[9] * -1} Jalan Setia, Taman Maju, Selangor`, recipient: who[0], phone: who[1], notes: '' } : null });
    const job = { id, status: st, priority: r[14], staff: r[8], taskId: '', start: r[10] === null ? '' : D(r[10]), due: r[11] === null ? '' : D(r[11]), estDuration: svc.duration, quoteMin: svc.min, quoteMax: svc.max, approvedPrice: r[15], payments: r[16] > 0 ? [{ amt: r[16], date: r[12] === null ? D(r[9] + 2) : D(r[12]), method: 'Cash' }] : [], partsCost: r[17], deliveryCost: r[18], progress: r[13], techRemarks: st === 'Waiting for Parts' ? 'Replacement panel ordered from the supplier.' : st === 'Quality Check' ? 'Shutter replaced, running final test shots.' : '', managerNote: '', createdAt: created, updatedAt: created, completedAt: r[12] === null ? null : D(r[12]) };
    if (r[8] && st !== 'Cancelled') {
      const tk = { id: nextId('T', tasks), done: job.completedAt, ...taskFields(job, reqs[reqs.length - 1], svc.name) };
      tasks.push(tk); job.taskId = tk.id;
    }
    jobs.push(job);
    fuls.push({ repairId: id, method: fulfil, status: r[19], trackingRef: r[19] === 'Out for Delivery' ? 'Own driver – Adam Zikri' : '', updatedAt: created });
    H.push(hist(id, 'repair', 'New Request', 'Repair request submitted by the customer.', who[0], created));
    const chain = { 'Under Review': ['Under Review'], 'Pending Assignment': ['Under Review', 'Approved', 'Pending Assignment'], 'Cancelled': ['Under Review', 'Cancelled'] }[st] || ['Under Review', 'Approved', 'Assigned', ...(st === 'Assigned' ? [] : ['In Progress']), ...(['Waiting for Parts', 'Quality Check', 'Completed'].includes(st) ? [st] : [])];
    chain.forEach((s, i) => H.push(hist(id, 'repair', s, R_MEANING[s], 'Iqbal Hakimi', T(Math.min(0, r[9] + i)))));
    if (r[19] !== 'Awaiting Repair') F_FLOW[fulfil].slice(1, F_FLOW[fulfil].indexOf(r[19]) + 1).forEach((s, i) => H.push(hist(id, 'fulfilment', s, `Fulfilment: ${s}.`, 'Manager', T(Math.min(0, (r[12] ?? r[9]) + i)))));
  });
  store.set('repair_requests', reqs); store.set('repair_jobs', jobs); store.set('repair_fulfilments', fuls); store.set('repair_history', H); store.set('tasks', tasks);
}

/** Task edits (Tasks page / Task detail) on a repair task are translated into repair updates. */
function saveRepairTaskChange(t, patch) {
  const j = jobById(t.repairId); if (!j) return null;
  const q = {};
  if ('remarks' in patch) q.techRemarks = patch.remarks;
  if (isAdmin()) { if (patch.pri) q.priority = patch.pri; if (patch.due) q.due = patch.due; if (patch.start) q.start = patch.start; if (patch.staff && patch.staff !== j.staff) q.staff = patch.staff; }
  const pr = patch.progress === undefined ? undefined : Math.max(0, Math.min(100, Math.round(+patch.progress || 0)));
  if (patch.status === 'Completed' || pr === 100) q.status = 'Completed';
  else if (patch.status === 'In Progress') q.status = R_WORKING.includes(j.status) ? j.status : 'In Progress';
  else if (patch.status === 'Pending' && !(pr > 0)) q.status = 'Assigned';
  else if (pr > 0 && j.status === 'Assigned') q.status = 'In Progress';
  if (pr !== undefined && q.status !== 'Assigned') q.progress = pr;
  updateRepair(j.id, q);
  return taskById(t.id);
}
