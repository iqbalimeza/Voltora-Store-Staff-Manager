/* ==========================================================================
   VOLTORA - Schedule
   Month calendar + timeline of task deadlines and important dates, staff on
   shift for any selected day, and an editable weekly roster (admin).
   ========================================================================== */
if (layout('schedule', { title: 'Schedule' })) {
  const me = session(), admin = isAdmin(), customer = isCustomer();
  const sn = id => customer ? 'Voltora team' : staffName(id), fnm = id => customer ? 'Voltora team' : firstName(id);   // customers never see staff names
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ORDER = [1, 2, 3, 4, 5, 6, 0];
  let cur = new Date(); cur.setDate(1); let selected = today(), view = innerWidth < 768 ? 'timeline' : 'calendar', who = admin || customer ? '' : me.staffId;
  const evModal = new bootstrap.Modal('#evtModal');

  if (admin) { $('#addEvt').classList.remove('d-none'); $('#fStaff').innerHTML = '<option value="">All staff</option>' + getStaff().map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join(''); }
  else if (customer) { $('#fStaffWrap').classList.add('d-none'); $('#rosHead').closest('section').classList.add('d-none'); $('#evHead').textContent = 'Store opening hours'; }
  else { $('#fStaff').innerHTML = `<option value="${me.staffId}">${esc(me.name)} (me)</option>`; $('#fStaff').disabled = true; $('#rosSub').textContent += ' · Your row is highlighted.'; }
  $('#evtTitle').textContent = 'Add important date'; $('#eType').innerHTML = EVENT_TYPES.map(x => `<option>${x}</option>`).join('');

  const tasksOn = d => visibleTasks().filter(t => t.due === d && (!who || t.staff === who));
  const eventsOn = d => customer ? [] : store.get('events', []).filter(e => e.date === d);   // internal dates are staff only
  const onShift = (d, dow = parseD(d).getDay()) => { if (customer) return []; const R = store.get('roster', {}); return getStaff().filter(s => s.status === 'Active' && (!who || s.id === who) && (R[s.id] || [])[dow] && R[s.id][dow] !== 'Off'); };
  const chipT = t => `<div class="chip s-${slug(statusOf(t))}" title="${esc(t.title)} · ${esc(sn(t.staff))} · ${statusOf(t)}">${esc(t.title)}</div>`;
  const chipE = e => `<div class="chip ev" title="${esc(e.title)} (${esc(e.type)})"><i class="bi bi-star-fill"></i> ${esc(e.title)}</div>`;

  /* ----- calendar / timeline ----- */
  function drawCalendar() {
    const y = cur.getFullYear(), m = cur.getMonth(), first = new Date(y, m, 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    $('#monthLabel').textContent = first.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    $('#calHead2').innerHTML = ORDER.map(d => `<div>${DOW[d]}</div>`).join('');
    const cells = []; for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d); }
    $('#calGrid').innerHTML = cells.map(d => {
      const k = iso(d), T = tasksOn(k), E = eventsOn(k), items = [...E.map(chipE), ...T.map(chipT)], more = items.length - 2;
      return `<button class="cal-cell ${d.getMonth() !== m ? 'off' : ''} ${k === today() ? 'today' : ''} ${k === selected ? 'sel' : ''}" data-d="${k}" aria-label="${fmtDate(k)}: ${T.length} deadline${T.length === 1 ? '' : 's'}"><span class="dn">${d.getDate()}</span>${items.slice(0, 2).join('')}${more > 0 ? `<div class="small mu">+${more} more</div>` : ''}</button>`;
    }).join('');
  }
  function drawTimeline() {
    $('#monthLabel').textContent = 'Next 14 days';
    let h = ''; for (let i = 0; i < 14; i++) {
      const k = day(i), T = tasksOn(k), E = eventsOn(k), S = onShift(k);
      h += `<div class="agenda-day">${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : ''} ${parseD(k).toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'short' })}</div>`;
      h += E.map(e => `<div class="agenda-item"><span class="chip ev m-0">${esc(e.type)}</span><b>${esc(e.title)}</b></div>`).join('');
      h += T.map(t => `<a class="agenda-item text-reset" href="task-detail.html?id=${t.id}"><span class="chip s-${slug(statusOf(t))} m-0">${statusOf(t)}</span><span class="flex-grow-1">${esc(t.title)}</span><small class="mu hide-sm">${esc(fnm(t.staff))}</small></a>`).join('');
      if (!E.length && !T.length) h += `<div class="small mu px-1">No deadlines or events.</div>`;
      if (!customer) h += `<div class="small mu px-1"><i class="bi bi-people"></i> ${S.length} staff on shift</div>`;
    }
    $('#tlView').innerHTML = h;
  }
  function draw() {
    const cal = view === 'calendar'; $('#calView').classList.toggle('d-none', !cal); $('#tlView').classList.toggle('d-none', cal);
    ['prev', 'next', 'todayBtn'].forEach(id => $('#' + id).classList.toggle('d-none', !cal));
    $('#vCal').classList.toggle('active', cal); $('#vTl').classList.toggle('active', !cal); $('#vCal').setAttribute('aria-pressed', cal); $('#vTl').setAttribute('aria-pressed', !cal);
    cal ? drawCalendar() : drawTimeline(); drawSide(); drawRoster();
  }

  /* ----- side panels ----- */
  function drawSide() {
    const T = tasksOn(selected), E = eventsOn(selected), S = onShift(selected), R = store.get('roster', {}), dow = parseD(selected).getDay();
    $('#dayHead').textContent = selected === today() ? 'Today' : fmtDate(selected);
    $('#dayBox').innerHTML = `<div class="small fw-bold mu text-uppercase mb-1">Deadlines (${T.length})</div>` + (T.length ? T.map(t => `<a class="agenda-item text-reset" href="task-detail.html?id=${t.id}"><span class="chip s-${slug(statusOf(t))} m-0">${statusOf(t)}</span><span class="flex-grow-1 text-truncate">${esc(t.title)}</span></a>`).join('') : '<p class="small mu">No deadlines on this day.</p>')
      + (E.length ? `<div class="small fw-bold mu text-uppercase mb-1 mt-2">Important dates</div>` + E.map(e => `<div class="agenda-item"><i class="bi bi-star-fill text-warning"></i>${esc(e.title)}</div>`).join('') : '')
      + (customer ? '' : `<div class="small fw-bold mu text-uppercase mb-1 mt-2">Staff on shift (${S.length})</div>` + (S.length ? S.map(s => `<div class="agenda-item">${avatar(s.name, s.id, 'av-sm')}<span class="flex-grow-1">${esc(s.name)}</span><span class="shift ${R[s.id][dow]}" style="min-width:0">${SHIFT_TIME[R[s.id][dow]]}</span></div>`).join('') : '<p class="small mu mb-0">Nobody is rostered on this day.</p>'));
    const up = visibleTasks().filter(t => statusOf(t) !== 'Completed' && t.due <= day(7) && (!who || t.staff === who)).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);
    $('#upList').innerHTML = up.length ? up.map(t => { const dd = diffDays(t.due, today());
      return `<a class="agenda-item text-reset" href="task-detail.html?id=${t.id}"><div class="flex-grow-1 text-truncate"><div class="fw-semibold text-truncate">${esc(t.title)}</div><small class="mu">${esc(fnm(t.staff))} · ${dd < 0 ? `<span class="text-danger">${-dd}d overdue</span>` : dd === 0 ? 'Today' : `in ${dd}d`}</small></div>${badge(statusOf(t))}</a>`; }).join('')
      : emptyState('bi-check2-all', 'Nothing due soon', 'No open deadlines in the next 7 days.');
    if (customer) { $('#evList').innerHTML = '<div class="agenda-item"><i class="bi bi-clock text-warning"></i><div><div class="fw-semibold">Mon-Sat 10am-9pm</div><small class="mu">Sunday 11am-6pm</small></div></div><p class="small mu mt-2 mb-0">Your repair deadlines are the estimated completion dates shown on the calendar.</p>'; return; }
    const ev = store.get('events', []).filter(e => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
    $('#evList').innerHTML = ev.length ? ev.map(e => `<div class="agenda-item"><i class="bi bi-star-fill text-warning"></i><div class="flex-grow-1"><div class="fw-semibold">${esc(e.title)}</div><small class="mu">${fmtDate(e.date)} · ${esc(e.type)}</small></div>${admin ? `<button class="btn btn-o btn-icon btn-sm danger" data-delev="${e.id}" aria-label="Delete ${esc(e.title)}"><i class="bi bi-trash"></i></button>` : ''}</div>`).join('')
      : emptyState('bi-calendar-x', 'No upcoming dates', admin ? 'Add an important date to see it here.' : 'Nothing scheduled.');
  }

  /* ----- weekly roster (click a cell as admin to cycle Off > Morning > Evening > Full) ----- */
  function drawRoster() {
    const R = store.get('roster', {}), todayDow = new Date().getDay();
    $('#rosHeadRow').innerHTML = '<th>Staff</th>' + ORDER.map(d => `<th ${d === todayDow ? 'style="color:var(--accent)"' : ''}>${DOW[d]}${d === todayDow ? ' •' : ''}</th>`).join('');
    $('#rosBody').innerHTML = getStaff().filter(s => s.status !== 'Inactive').map(s => `<tr ${s.id === me.staffId ? 'style="background:var(--accent-soft)"' : ''}><td><div class="cell-user">${avatar(s.name, s.id, 'av-sm')}<div><b>${esc(s.name)}</b><small>${esc(s.pos)}${s.status === 'On Leave' ? ' · On leave' : ''}</small></div></div></td>` +
      ORDER.map(d => { const v = (R[s.id] || [])[d] || 'Off'; return `<td>${admin ? `<button class="shift ${v}" data-s="${s.id}" data-d="${d}" aria-label="${esc(s.name)} ${DOW[d]}: ${v}. Click to change">${v}</button>` : `<span class="shift ${v}">${v}</span>`}</td>`; }).join('') + '</tr>').join('');
  }
  $('#rosBody').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b || !admin) return;
    const R = store.get('roster', {}), arr = R[b.dataset.s] || Array(7).fill('Off'), d = +b.dataset.d;
    arr[d] = SHIFTS[(SHIFTS.indexOf(arr[d]) + 1) % SHIFTS.length]; R[b.dataset.s] = arr; store.set('roster', R);
    drawRoster(); drawSide(); if (view === 'calendar') drawCalendar(); else drawTimeline(); toast(`✓ ${staffName(b.dataset.s)}: ${DOW[d]} set to ${arr[d]}.`);
  });

  /* ----- interactions ----- */
  $('#calGrid').addEventListener('click', e => { const c = e.target.closest('[data-d]'); if (!c) return; selected = c.dataset.d; const d = parseD(selected); if (d.getMonth() !== cur.getMonth()) { cur = new Date(d.getFullYear(), d.getMonth(), 1); } draw(); });
  $('#prev').onclick = () => { cur.setMonth(cur.getMonth() - 1); draw(); }; $('#next').onclick = () => { cur.setMonth(cur.getMonth() + 1); draw(); };
  $('#todayBtn').onclick = () => { cur = new Date(); cur.setDate(1); selected = today(); draw(); };
  $('#vCal').onclick = () => { view = 'calendar'; draw(); }; $('#vTl').onclick = () => { view = 'timeline'; draw(); };
  $('#fStaff').onchange = e => { who = admin ? e.target.value : me.staffId; draw(); };
  $('#addEvt').onclick = () => { $('#evtForm').reset(); $$('.is-invalid', $('#evtModal')).forEach(x => x.classList.remove('is-invalid')); $('#eDate').value = selected; evModal.show(); };
  $('#evtForm').addEventListener('submit', e => {
    e.preventDefault(); const t = $('#eTitle').value.trim(), d = $('#eDate').value; let ok = true;
    $('#eTitle').classList.toggle('is-invalid', !t); $('#eDate').classList.toggle('is-invalid', !d); if (!t || !d) ok = false;
    if (!ok) return toast('⚠ Unable to save the date. Please check the required fields.', 'error');
    const ev = store.get('events', []); ev.push({ id: nextId('E', ev, 1), title: t, date: d, type: $('#eType').value }); store.set('events', ev);
    evModal.hide(); selected = d; cur = parseD(d); cur.setDate(1); draw(); toast('✓ Important date added successfully.');
  });
  $('#evList').addEventListener('click', async e => {
    const b = e.target.closest('[data-delev]'); if (!b) return; const ev = store.get('events', []).find(x => x.id === b.dataset.delev);
    if (await confirmBox({ title: 'Delete this date?', body: `"${ev.title}" will be removed from the schedule.`, okText: 'Delete' })) { store.set('events', store.get('events', []).filter(x => x.id !== ev.id)); draw(); toast('✓ Important date deleted.'); }
  });

  draw(); Motion.page();
}
