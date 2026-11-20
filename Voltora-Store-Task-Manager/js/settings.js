/* ==========================================================================
   VOLTORA - Settings: profile, password, display preferences, demo reset
   ========================================================================== */
if (layout('settings', { title: 'Settings', roles: ['admin', 'staff', 'customer'] })) {
  const me = session(), admin = isAdmin(), customer = isCustomer();
  const users = () => store.get('users', []), mine = () => users().find(u => u.email === me.email);
  const setErr = (el, msg) => { el.classList.toggle('is-invalid', !!msg); const fb = el.parentElement.querySelector('.invalid-feedback'); if (fb) fb.textContent = msg || ''; return !msg; };
  const u = mine(), st = me.staffId ? staffById(me.staffId) : null;
  $('#roleBadge').innerHTML = `<span class="bd ${admin ? 'bd-inprogress' : 'bd-active'}">${roleLabel(me.role)}</span>`;
  $('#pName').value = me.name; $('#pPhone').value = (u && u.phone) || ''; $('#pEmail').value = me.email; $('#pPos').value = st ? st.pos : (admin ? 'Administrator' : customer ? 'Customer' : '-');
  if (customer) { $('#pPos').previousElementSibling.textContent = 'Account type'; $('#pPhone').parentElement.insertAdjacentHTML('beforeend', '<div class="form-text">Your repairs are matched by your email or this phone number, so keep it the same as the number you used on your requests.</div>'); }
  if (admin) $('#dataCard').classList.remove('d-none');

  $('#profForm').addEventListener('submit', e => {
    e.preventDefault(); const name = $('#pName').value.trim();
    if (!setErr($('#pName'), name ? '' : 'Please enter your name.')) return toast('⚠ Unable to save profile. Please check the required fields.', 'error');
    const all = users(), a = all.find(x => x.email === me.email); a.name = name; a.phone = $('#pPhone').value.trim(); store.set('users', all);
    if (st) { const s = getStaff(); const r = s.find(x => x.id === st.id); r.name = name; r.phone = a.phone; store.set('staff', s); }
    const box = localStorage.getItem('vt_session') ? localStorage : sessionStorage; box.setItem('vt_session', JSON.stringify({ ...me, name, phone: a.phone }));
    toast('✓ Profile updated successfully.'); setTimeout(() => location.reload(), 700);
  });

  $('#pwForm').addEventListener('submit', e => {
    e.preventDefault(); const o = $('#pwOld').value, n = $('#pwNew').value, c = $('#pwCon').value, a = mine();
    const v = [setErr($('#pwOld'), a.h === hashPw(o) ? '' : 'Current password is incorrect.'),
      setErr($('#pwNew'), n.length >= 8 && /\d/.test(n) ? '' : 'Use at least 8 characters including a number.'),
      setErr($('#pwCon'), c === n && c ? '' : 'Passwords do not match.')];
    if (v.includes(false)) return toast('⚠ Unable to update password.', 'error');
    const all = users(); all.find(x => x.email === me.email).h = hashPw(n); store.set('users', all); $('#pwForm').reset(); toast('✓ Password updated successfully.');
  });

  /* ----- Appearance: display mode + accent palette (saved by theme.js, applied instantly) ----- */
  $('#accentOpts').innerHTML = Object.entries(ACCENTS).map(([k, a]) => `<div class="col-6 col-sm-4 col-xl-3"><button type="button" class="accent-opt w-100" data-accent="${k}" aria-pressed="false"><span class="sw" style="background:${a.p}"></span><span>${a.name}</span></button></div>`).join('');
  const syncTheme = () => { const t = Theme.get(); $$('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === t.mode)); $$('[data-accent]').forEach(b => b.setAttribute('aria-pressed', b.dataset.accent === t.accent)); $('#themeNote').textContent = `${ACCENTS[t.accent].name} · ${t.mode === 'system' ? 'following your device (' + Theme.resolved() + ')' : t.mode + ' mode'}. Saved in this browser and applied to every page.`; };
  $('#modeOpts').onclick = e => { const b = e.target.closest('[data-mode]'); if (b) { Theme.set({ mode: b.dataset.mode }); syncTheme(); toast('✓ Display mode changed.'); } };
  $('#accentOpts').onclick = e => { const b = e.target.closest('[data-accent]'); if (b) { Theme.set({ accent: b.dataset.accent }); syncTheme(); toast('✓ Accent colour changed.'); } };
  $('#themeReset').onclick = () => { Theme.reset(); syncTheme(); toast('✓ Default theme restored.'); };
  syncTheme();

  $('#rmSwitch').checked = store.get('rm', false); $('#scSwitch').checked = store.get('sc', false);
  $('#rmSwitch').onchange = e => { store.set('rm', e.target.checked); document.body.classList.toggle('reduce-motion', e.target.checked); toast(e.target.checked ? '✓ Motion reduced.' : '✓ Animations restored.'); };
  $('#scSwitch').onchange = e => { store.set('sc', e.target.checked); document.body.classList.toggle('sc', e.target.checked); };

  $('#resetBtn').onclick = async () => {
    if (await confirmBox({ title: 'Reset demo data?', body: 'All changes will be replaced by the original sample data and you will be signed out.', okText: 'Reset data' })) {
      Object.keys(localStorage).filter(k => k.startsWith('vt_') && !KEEP_KEYS.includes(k)).forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); location.href = 'login.html';
    }
  };
  Motion.page();
}
