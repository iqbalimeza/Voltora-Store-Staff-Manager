/* ==========================================================================
   VOLTORA - Manage Services (admin CRUD for the catalogue and its categories)
   Writes to localStorage (services, service_cats); the public Services page reads the same records.
   ========================================================================== */
if (layout('services', { title: 'Manage Services', roles: ['admin'] })) {
  const F = { q: '', cat: '', act: '', av: '' }, PER = 12; let page = 1;
  const bad = (id, msg) => { const el = $('#' + id); el.classList.toggle('is-invalid', !!msg); const fb = el.parentElement.querySelector('.invalid-feedback'); if (fb) fb.textContent = msg || ''; return !msg; };
  const save = (k, v) => { try { store.set(k, v); return true; } catch { toast('⚠ Browser storage is full. Use a smaller image.', 'error'); return false; } };
  const fillCats = () => { const o = getSvCats().map(c => `<option value="${c.id}">${esc(c.short)}</option>`).join(''); $('#fCat').innerHTML = '<option value="">All</option>' + o; $('#sCat').innerHTML = o; };
  fillCats();
  const bind = () => { F.q = $('#q').value.trim().toLowerCase(); F.cat = $('#fCat').value; F.act = $('#fAct').value; F.av = $('#fAv').value; page = 1; render(); };
  ['q', 'fCat', 'fAct', 'fAv'].forEach(id => $('#' + id).addEventListener(id === 'q' ? 'input' : 'change', bind));
  const list = () => getServices().filter(s => (!F.cat || s.cat === F.cat) && (!F.act || (F.act === '1') === !!s.active) && (!F.av || s.availability === F.av) && (!F.q || `${s.name} ${s.id}`.toLowerCase().includes(F.q)));
  function render(first) {
    const pg = paginate(list(), page, PER); page = pg.page;
    $('#tbody').innerHTML = pg.items.length ? pg.items.map(s => `<tr class="${s.active ? '' : 'opacity-50'}"><td style="min-width:220px"><div class="d-flex gap-2 align-items-center"><span class="sv-ico sm" aria-hidden="true"><i class="bi ${svIcon(s.cat)}"></i></span><div><b>${esc(s.name)}</b><div class="small mu">${esc(s.id)} · ${esc(s.problemType)}</div></div></div></td>
      <td class="hide-md">${esc(svCat(s.cat).short)}</td><td class="text-nowrap">${esc(priceRange(s))} ${s.placeholder ? '<span class="tag-ph">placeholder</span>' : ''}</td><td class="hide-sm">${esc(s.duration)}</td><td class="hide-sm"><span class="bd bd-${slug(s.availability)}">${esc(s.availability)}</span></td>
      <td>${s.active ? '<span class="bd bd-active">Active</span>' : '<span class="bd bd-inactive">Inactive</span>'}</td>
      <td class="text-end text-nowrap"><button class="btn btn-o btn-icon btn-sm" data-edit="${s.id}" aria-label="Edit ${esc(s.name)}" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-o btn-icon btn-sm" data-tog="${s.id}" aria-label="${s.active ? 'Deactivate' : 'Activate'} ${esc(s.name)}" title="${s.active ? 'Deactivate' : 'Activate'}"><i class="bi ${s.active ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
        <button class="btn btn-o btn-icon btn-sm danger" data-del="${s.id}" aria-label="Delete ${esc(s.name)}" title="Delete"><i class="bi bi-trash"></i></button></td></tr>`).join('')
      : `<tr><td colspan="7">${emptyState('bi-tools', 'No services found', 'Change the filters or add a new service.')}</td></tr>`;
    $('#pager').innerHTML = pagerHTML(pg, 'services'); if (first) Motion.page(); else Motion.rows($('#tbody'));
  }
  $('#pager').onclick = e => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { page = +b.dataset.page; render(); } };


  /* ----- service form ----- */
  const modal = bootstrap.Modal.getOrCreateInstance($('#svForm'));
  function open(s) {
    $('#sForm').reset(); $$('#sForm .is-invalid').forEach(x => x.classList.remove('is-invalid')); $('#sfTitle').textContent = s ? 'Edit service' : 'Add service';
    $('#sId').value = s ? s.id : '';
    if (s) { $('#sName').value = s.name; $('#sCat').value = s.cat; $('#sType').value = s.problemType; $('#sAv').value = s.availability; $('#sDesc').value = s.desc; $('#sProb').value = s.problems.join('\n'); $('#sInc').value = s.includes.join('\n'); $('#sNotes').value = s.notes; $('#sMin').value = s.min; $('#sMax').value = s.max; $('#sDur').value = s.duration; $('#sPN').value = s.priceNote; $('#sActive').checked = !!s.active; $('#sPH').checked = !!s.placeholder; }
    else { $('#sPN').value = 'Estimate only. Final quotation after inspection.'; $('#sActive').checked = true; $('#sPH').checked = true; }
    modal.show();
  }
  $('#addBtn').onclick = () => open(null);
  $('#sForm').addEventListener('submit', e => {
    e.preventDefault(); const v = i => $('#' + i).value.trim(), min = +v('sMin'), max = +v('sMax'), id = v('sId'), all = getServices();
    const ok = [bad('sName', v('sName').length >= 3 ? (all.some(x => x.id !== id && x.name.toLowerCase() === v('sName').toLowerCase()) ? 'A service with this name already exists.' : '') : 'Enter the service name.'),
      bad('sType', v('sType') ? '' : 'Enter the problem or repair type.'), bad('sDesc', v('sDesc').length >= 30 ? '' : 'Write a description of at least 30 characters.'),
      bad('sMin', v('sMin') !== '' && min >= 0 ? '' : 'Enter the minimum price.'), bad('sMax', v('sMax') !== '' && max >= min ? '' : 'Maximum must be at least the minimum.'), bad('sDur', v('sDur') ? '' : 'Enter the estimated duration.')];
    if (ok.includes(false)) return toast('⚠ Unable to save. Please check the required fields.', 'error');
    const lines = x => x.split('\n').map(s => s.trim()).filter(Boolean);
    const rec = { id: id || nextId('SV', all), cat: v('sCat'), name: v('sName'), problemType: v('sType'), desc: v('sDesc'), problems: lines($('#sProb').value), includes: lines($('#sInc').value), notes: v('sNotes'), min, max, currency: 'RM', priceNote: v('sPN'), duration: v('sDur'), availability: v('sAv'), active: $('#sActive').checked, placeholder: $('#sPH').checked };
    const next = id ? all.map(x => x.id === id ? rec : x) : [...all, rec];
    if (!save('services', next)) return;
    modal.hide(); render(); toast(id ? '✓ Service updated successfully.' : '✓ Service added successfully.');
  });
  $('#tbody').onclick = async e => {
    const ed = e.target.closest('[data-edit]'), tg = e.target.closest('[data-tog]'), dl = e.target.closest('[data-del]');
    if (ed) open(serviceById(ed.dataset.edit));
    if (tg) { const a = getServices().map(s => s.id === tg.dataset.tog ? { ...s, active: !s.active } : s); save('services', a); render(); toast(a.find(s => s.id === tg.dataset.tog).active ? '✓ Service is now visible to customers.' : '✓ Service hidden from customers.'); }
    if (dl) {
      const s = serviceById(dl.dataset.del), used = getReqs().filter(r => r.serviceId === s.id).length;
      if (used) return toast(`⚠ ${s.name} has ${used} repair request${used > 1 ? 's' : ''}. Deactivate it instead of deleting, so history stays intact.`, 'error');
      if (await confirmBox({ title: 'Delete this service?', body: `"${s.name}" will be permanently removed from the catalogue.`, okText: 'Delete service' })) { save('services', getServices().filter(x => x.id !== s.id)); render(); toast('✓ Service deleted.'); }
    }
  };

  /* ----- categories ----- */
  const cm = bootstrap.Modal.getOrCreateInstance($('#catModal'));
  function catList() {
    const sv = getServices();
    $('#catList').innerHTML = getSvCats().map(c => `<div class="d-flex flex-wrap gap-3 align-items-center py-2 border-bottom"><span class="sv-ico" aria-hidden="true"><i class="bi ${svIcon(c.id)}"></i></span>
      <div class="flex-grow-1" style="min-width:200px"><input class="form-control form-control-sm mb-1" data-cn="${c.id}" value="${esc(c.name)}" aria-label="Category name" maxlength="50"><div class="small mu">${esc(c.short)} · ${sv.filter(s => s.cat === c.id).length} services</div></div>
<button class="btn btn-o btn-sm" data-cs="${c.id}">Save name</button><button class="btn btn-o btn-sm danger" data-cd="${c.id}">Delete</button></div>`).join('');
  }
  $('#catBtn').onclick = () => { catList(); cm.show(); };
  $('#catList').onclick = async e => {
    const cs = e.target.closest('[data-cs]'), cd = e.target.closest('[data-cd]');
    if (cs) { const n = $(`[data-cn="${cs.dataset.cs}"]`).value.trim(); if (n.length < 3) return toast('⚠ Enter a category name.', 'error'); save('service_cats', getSvCats().map(c => c.id === cs.dataset.cs ? { ...c, name: n } : c)); toast('✓ Category saved.'); fillCats(); render(); }
    if (cd) { const c = svCat(cd.dataset.cd), n = getServices().filter(s => s.cat === c.id).length; if (n) return toast(`⚠ ${c.short} still has ${n} services. Move or delete them first.`, 'error'); if (await confirmBox({ title: 'Delete category?', body: `"${c.name}" will be removed.`, okText: 'Delete' })) { save('service_cats', getSvCats().filter(x => x.id !== c.id)); catList(); fillCats(); render(); } }
  };
  $('#nAdd').onclick = () => {
    const n = $('#nName').value.trim(), sh = $('#nShort').value.trim() || n; $('#nErr').textContent = '';
    if (n.length < 3) return $('#nErr').textContent = 'Enter a category name.';
    const id = slug(sh) || 'cat' + Date.now(); if (getSvCats().some(c => c.id === id)) return $('#nErr').textContent = 'That category already exists.';
    save('service_cats', [...getSvCats(), { id, name: n, short: sh, device: sh, tag: '' }]); $('#nName').value = $('#nShort').value = ''; catList(); fillCats(); render(); toast('✓ Category added.');
  };
  render(true);
}
