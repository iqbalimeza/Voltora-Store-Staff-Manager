/* ==========================================================================
   VOLTORA - Authentication page (login, register, simulated password reset)
   Credentials are checked against hashed accounts kept in localStorage.
   This is a front-end prototype: it demonstrates the flow, not real security.
   ========================================================================== */
seed();
if (session()) location.href = 'dashboard.html';

const alertBox = $('#alertBox');
function showAlert(msg, type = 'danger') {
  alertBox.className = `alert alert-${type}`; alertBox.innerHTML = `<i class="bi ${type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-2"></i>${esc(msg)}`;
}
const clearAlert = () => alertBox.classList.add('d-none');
const setErr = (input, msg) => {   // msg falsy => valid
  input.classList.toggle('is-invalid', !!msg);
  const fb = input.closest('.input-group')?.querySelector('.invalid-feedback') || input.parentElement.querySelector('.invalid-feedback');
  if (fb) fb.textContent = msg || '';
  return !msg;
};
if (window.gsap && Motion.ok()) gsap.from('#authCard', { opacity: 0, y: 16, duration: .5, ease: 'power2.out' });

/* ---- show / hide password ---- */
$('#eye').onclick = () => { const p = $('#pw'), hide = p.type === 'password'; p.type = hide ? 'text' : 'password'; $('#eye i').className = 'bi ' + (hide ? 'bi-eye-slash' : 'bi-eye'); };

/* ---- demo account buttons only pre-fill the form ---- */
$$('.demo-chip').forEach(b => b.onclick = () => { $('#us').value = b.dataset.u; $('#pw').value = 'Voltora@123'; setErr($('#us')); setErr($('#pw')); showAlert('Demo credentials filled in. Click Log in to continue.', 'success'); });

/* ---- login ---- */
$('#loginForm').addEventListener('submit', e => {
  e.preventDefault(); clearAlert();
  const u = $('#us').value.trim().toLowerCase(), p = $('#pw').value;
  const okU = setErr($('#us'), u ? '' : 'Please enter your username.');
  const okP = setErr($('#pw'), p ? '' : 'Please enter your password.');
  if (!okU || !okP) return;
  $('#loginBtn').disabled = true; $('#spin').classList.remove('d-none'); $('#loginTxt').textContent = 'Signing in...';
  setTimeout(() => {
    const acc = store.get('users', []).find(x => (x.email === u || x.user === u) && x.h === hashPw(p));
    const st = acc && acc.staffId ? staffById(acc.staffId) : null;
    $('#loginBtn').disabled = false; $('#spin').classList.add('d-none'); $('#loginTxt').textContent = 'Log in';
    if (!acc) { showAlert('Invalid username or password. Please try again.'); $('#pw').value = ''; $('#pw').focus(); return; }
    if (st && st.status === 'Inactive') { showAlert('This account is inactive. Please contact your store manager.'); return; }
    const s = { email: acc.email, name: acc.name, role: acc.role, staffId: acc.staffId, phone: acc.phone || '' };
    (($('#rm').checked) ? localStorage : sessionStorage).setItem('vt_session', JSON.stringify(s));
    location.href = 'dashboard.html';
  }, 600);
});
['us', 'pw'].forEach(id => $('#' + id).addEventListener('input', () => { setErr($('#' + id)); clearAlert(); }));

/* ---- register (creates a CUSTOMER account: read-only access to the customer's own repairs) ---- */
$('#regForm').addEventListener('submit', e => {
  e.preventDefault(); clearAlert();
  const n = $('#rn').value.trim(), em = $('#re').value.trim().toLowerCase(), p = $('#rp').value, c = $('#rc').value;
  const users = store.get('users', []);
  const v = [
    setErr($('#rn'), n.length >= 2 ? '' : 'Please enter your full name.'),
    setErr($('#re'), !/^\S+@\S+\.\S+$/.test(em) ? 'Please enter a valid email address.' : users.some(x => x.email === em) ? 'That email is already registered.' : ''),
    setErr($('#rp'), p.length >= 8 && /\d/.test(p) ? '' : 'Use at least 8 characters including a number.'),
    setErr($('#rc'), c === p && c ? '' : 'Passwords do not match.')
  ];
  if (v.includes(false)) return;
  const ph = ($('#rph') ? $('#rph').value.trim() : '');
  users.push({ email: em, user: em.split('@')[0], name: n, phone: ph, role: 'customer', staffId: '', h: hashPw(p) }); store.set('users', users);
  $('#regForm').reset(); $('#tabLogin').click(); $('#us').value = em; $('#pw').focus();
  showAlert('Account created successfully. You can now log in.', 'success');
});

/* ---- simulated password reset ---- */
$('#forgotForm').addEventListener('submit', e => {
  e.preventDefault();
  const em = $('#fe').value.trim().toLowerCase(), users = store.get('users', []), u = users.find(x => x.email === em), msg = $('#fMsg');
  msg.classList.add('d-none');
  if (!setErr($('#fe'), !/^\S+@\S+\.\S+$/.test(em) ? 'Please enter a valid email address.' : !u ? 'That email is not registered.' : '')) return;
  u.h = hashPw('Voltora@123'); store.set('users', users);
  msg.textContent = 'Password reset. Sign in with Voltora@123 (demo only, no email was sent).'; msg.classList.remove('d-none');
});
