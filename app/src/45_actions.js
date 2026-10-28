
/* ---------- Popover ---------- */
const pop = $('#pop');
function openPop(html, anchor, label, align = 'start') {
  if (S.popAnchor === anchor && !pop.hidden) { closePop(true); return; }
  closePop(false);
  pop.innerHTML = html; pop.hidden = false; pop.setAttribute('aria-label', label);
  S.popAnchor = anchor; anchor.setAttribute('aria-expanded', 'true');
  const r = anchor.getBoundingClientRect(), vw = document.documentElement.clientWidth, pw = pop.offsetWidth;
  let left = align === 'end' ? r.right - pw : r.left;
  left = Math.max(12, Math.min(left, vw - pw - 12));
  pop.style.left = `${left + scrollX}px`; pop.style.top = `${r.bottom + scrollY + 8}px`;
  pop.style.transformOrigin = align === 'end' ? 'top right' : 'top left';
  pop.classList.remove('in'); void pop.offsetWidth; pop.classList.add('in');
  (pop.querySelector('[aria-pressed="true"]') || pop.querySelector('button'))?.focus({ preventScroll: true });
}
function closePop(returnFocus) {
  if (pop.hidden) return;
  pop.hidden = true;
  const a = S.popAnchor; S.popAnchor = null;
  if (a && document.contains(a)) { a.setAttribute('aria-expanded', 'false'); if (returnFocus) a.focus({ preventScroll: true }); }
}

/* ---------- Hinweis mit Rückgängig ---------- */
let toastTimer = null;
function toast(msg, action) {
  const box = $('#toasts');
  box.innerHTML = `<div class="toast" role="status"><span>${esc(tidy(msg))}</span>${action ? `<button class="toast-act" id="toast-act">${esc(action.label)}</button>` : ''}</div>`;
  const el = box.querySelector('.toast');
  if (action) $('#toast-act').addEventListener('click', () => { action.run(); hideToast(); schedulePersist(); });
  const arm = ms => { clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, ms); };
  /* Hinweis bleibt stehen, solange man darauf zeigt oder ihn per Tastatur ansteuert */
  el.addEventListener('mouseenter', () => clearTimeout(toastTimer));
  el.addEventListener('mouseleave', () => arm(2500));
  el.addEventListener('focusin', () => clearTimeout(toastTimer));
  el.addEventListener('focusout', () => arm(2500));
  arm(action ? 6000 : 3200);
}
function hideToast() { const t = $('#toasts .toast'); if (!t) return; t.classList.add('out'); setTimeout(() => t.remove(), 200); }
const undoable = (obj, msg, extra) => { const snap = { ...obj, ret: obj.ret ? [...obj.ret] : obj.ret, extras: obj.extras ? [...obj.extras] : obj.extras }; toast(msg, { label: 'Rückgängig', run: () => { Object.assign(obj, snap); if (extra) extra(); refresh(); } }); };

/* ---------- Helfer für Aktionen ---------- */
async function shrink(file, max = 1600) {
  /* Neu kodieren über ein Canvas: verkleinert und entfernt dabei Metadaten wie den Aufnahmeort */
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = (await new Promise(r => c.toBlob(r, 'image/jpeg', .85))) || file;
    return { url: URL.createObjectURL(blob), blob };
  } catch (e) { return { url: URL.createObjectURL(file), blob: file }; }
}
const mb = n => `${Math.max(0.1, n / 1048576).toLocaleString('de-AT', { maximumFractionDigits: 1 })} MB`;
function doReturn(l, extraMsg = '', extraUndo) {
  const snap = { ...l };
  Object.assign(l, { status: 'zurück', returned: T0 });
  const q = queue(l.gameId);
  refresh();
  toast(`${titleOf(l)} ist zurück im Regal.${q.length ? ` ${uname(q[0].userId)} hat es vorgemerkt.` : ''}${extraMsg}`, { label: 'Rückgängig', run: () => { Object.assign(l, snap); if (extraUndo) extraUndo(); refresh(); } });
}
function giveTo(gid, uid) {
  const g = gameById(gid), wishes = S.gifts.filter(w => w.gameId === gid);
  Object.assign(g, { archived: true, giftedTo: uid, giftedAt: T0, gift: false });
  S.gifts = S.gifts.filter(w => w.gameId !== gid);
  refresh();
  toast(`${g.title} an ${uname(uid)} verschenkt.`, { label: 'Rückgängig', run: () => { Object.assign(g, { archived: false, gift: true }); delete g.giftedTo; delete g.giftedAt; S.gifts.push(...wishes); refresh(); } });
}
const calFocus = () => requestAnimationFrame(() => ($('.cal-day[tabindex="0"]') || $('#cal-step'))?.focus({ preventScroll: true }));
function resetMode() { S.mode = 'games'; S.q = ''; S.f = FDEF(); S.pf = PFDEF(); S.ort = null; S.sort = 'mine'; S.declining = null; }
function afterMore() { rerenderSheet(); renderChips(); renderResults(false); }
function clearSearch() { S.q = ''; const q = $('#q'); if (q) q.value = ''; $('#q-clear')?.setAttribute('hidden', ''); }

/* ---------- Aktionen ---------- */
const A = {
  'as': t => {
    closeSheet(); closePop(false);
    const u = t.dataset.u;
    if (u === 'first') userById('erika').mustChange = true;
    S.view = u === 'showcase' ? 'showcase' : 'app';
    S.user = u === 'login' || u === 'showcase' ? null : u === 'first' ? 'erika' : u;
    S.tab = 'regal'; resetMode(); renderApp(); scrollTo(0, 0);
  },
  'variant': t => {
    S.variant = t.dataset.v; renderProto();
    if (S.view === 'app' && S.user && !me()?.mustChange && S.tab === 'regal') renderView(true);
    t = document.querySelector(`#proto-var [data-v="${S.variant}"]`); t?.focus({ preventScroll: true });
  },
  'tab': t => { const tab = t.dataset.tab; closePop(false); if (tab === S.tab) { scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }); return; } S.tab = tab; S.declining = null; renderChrome(); renderView(true); scrollTo(0, 0); },
  'account': t => {
    const u = me();
    openPop(`<div class="acct">${avatar(u, 'lg')}<div><p class="acct-name">${esc(u.name)}</p><p class="acct-role">${u.admin ? 'Verwaltet den Spieleschrank' : 'Mitglied'}</p></div></div><button class="pop-item" data-act="own-pw">${ic('lock')}Passwort ändern</button><button class="pop-item" data-act="logout">${ic('logout')}Abmelden</button>`, t, 'Konto', 'end');
  },
  'logout': () => { closePop(false); logout(false); },
  'settings-done': () => { saveBggToken(); closeSheet(); },
  'own-pw': () => { closePop(false); S.form = {}; openSheet(ownPwView()); },
  'own-pw-save': async t => {
    const p0 = $('#op0').value, p1 = $('#op1').value, p2 = $('#op2').value, err = $('#op-err');
    const fail = (m, el) => { err.textContent = m; err.hidden = false; el?.focus(); };
    if (!p0) return fail('Bitte gib dein bisheriges Passwort ein.', $('#op0'));
    if (p1.length < 8) return fail('Bitte wähl ein Passwort mit mindestens 8 Zeichen.', $('#op1'));
    if (p1 !== p2) return fail('Die beiden neuen Passwörter stimmen nicht überein.', $('#op2'));
    t.disabled = true; t.setAttribute('aria-busy', 'true');
    try { await changeOwnPassword(p1, p0); closeSheet(); toast('Neues Passwort gespeichert'); }
    catch (ex) { t.disabled = false; t.removeAttribute('aria-busy'); fail(ex.status === 400 && /oldPassword/.test(JSON.stringify(ex.response?.data || {})) ? 'Das bisherige Passwort stimmt nicht.' : serverMsg(ex), $('#op0')); }
  },
  'open-game': t => { if (S.sheetView) S.expOpen = false; openSheet(gameView(t.dataset.id)); },
  'sc-open': t => openSheet(scGameView(t.dataset.id)),
  'close-sheet': () => closeSheet(),
  'back-game': t => { S.form = {}; openSheet(gameView(t.dataset.id)); },
  'mode': t => {
    const v = t.dataset.v; closePop(false);
    if (v === S.mode) return;
    S.mode = v; renderView(true);
    if (S.variant === 'shelf') { scrollTo(0, 0); ($(v === 'puzzles' ? '#back-games' : '#pz-h') || $('#view .h1'))?.focus({ preventScroll: true }); }
    else $(v === 'puzzles' ? '#kind-pz' : '#kind-games')?.focus({ preventScroll: true });
  },
  'sort': t => { S.sort = t.dataset.v; renderResults(true); $(`#sort-${S.sort}`)?.focus({ preventScroll: true }); },

  /* Filter */
  'pop-players': t => openPop(`<p class="pop-title">Wie viele spielen mit?</p><div class="numgrid">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button class="num" data-act="set-players" data-v="${n}" aria-pressed="${S.f.players === n}" aria-label="${n === 8 ? '8 oder mehr' : n} ${n === 1 ? 'Person' : 'Personen'}">${n === 8 ? '8+' : n}</button>`).join('')}</div><button class="pop-any" data-act="set-players" data-v="" aria-pressed="${!S.f.players}">Egal</button>`, t, 'Personen'),
  'pop-time': t => openPop(`<p class="pop-title">Wie viel Zeit habt ihr?</p>${S.f.players ? `<p class="help" style="margin:-6px 4px 12px">Geschätzt für ${S.f.players >= 8 ? '8 oder mehr' : S.f.players} ${S.f.players === 1 ? 'Person' : 'Personen'}.</p>` : ''}<div class="pop-list" style="grid-template-columns:1fr 1fr;min-width:288px">${TIMES.map(([v, l]) => `<button class="pop-opt" data-act="set-time" data-v="${v}" aria-pressed="${S.f.time === v}">${l}${ic('check')}</button>`).join('')}<button class="pop-opt any" style="grid-column:1/-1" data-act="set-time" data-v="" aria-pressed="${!S.f.time}">Egal${ic('check')}</button></div>`, t, 'Spieldauer'),
  'pop-pieces': t => openPop(`<p class="pop-title">Wie groß darf es sein?</p><div class="pop-list">${[...PIECES, [null, 'Egal']].map(([v, l]) => `<button class="pop-opt${v ? '' : ' any'}" data-act="set-pieces" data-v="${v ?? ''}" aria-pressed="${S.pf.pieces === v}">${l}${ic('check')}</button>`).join('')}</div>`, t, 'Teile'),
  'set-players': t => { S.f.players = t.dataset.v ? +t.dataset.v : null; closePop(true); renderChips(); renderResults(true); },
  'set-time': t => { S.f.time = t.dataset.v ? +t.dataset.v : null; closePop(true); renderChips(); renderResults(true); },
  'set-pieces': t => { S.pf.pieces = t.dataset.v ? +t.dataset.v : null; closePop(true); renderChips(); renderResults(true); },
  'toggle-avail': () => { const f = S.mode === 'puzzles' ? S.pf : S.f; f.avail = !f.avail; renderChips(); renderResults(true); },
  'more-filters': () => openSheet(S.mode === 'puzzles' ? puzzleFiltersView() : filtersView()),
  'f-genre': t => { const v = t.dataset.v, a = S.f.genres; S.f.genres = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; afterMore(); },
  'f-diff': t => { S.f.diff = t.dataset.v ? +t.dataset.v : null; afterMore(); },
  'f-age': t => { S.f.age = t.dataset.v ? +t.dataset.v : null; afterMore(); },
  'f-exp': () => { S.f.exp = !S.f.exp; afterMore(); },
  'f-gift': () => { S.f.gift = !S.f.gift; afterMore(); },
  'f-reset-more': () => { Object.assign(S.f, { genres: [], diff: null, age: null, exp: false, gift: false }); afterMore(); $('#sheet-title')?.focus({ preventScroll: true }); },
  'p-motif': t => { const v = t.dataset.v, a = S.pf.motifs; S.pf.motifs = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; afterMore(); },
  'p-brand': t => { const v = t.dataset.v, a = S.pf.brands; S.pf.brands = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; afterMore(); },
  'p-reset-more': () => { S.pf.motifs = []; S.pf.brands = []; afterMore(); $('#sheet-title')?.focus({ preventScroll: true }); },
  'reset-filters': () => { if (S.mode === 'puzzles') S.pf = PFDEF(); else S.f = { ...FDEF(), exp: S.f.exp }; clearSearch(); renderChips(); renderResults(true); },
  'drop-filter': t => { const k = t.dataset.k; if (k === 'q') clearSearch(); else if (S.mode === 'puzzles') S.pf[k] = PFDEF()[k]; else S.f[k] = FDEF()[k]; renderChips(); renderResults(true); },
  'clear-q': () => { clearSearch(); $('#q')?.focus(); renderResults(true); },

  /* Mitglied */
  'request': t => {
    const id = t.dataset.id;
    if (current(id)) { S.form = { msg: '' }; openSheet(vormerkView(id)); return; }
    S.form = calForm({ gid: id, busy: busyOf([id]) });
    openSheet(requestView(id));
  },
  'pick-period': t => { const l = loanById(t.dataset.id); S.form = calForm({ gid: l.gameId, busy: busyOf([l.gameId]), fromLoan: l.id, msg: l.msg || '' }); openSheet(requestView(l.gameId)); },
  'cal-pick': t => {
    const F = S.form, d = parseISO(t.dataset.d), start = F.fixedStart ? T0 : F.start;
    if (t.getAttribute('aria-disabled') === 'true') {
      F.calInfo = dayReason(F, d); F.calWarn = null; F.focus = d; rerenderSheet();
      const el = $(`#cd-${isoD(d)}`); if (el) { el.focus({ preventScroll: true }); if (!reduce()) el.classList.add('nope'); }
      return;
    }
    F.calWarn = null; F.calInfo = null; F.err = null; F.focus = d;
    if (!start || (!F.fixedStart && d < start)) { F.start = d; F.ret = []; }
    else if (!F.fixedStart && same(d, start)) { F.start = null; F.ret = []; }
    else {
      const i = F.ret.findIndex(r => same(r, d));
      if (i >= 0) F.ret.splice(i, 1);
      else if (F.ret.length >= 3) F.calWarn = 'Höchstens drei Tage. Tipp einen gewählten Tag an, um ihn abzuwählen.';
      else F.ret.push(d);
    }
    const before = +F.anchor; fitAnchor(F);
    rerenderSheet();
    if (+F.anchor !== before) { const g = $('.cal-grid'); if (g && !reduce()) g.animate([{ opacity: .35, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' }); $(`#cd-${isoD(d)}`)?.focus({ preventScroll: true }); }
  },
  'cal-prev': () => { const F = S.form; F.calInfo = null; F.anchor = addDays(F.anchor, -28); if (F.anchor < mondayOf(T0)) F.anchor = mondayOf(T0); F.focus = null; rerenderSheet(); if ($('#cal-prev')?.disabled) $('#cal-next')?.focus(); },
  'cal-next': () => { const F = S.form; F.calInfo = null; F.anchor = addDays(F.anchor, 28); F.focus = null; rerenderSheet(); if ($('#cal-next')?.disabled) $('#cal-prev')?.focus(); },
  'cal-reset': () => { const F = S.form; F.start = null; F.ret = []; F.calWarn = null; F.focus = null; rerenderSheet(); calFocus(); },
  'send-request': t => {
    const id = t.dataset.id, F = S.form;
    if (!F.start) { F.err = 'Bitte wähl zuerst den Tag, ab dem du es brauchst.'; rerenderSheet(); calFocus(); return; }
    if (!F.ret.length) { F.err = 'Bitte wähl mindestens einen Tag, an dem du es zurückbringst.'; rerenderSheet(); calFocus(); return; }
    S.loans.filter(l => l.gameId === id && l.userId === S.user && l.status === 'abgelehnt').forEach(l => { l.seen = true; });
    const data = { status: 'angefragt', start: F.start, ret: sortDates(F.ret), extras: [...F.extras], msg: (F.msg || '').trim(), notified: false };
    if (F.fromLoan) Object.assign(loanById(F.fromLoan), data);
    else S.loans.push(L(id, S.user, 'angefragt', { ...data, created: T0 }));
    S.form = {};
    openSheet(requestDoneView(id, false));
    refresh();
  },
  'send-vormerk': t => {
    const id = t.dataset.id;
    S.loans.push(L(id, S.user, 'vorgemerkt', { created: new Date(), msg: (S.form.msg || '').trim() }));
    S.form = {};
    openSheet(requestDoneView(id, true));
    refresh();
  },
  'withdraw': t => {
    const l = loanById(t.dataset.id), vor = l.status === 'vorgemerkt';
    const msg = `${vor ? 'Vormerkung' : 'Anfrage'} für ${gameById(l.gameId).title} zurückgezogen`;
    undoable(l, msg); l.status = 'zurückgezogen'; refresh();
  },
  'cancel-res': t => { const l = loanById(t.dataset.id); undoable(l, `Reservierung für ${titleOf(l)} abgesagt`); l.status = 'zurückgezogen'; refresh(); },
  'dismiss': t => { const l = loanById(t.dataset.id); undoable(l, 'Ausgeblendet'); l.seen = true; refresh(); },
  'known': t => { const g = gameById(t.dataset.id); g.knownBy = g.knownBy.includes(S.user) ? g.knownBy.filter(x => x !== S.user) : [...g.knownBy, S.user]; rerenderSheet(); if (g.knownBy.includes(S.user)) $('#known-btn')?.classList.add('pulse'); },
  'toggle-exps': () => { S.expOpen = !S.expOpen; rerenderSheet(); },
  'rules': t => openRules(t.dataset.id),
  'wish': t => {
    const id = t.dataset.id, w = { id: newId(), gameId: id, userId: S.user, created: new Date() };
    S.gifts.push(w); refresh();
    toast('Jakob sieht, dass du es gern hättest.', { label: 'Rückgängig', run: () => { S.gifts = S.gifts.filter(x => x !== w); refresh(); } });
  },
  'unwish': t => {
    const w = myWish(t.dataset.id); if (!w) return;
    S.gifts = S.gifts.filter(x => x !== w); refresh();
    toast('Wunsch zurückgezogen', { label: 'Rückgängig', run: () => { S.gifts.push(w); refresh(); } });
  },
  'bookmark': t => {
    const id = t.dataset.id;
    if (onList(id)) { S.form = {}; openSheet(listsView(id)); return; }
    const merk = myLists().find(li => li.isDefault);
    merk.ids.push(id); refresh(); $('#mark-btn')?.classList.add('pulse');
    toast('Auf deiner Merkliste', { label: 'Andere Liste', run: () => { if (S.sheetView) { S.form = {}; openSheet(listsView(id)); } } });
  },
  'list-new': t => {
    const id = t.dataset.id, name = ($('#lst-new')?.value || '').trim();
    if (!name) { $('#lst-new')?.focus(); return; }
    const li = { id: newId(), name, ids: [id], isDefault: false };
    myLists().push(li); S.form.newList = ''; rerenderSheet(); refresh();
    $(`#lst-${li.id}`)?.focus({ preventScroll: true });
  },
  'extend': t => { S.form = {}; openSheet(extendView(t.dataset.id)); },
  'extend-send': t => { const l = loanById(t.dataset.id); closeSheet(); undoable(l, 'Verlängerung angefragt. Jakob meldet sich.'); l.ext = 'angefragt'; refresh(); },
  'photos': t => { S.form = { photos: [], cap: '' }; openSheet(photosView(t.dataset.id)); },
  'photo-remove': t => { const F = S.form, i = +t.dataset.i; F.photos.splice(i, 1); rerenderSheet(); ($(`#ph-rm-${Math.min(i, F.photos.length - 1)}`) || $('#ph-in'))?.focus({ preventScroll: true }); },
  'photo-send': async t => {
    const l = loanById(t.dataset.id), F = S.form;
    if (F.sending) return;
    if (F.photos.some(p => p.busy)) { F.err = 'Einen Moment, die Fotos werden noch vorbereitet.'; rerenderSheet(); return; }
    if (!F.photos.length) { F.err = 'Wähl mindestens ein Foto aus.'; rerenderSheet(); $('#ph-in')?.focus(); return; }
    F.sending = true; F.err = null; rerenderSheet();
    try { await apiUploadPhotos(l, F.photos.map(p => p.blob), (F.cap || '').trim()); }
    catch (e) { F.sending = false; F.err = serverMsg(e); rerenderSheet(); return; }
    l.photoHint = 'done'; S.form = {};
    openSheet(simpleDone('Danke!', 'Jakob freut sich bestimmt. Nur er sieht deine Fotos.'));
    refresh();
  },
  'hint-dismiss': t => { const l = loanById(t.dataset.id); undoable(l, 'Hinweis ausgeblendet'); l.photoHint = 'dismissed'; refresh(); },

  /* Jakob */
  'accept': t => {
    const l = loanById(t.dataset.id);
    S.form = calForm({ who: 'admin', gid: l.gameId, loanId: l.id, mode: 'wish', start: l.start, ret: [...l.ret], busy: busyOf([l.gameId, ...l.extras], l.id), pub: S.lastPub ?? true });
    openSheet(acceptView(l.id));
  },
  'acc-mode': t => { S.form.mode = t.dataset.v; S.form.err = null; rerenderSheet(); },
  'f-pub': () => { S.form.pub = !S.form.pub; rerenderSheet(); },
  'accept-confirm': t => {
    const l = loanById(t.dataset.id), F = S.form;
    let start = l.start, ret = [...l.ret], open = false;
    if (F.mode === 'wish') {
      const clash = busyOf([l.gameId, ...l.extras], l.id).some(([a, b]) => l.start <= startDay(b) && maxD(l.ret) >= startDay(a));
      if (clash) { F.err = 'Der gewünschte Zeitraum ist schon vergeben. Wähl „Anders“ und such einen freien Zeitraum aus.'; rerenderSheet(); return; }
    } else if (F.mode === 'other') {
      if (!F.start) { F.err = 'Bitte wähl den Tag, ab dem es verliehen ist.'; rerenderSheet(); calFocus(); return; }
      if (!F.ret.length) { F.err = 'Bitte wähl mindestens einen Rückgabetag.'; rerenderSheet(); calFocus(); return; }
      start = F.start; ret = sortDates(F.ret);
    } else { open = true; ret = []; if (start < T0) start = T0; }
    const snap = { ...l, ret: [...l.ret] };
    Object.assign(l, { status: 'reserviert', start, ret, open, pub: F.pub });
    S.lastPub = F.pub; S.form = {};
    openSheet(acceptDoneView(l.id)); S.undo = () => Object.assign(l, snap);
    refresh();
  },
  'decline': t => { S.declining = t.dataset.id; renderView(); $(`#dr-${t.dataset.id}`)?.focus(); },
  'decline-cancel': () => { S.declining = null; renderView(); },
  'decline-confirm': t => {
    const l = loanById(t.dataset.id), reason = ($(`#dr-${l.id}`)?.value || '').trim(), snap = { ...l };
    Object.assign(l, { status: 'abgelehnt', reason, seen: false });
    S.declining = null;
    openSheet(declineDoneView(l.id)); S.undo = () => Object.assign(l, snap);
    refresh();
  },
  'handover': t => {
    const l = loanById(t.dataset.id);
    undoable(l, `${titleOf(l)} übergeben. ${l.open ? 'Ohne festes Rückgabedatum.' : `Zurück am ${listDates(l.ret)}.`}`);
    Object.assign(l, { status: 'verliehen', handed: T0, start: l.start && l.start < T0 ? l.start : T0 });
    refresh();
  },
  'return': t => {
    const l = loanById(t.dataset.id), g = gameById(l.gameId);
    if (isPuzzle(g)) { S.form = { mode: 'ok', n: Math.max(1, g.missing || 1) }; openSheet(returnPuzzleView(l.id)); return; }
    doReturn(l);
  },
  'rp-inc': () => { S.form.n++; rerenderSheet(); },
  'rp-dec': () => { S.form.n = Math.max(1, S.form.n - 1); rerenderSheet(); },
  'return-confirm': t => {
    const l = loanById(t.dataset.id), g = gameById(l.gameId), F = S.form, before = g.missing;
    if (F.mode === 'missing') g.missing = F.n;
    closeSheet();
    doReturn(l, F.mode === 'missing' ? ` Vermerkt: ${F.n === 1 ? '1 Teil fehlt' : `${F.n} Teile fehlen`}.` : '', () => { g.missing = before; });
  },
  'toggle-vis': t => {
    const l = loanById(t.dataset.id);
    l.pub = !l.pub; refresh();
    $(`[data-act="toggle-vis"][data-id="${l.id}"]`)?.focus({ preventScroll: true });
    toast(l.pub ? 'Für alle sichtbar' : `Nur für dich und ${uname(l.userId)} sichtbar`);
  },
  'lend': t => {
    const id = t.dataset.id, first = [...pendingReq(id), ...queue(id)].sort((a, b) => a.created - b.created)[0];
    S.form = calForm({ who: 'admin', gid: id, mode: 'days', fixedStart: true, start: T0, busy: busyOf([id]), uid: first ? first.userId : null, pub: S.lastPub ?? true });
    openSheet(lendView(id));
  },
  'lend-mode': t => { S.form.mode = t.dataset.v; S.form.err = null; rerenderSheet(); },
  'lend-confirm': t => {
    const id = t.dataset.id, F = S.form;
    if (!F.uid) { F.err2 = 'Wähl aus, an wen du es verleihst.'; rerenderSheet(); document.querySelector('input[name="lend-u"]')?.focus(); return; }
    if (F.mode === 'days' && !F.ret.length) { F.err = 'Bitte wähl mindestens einen Rückgabetag.'; rerenderSheet(); calFocus(); return; }
    const fut = futureRes(id)[0];
    if (F.mode === 'open' && fut) { F.err = `Ab ${fd(fut.start)} ist es für ${uname(fut.userId)} reserviert. Offen verleihen geht deshalb nicht.`; rerenderSheet(); return; }
    const existing = S.loans.find(l => l.gameId === id && l.userId === F.uid && (l.status === 'angefragt' || l.status === 'vorgemerkt'));
    const snap = existing ? { ...existing } : null;
    const l = existing || L(id, F.uid, 'verliehen', { created: T0 });
    Object.assign(l, { status: 'verliehen', start: T0, handed: T0, ret: F.mode === 'open' ? [] : sortDates(F.ret), open: F.mode === 'open', extras: [...F.extras], pub: F.pub, notified: false });
    if (!existing) S.loans.push(l);
    S.lastPub = F.pub; S.form = {};
    openSheet(gameView(id)); refresh();
    toast(`${titleOf(l)} an ${uname(l.userId)} verliehen. ${l.open ? 'Ohne festes Rückgabedatum.' : `Zurück am ${listDates(l.ret)}.`}`, { label: 'Rückgängig', run: () => { if (snap) Object.assign(l, snap); else S.loans.splice(S.loans.indexOf(l), 1); refresh(); } });
  },
  'undo-done': () => { const u = S.undo; S.undo = null; if (u) { u(); refresh(); } closeSheet(); if (u) toast('Rückgängig gemacht'); },
  'notify': t => {
    const l = loanById(t.dataset.id), snap = { ...l };
    l.notified = true;
    openSheet(notifyDoneView(l.id)); S.undo = () => Object.assign(l, snap);
    refresh();
  },
  'ext-accept': t => {
    const l = loanById(t.dataset.id);
    undoable(l, `Verlängert. ${uname(l.userId)} bringt es am ${listDates(l.ret.map(d => addDays(d, EXTDAYS)))} zurück.`);
    Object.assign(l, { ret: l.ret.map(d => addDays(d, EXTDAYS)), ext: 'ok', extended: true });
    refresh();
  },
  'ext-decline': t => { const l = loanById(t.dataset.id); undoable(l, `Verlängerung für ${uname(l.userId)} abgelehnt`); l.ext = 'abgelehnt'; refresh(); },
  'give': t => giveTo(t.dataset.id, t.dataset.u),
  'give-pick': t => { const w = wishesFor(t.dataset.id)[0]; S.form = { uid: w ? w.userId : null }; openSheet(giveView(t.dataset.id)); },
  'give-confirm': t => {
    if (!S.form.uid) { S.form.err = 'Wähl aus, wer es bekommt.'; rerenderSheet(); return; }
    const uid = S.form.uid; closeSheet(); giveTo(t.dataset.id, uid);
  },
  'heart': t => { const p = S.photos.find(x => x.id === t.dataset.id); p.liked = !p.liked; refresh(); const h = $(`#heart-${p.id}`); h?.focus({ preventScroll: true }); if (p.liked) h?.classList.add('pulse'); if (p.liked) toast(`${uname(p.userId)} sieht, dass du dich gefreut hast.`); },
  'ort': t => { S.ort = t.dataset.v || null; renderView(); },

  /* Hinzufügen und Bearbeiten */
  'add-item': () => openSheet(addChooserView()),
  'add-bgg': () => { S.bgg = { q: '', loading: false, results: null }; openSheet(bggView(), { focus: isMobile() ? 'title' : '#bgg-q' }); },
  'add-puzzle': () => { S.form = { mode: 'add', title: '', pieces: 1000, otherPieces: false, brand: '', w: '', h: '', motif: null, missing: 0, lendable: true, done: true, gift: false, img: null }; openSheet(puzzleFormView()); },
  'bgg-pick': async t => {
    const hit = S.bgg.results?.[+t.dataset.i]; if (!hit || S.bgg.picking) return;
    S.bgg.picking = true; t.setAttribute('aria-busy', 'true'); t.querySelector('.i')?.replaceWith(Object.assign(document.createElement('span'), { className: 'mini-pill', textContent: 'Lädt …' }));
    let it;
    try { it = await pb.send(`/api/bgg/thing/${hit.id}`, { method: 'GET' }); }
    catch (e) { S.bgg.picking = false; S.bgg.error = serverMsg(e); paintBgg(); return; }
    S.bgg.picking = false;
    const src = { id: 'bgg-' + it.bggId, bggId: it.bggId, title: it.title, year: it.year, players: [it.pmin || 1, it.pmax || it.pmin || 1], time: [it.tmin || 0, it.tmax || it.tmin || 0], age: it.age || 0, diff: it.diff || 2, best: it.best, alt: (it.alt || []).join(' | '), pal: it.bggId % PALETTES.length, image: it.image };
    if (it.kind === 'exp') {
      const base = it.baseItem && gameById(it.baseItem);
      S.form = { mode: 'add', kind: 'exp', src, desc: '', genres: [...it.genres], lendable: true, gift: false, lang: 'de', rules: null, base: base?.id || '', baseMissing: base ? '' : (it.bases[0]?.title || ''), adds: '', standalone: false };
    } else S.form = { mode: 'add', kind: 'game', src, desc: '', rec: '', genres: [...it.genres], lendable: true, once: null, done: false, lang: 'de', rules: null, gift: false };
    openSheet(gameFormView());
  },
  'gf-genre': t => { const v = t.dataset.v, a = S.form.genres; S.form.genres = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; rerenderSheet(); },
  'gf-lend': () => { S.form.lendable = !S.form.lendable; rerenderSheet(); },
  'gf-done': () => { S.form.done = !S.form.done; rerenderSheet(); },
  'gf-gift': () => { S.form.gift = !S.form.gift; rerenderSheet(); },
  'gf-lang': t => { S.form.lang = t.dataset.v; rerenderSheet(); },
  'gf-standalone': () => { S.form.standalone = !S.form.standalone; rerenderSheet(); },
  'gf-rlang': t => { S.form.rules.lang = t.dataset.v; rerenderSheet(); },
  'gf-rules-remove': () => { S.form.rules = null; S.form.rulesFile = null; S.form.rulesRemoved = true; rerenderSheet(); $('#gf-rules')?.focus(); },
  'edit-game': t => {
    const g = gameById(t.dataset.id);
    if (isPuzzle(g)) S.form = { mode: 'edit', id: g.id, title: g.title, pieces: g.pieces, otherPieces: ![300, 500, 1000, 1500, 2000].includes(g.pieces), brand: g.brand, w: g.size[0], h: g.size[1], motif: g.motif, missing: g.missing, lendable: g.lendable, done: g.done, gift: g.gift, img: g.img || null };
    else S.form = { mode: 'edit', kind: g.kind, id: g.id, src: g, desc: g.desc, rec: g.rec || '', genres: [...(g.genres || [])], lendable: g.lendable, once: g.once, done: g.done, lang: g.lang || 'de', rules: g.rules ? { ...g.rules } : null, gift: g.gift, base: g.base, adds: g.adds, standalone: g.standalone };
    openSheet(isPuzzle(g) ? puzzleFormView() : gameFormView());
  },
  'gf-save': async () => {
    const F = S.form, exp = F.kind === 'exp';
    if (exp && !F.base) { F.errBase = 'Bitte wähl das Grundspiel.'; rerenderSheet(); $('#gf-base')?.focus(); return; }
    const data = { desc: (F.desc || '').trim(), lendable: F.lendable, lang: F.lang || 'de', rules: F.rules, gift: !!F.gift };
    if (exp) Object.assign(data, { base: F.base, adds: (F.adds || '').trim(), standalone: !!F.standalone, genres: F.standalone ? (F.genres.length ? F.genres : gameById(F.base)?.genres || []) : [] });
    else Object.assign(data, { rec: (F.rec || '').trim(), genres: F.genres.length ? F.genres : ['Familie'], once: F.once && F.once !== 'none' ? F.once : null, done: F.once && F.once !== 'none' ? !!F.done : false });
    const files = {};
    if (F.rulesFile) files.rules = F.rulesFile; else if (F.rulesRemoved) files.rules = null;
    if (F.mode === 'edit') {
      const g = gameById(F.id);
      Object.assign(g, data);
      if (exp && g.standalone && !g.withBase) g.withBase = [g.players[0], Math.max(g.players[1], gameById(g.base).players[1])];
      S.form = {}; openSheet(gameView(g.id)); refresh();
      if (Object.keys(files).length) { if (!(await persist())) return; try { await apiItemFiles(g.id, files); refresh(); } catch (e) { toast(serverMsg(e)); return; } }
      toast('Gespeichert');
      return;
    }
    const src = F.src, id = newId();
    const item = { kind: F.kind, id, title: src.title, bggId: src.bggId || null, players: src.players, time: src.time, age: src.age, diff: src.diff, pal: src.pal, pat: src.pat || '', best: src.best || null, alt: src.alt || '', textHeavy: false, added: T0, knownBy: [], archived: false, ...data };
    if (exp && item.standalone) item.withBase = [src.players[0], Math.max(src.players[1], gameById(F.base).players[1])];
    S.games.push(item);
    closeSheet(); refresh();
    toast(`Ins Regal gestellt: ${src.title}`, { label: 'Ansehen', run: () => { if (S.tab !== 'regal') { S.tab = 'regal'; renderChrome(); renderView(true); } openSheet(gameView(id)); } });
    if (!(await persist())) return;
    if (Object.keys(files).length) { try { await apiItemFiles(id, files); } catch (e) { toast(serverMsg(e)); } }
    if (item.bggId) apiCoverFromBgg(id);
  },
  'pz-pieces': t => { const v = t.dataset.v; if (v === 'other') { S.form.otherPieces = true; } else { S.form.pieces = +v; S.form.otherPieces = false; } rerenderSheet(); if (v === 'other') $('#pz-pieces-n')?.focus(); },
  'pz-motif': t => { S.form.motif = S.form.motif === t.dataset.v ? null : t.dataset.v; rerenderSheet(); },
  'pz-miss': t => { S.form.missing = Math.max(0, S.form.missing + (+t.dataset.v)); rerenderSheet(); },
  'pz-lend': () => { S.form.lendable = !S.form.lendable; rerenderSheet(); },
  'pz-done': () => { S.form.done = !S.form.done; rerenderSheet(); },
  'pz-gift': () => { S.form.gift = !S.form.gift; rerenderSheet(); },
  'pz-img-remove': () => { S.form.img = null; S.form.imgBlob = null; S.form.imgRemoved = true; rerenderSheet(); $('#pz-img')?.focus(); },
  'pz-save': async () => {
    const F = S.form, title = (F.title || '').trim();
    if (!title) { F.err = 'Bitte gib dem Puzzle einen Titel.'; rerenderSheet(); $('#pz-title')?.focus(); return; }
    const pieces = Math.max(10, Math.round(+F.pieces || 1000));
    const data = { title, pieces, brand: (F.brand || '').trim() || 'Ohne Marke', size: [Math.round(+F.w) || 70, Math.round(+F.h) || 50], motif: F.motif || 'Landschaft', missing: F.missing, lendable: F.lendable, done: F.done, gift: F.gift };
    const files = F.imgBlob ? { cover: new File([F.imgBlob], 'schachtel.jpg', { type: 'image/jpeg' }) } : (F.imgRemoved ? { cover: null } : null);
    if (F.mode === 'edit') {
      Object.assign(gameById(F.id), data); coverCache.clear(); const id = F.id; S.form = {}; openSheet(gameView(id)); refresh();
      if (files) { if (!(await persist())) return; try { await apiItemFiles(id, files); refresh(); } catch (e) { toast(serverMsg(e)); return; } }
      toast('Gespeichert'); return;
    }
    const id = newId();
    S.games.push({ kind: 'puzzle', id, ...data, players: [1, 1], time: [0, 0], age: 0, diff: 1, genres: [], desc: '', knownBy: [], archived: false, added: T0, pal: hash(title) % PALETTES.length, pat: ['hills', 'tiles', 'dots', 'rings', 'sun', 'blocks'][hash(title) % 6], img: F.img || null });
    closeSheet(); refresh();
    toast(`Ins Regal gestellt: ${title}`, { label: 'Ansehen', run: () => openSheet(gameView(id)) });
    if (!(await persist())) return;
    if (files) { try { await apiItemFiles(id, files); refresh(); } catch (e) { toast(serverMsg(e)); } }
  },

  /* Personen */
  'add-person': () => { S.form = { mode: 'add', name: '', user: '', ort: '', phone: '', userTouched: false }; openSheet(personFormView()); },
  'edit-person': t => { const u = userById(t.dataset.id); S.form = { mode: 'edit', id: u.id, name: u.name, user: u.username, ort: u.ort || '', phone: u.phone || '' }; openSheet(personFormView()); },
  'access-accept': t => { const a = S.access.find(x => x.id === t.dataset.id); S.form = { mode: 'add', name: a.name, user: slug(a.name.replace(/^(Oma|Opa|Onkel|Tante) /, '')), ort: '', phone: '', userTouched: false, accessId: a.id }; openSheet(personFormView()); },
  'access-decline': t => {
    const i = S.access.findIndex(x => x.id === t.dataset.id), a = S.access[i];
    S.access.splice(i, 1); refresh();
    toast(`Zugangsanfrage von ${a.name} abgelehnt`, { label: 'Rückgängig', run: () => { S.access.splice(i, 0, a); refresh(); } });
  },
  'pf-save': async () => {
    const F = S.form;
    F.name = ($('#pf-name')?.value || '').trim(); F.ort = ($('#pf-ort')?.value || '').trim(); F.phone = ($('#pf-phone')?.value || '').trim();
    if (F.mode === 'add') F.user = ($('#pf-user')?.value || '').trim().toLowerCase();
    F.err = null; F.errText = null;
    if (!F.name) { F.err = 'name'; F.errText = 'Bitte gib einen Namen ein.'; }
    else if (F.mode === 'add' && !/^[a-z0-9.]{2,}$/.test(F.user)) { F.err = 'user'; F.errText = 'Der Benutzername braucht mindestens zwei Zeichen: Kleinbuchstaben, Ziffern oder Punkte.'; }
    else if (F.mode === 'add' && S.users.some(u => u.username === F.user)) { F.err = 'user'; F.errText = 'Diesen Benutzernamen gibt es schon.'; }
    if (F.err) { rerenderSheet(); $(F.err === 'name' ? '#pf-name' : '#pf-user')?.focus(); return; }
    const ini = F.name.replace(/^(Oma|Opa|Onkel|Tante) /, '').charAt(0).toUpperCase();
    if (F.mode === 'edit') { Object.assign(userById(F.id), { name: F.name, ort: F.ort, phone: F.phone, ini }); closeSheet(); refresh(); toast('Gespeichert'); return; }
    const pw = genPw();
    let u;
    try { u = await apiCreateUser({ id: newId(), name: F.name, username: F.user, av: S.users.length % 8, ort: F.ort, phone: F.phone }, pw); }
    catch (e) { F.err = 'user'; F.errText = serverMsg(e); rerenderSheet(); return; }
    if (F.accessId) S.access = S.access.filter(a => a.id !== F.accessId);
    S.form = {};
    openSheet(credView(u.id, pw, true)); refresh();
  },
  'reset-pw': t => openSheet(resetPwView(t.dataset.id)),
  'reset-pw-confirm': async t => { const pw = genPw(); try { await apiSetPassword(t.dataset.id, pw); } catch (e) { toast(serverMsg(e)); return; } openSheet(credView(t.dataset.id, pw, false)); },
  'copy-cred': t => {
    const text = `Spieleschrank\nBenutzername: ${t.dataset.u}\nPasswort: ${t.dataset.p}\nBeim ersten Anmelden wählst du ein eigenes Passwort.`;
    const ok = () => { t.innerHTML = `${ic('check')}Kopiert`; setTimeout(() => { if (document.contains(t)) t.innerHTML = `${ic('copy')}Kopieren`; }, 1800); };
    const fallback = () => { const sel = getSelection(), rg = document.createRange(); rg.selectNodeContents($('#cred')); sel.removeAllRanges(); sel.addRange(rg); toast('Zugangsdaten markiert. Jetzt kopieren.'); };
    try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
  },

  /* Werkzeuge */
  'catalog': () => openSheet(catalogOptionsView()),
  'cat-sort': t => { S.cat.sort = t.dataset.v; rerenderSheet(); },
  'cat-make': () => { closeSheet(); S.view = 'catalog'; renderApp(); scrollTo(0, 0); },
  'cat-close': () => { S.view = 'app'; S.tab = 'verwalten'; renderApp(); scrollTo(0, 0); $('#view .h1')?.focus({ preventScroll: true }); },
  'cat-print': () => window.print(),
  'link': () => { S.form = {}; openSheet(linkView()); },
  'import': async () => {
    S.form = { data: null, status: null }; const form = S.form; openSheet(importView());
    try { form.status = await pb.send('/api/bgg/status', { method: 'GET' }); if (S.form === form) rerenderSheet(); } catch (e) { }
  },
  'imp-go': async () => {
    const F = S.form; if (!F.data || F.busy) return;
    F.busy = true; rerenderSheet();
    try {
      const r = await pb.send('/api/bgg/import', { method: 'POST', body: { rows: F.data.fresh, enrich: true } });
      closeSheet(); await reload();
      toast(`${r.created} ${r.created === 1 ? 'Eintrag' : 'Einträge'} ins Regal gestellt.${r.enrich ? ' Cover kommen nach und nach dazu.' : ''}`);
    } catch (e) { F.busy = false; F.err = serverMsg(e); rerenderSheet(); }
  },
  'imp-enrich': async () => {
    try { const r = await pb.send('/api/bgg/enrich', { method: 'POST' }); toast(r.queued ? `${r.queued} Einträge werden mit BGG ergänzt.` : 'Alle Einträge haben schon ein Cover.'); S.form.status = await pb.send('/api/bgg/status', { method: 'GET' }); rerenderSheet(); }
    catch (e) { toast(serverMsg(e)); }
  },
  'link-copy': t => {
    const ok = () => { t.innerHTML = `${ic('check')}Kopiert`; setTimeout(() => { if (document.contains(t)) t.innerHTML = `${ic('copy')}Kopieren`; }, 1800); };
    const fallback = () => { const sel = getSelection(), rg = document.createRange(); rg.selectNodeContents($('#link-url')); sel.removeAllRanges(); sel.addRange(rg); toast('Link markiert. Jetzt kopieren.'); };
    try { navigator.clipboard.writeText(linkURL()).then(ok, fallback); } catch (e) { fallback(); }
  },
  'link-new': () => { S.form.confirmNew = true; rerenderSheet(); $('#link-new-no')?.focus(); },
  'link-new-cancel': () => { S.form.confirmNew = false; rerenderSheet(); $('#link-new')?.focus(); },
  'link-new-confirm': () => {
    S.settings.link = Array.from({ length: 8 }, () => 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 55)]).join('');
    S.form.confirmNew = false; rerenderSheet(); $('#link-copy')?.focus();
    toast('Neuer Link erstellt. Der alte funktioniert nicht mehr.');
  },
  'link-view': () => window.open(linkURL(), '_blank', 'noopener'),
  'rules-list': () => openSheet(rulesListView()),
  'orphan-list': () => openSheet(orphanListView()),
  'gifted-list': () => openSheet(giftedListView()),
  'settings': () => openSheet(settingsView()),
  'set-new': t => { S.settings.newWeeks = +t.dataset.v; rerenderSheet(); refresh(); },

  /* Anmeldung */
  'pw-toggle': t => { const i = $('#' + (t.dataset.for || 'lg-pw')); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; t.setAttribute('aria-pressed', String(show)); t.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort anzeigen'); t.innerHTML = ic(show ? 'eyeoff' : 'eye'); },
  'access-request': () => { S.form = { name: '', contact: '' }; openSheet(accessRequestView()); },
  'ar-send': async () => {
    const F = S.form; F.name = ($('#ar-name')?.value || '').trim(); F.contact = ($('#ar-contact')?.value || '').trim();
    F.err = !F.name ? 'name' : !F.contact ? 'contact' : null;
    F.errText = F.err === 'name' ? 'Bitte gib deinen Namen ein.' : F.err === 'contact' ? 'Bitte gib an, wie Jakob dich erreicht.' : null;
    if (F.err) { rerenderSheet(); $(F.err === 'name' ? '#ar-name' : '#ar-contact')?.focus(); return; }
    try { await pb.collection('access_requests').create({ name: F.name, contact: F.contact, website: $('#ar-website')?.value || '' }); }
    catch (e) { F.errText = serverMsg(e); rerenderSheet(); return; }
    S.form = {};
    openSheet(simpleDone('Anfrage gesendet', 'Jakob meldet sich bei dir mit deinen Zugangsdaten.'));
  }
};

/* ---------- Ereignisse ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  const fn = A[t.dataset.act];
  if (fn) { e.preventDefault(); Promise.resolve(fn(t, e)).finally(schedulePersist); }
});
document.addEventListener('pointerdown', e => {
  if (pop.hidden) return;
  if (pop.contains(e.target) || (S.popAnchor && S.popAnchor.contains(e.target))) return;
  closePop(false);
});
let qTimer = null;
const FORM_INPUTS = { 'f-msg': 'msg', 'ph-cap': 'cap', 'lst-new': 'newList', 'gf-desc': 'desc', 'gf-rec': 'rec', 'gf-adds': 'adds', 'pf-ort': 'ort', 'pf-phone': 'phone', 'ar-name': 'name', 'ar-contact': 'contact', 'pz-brand': 'brand', 'pz-w': 'w', 'pz-h': 'h', 'pz-pieces-n': 'pieces' };
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') {
    S.q = t.value; $('#q-clear').hidden = !t.value;
    clearTimeout(qTimer); qTimer = setTimeout(() => renderResults(false), 110);
  } else if (t.id === 'bgg-q') bggSearch(t.value);
  else if (t.id === 'pz-title') { S.form.title = t.value; if (S.form.err) { S.form.err = null; } }
  else if (t.id === 'pf-name') { S.form.name = t.value; if (S.form.mode === 'add' && !S.form.userTouched) { S.form.user = slug(t.value.replace(/^(Oma|Opa|Onkel|Tante) /i, '')); const u = $('#pf-user'); if (u) u.value = S.form.user; } }
  else if (t.id === 'pf-user') { S.form.user = t.value; S.form.userTouched = true; }
  else if (t.id === 'lg-user') { const a = $('#lg-forgot'); if (a) a.href = forgotURL(t.value.trim()); }
  else if (FORM_INPUTS[t.id]) S.form[FORM_INPUTS[t.id]] = t.value;
});
function saveBggToken() {
  const el = $('#set-bgg'); if (!el) return;
  const v = el.value.trim();
  if (v === (S.settings.bggToken || '')) return;
  S.settings.bggToken = v; schedulePersist();
  toast(v ? 'BGG-Schlüssel gespeichert' : 'BGG-Schlüssel entfernt');
}
document.addEventListener('change', e => {
  const t = e.target, F = S.form;
  if (t.id === 'set-bgg') { saveBggToken(); return; }
  if (t.name === 'lend-u') { F.uid = t.value; F.err2 = null; rerenderSheet(); document.querySelector(`input[name="lend-u"][value="${t.value}"]`)?.focus({ preventScroll: true }); return; }
  if (t.name === 'give-u') { F.uid = t.value; F.err = null; rerenderSheet(); document.querySelector(`input[name="give-u"][value="${t.value}"]`)?.focus({ preventScroll: true }); return; }
  if (t.name === 'gf-once') { F.once = t.value === 'none' ? null : t.value; if (!F.once) F.done = false; rerenderSheet(); document.querySelector(`input[name="gf-once"][value="${t.value}"]`)?.focus({ preventScroll: true }); return; }
  if (t.name === 'rp-mode') { F.mode = t.value; rerenderSheet(); document.querySelector(`input[name="rp-mode"][value="${t.value}"]`)?.focus({ preventScroll: true }); return; }
  if (t.name === 'xp') { F.extras = t.checked ? [...F.extras, t.value] : F.extras.filter(x => x !== t.value); F.busy = busyOf([F.gid, ...F.extras], F.loanId); rerenderSheet(); return; }
  if (t.name === 'lst') { const li = myLists().find(x => x.id === t.value), gid = S.sheetView && $('#lst-add')?.dataset.id; if (li && gid) { li.ids = t.checked ? [...li.ids, gid] : li.ids.filter(x => x !== gid); rerenderSheet(); refresh(); schedulePersist(); } return; }
  if (t.name === 'cat') { S.cat[t.value] = t.checked; rerenderSheet(); return; }
  if (t.id === 'gf-base') { F.base = t.value; F.errBase = null; return; }
  if (t.id === 'imp-file' && t.files?.[0]) { t.files[0].text().then(txt => { const d = bggRowsFrom(txt); F.data = d; F.err = d ? (d.fresh.length ? null : 'In dieser Datei ist nichts Neues.') : 'Das ist keine BGG-Exportdatei (collection.csv).'; rerenderSheet(); }); return; }
  if (t.id === 'gf-rules' && t.files?.[0]) { const f = t.files[0]; if (f.size > 40 * 1048576) { toast('Das PDF ist größer als 40 MB.'); return; } F.rules = { lang: F.rules?.lang || (F.lang === 'en' ? 'Englisch' : 'Deutsch'), size: mb(f.size), name: f.name }; F.rulesFile = f; F.rulesRemoved = false; rerenderSheet(); return; }
  if (t.id === 'pz-img' && t.files?.[0]) { const f = t.files[0], form = F; shrink(f, 1200).then(r => { if (S.form !== form) return; form.img = r.url; form.imgBlob = r.blob; form.imgRemoved = false; rerenderSheet(); }); return; }
  if (t.id === 'ph-in' && t.files?.length) {
    const files = [...t.files].filter(f => f.type.startsWith('image/')).slice(0, 12), form = F, start = form.photos.length;
    files.forEach(() => form.photos.push({ busy: true }));
    form.err = null; rerenderSheet();
    files.forEach((f, k) => shrink(f).then(r => { if (S.form !== form) return; form.photos[start + k] = { url: r.url, blob: r.blob }; rerenderSheet(); }));
  }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'pw-form') {
    e.preventDefault();
    const p1 = $('#np1').value, p2 = $('#np2').value, err = $('#np-err');
    const msg = p1.length < 8 ? 'Bitte wähl ein Passwort mit mindestens 8 Zeichen.' : p1 !== p2 ? 'Die beiden Passwörter stimmen nicht überein.' : '';
    if (msg) { err.textContent = msg; err.hidden = false; (p1.length < 8 ? $('#np1') : $('#np2')).focus(); return; }
    const btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true;
    changeOwnPassword(p1).then(() => { me().lastVisit = T0; schedulePersist(); renderApp(); scrollTo(0, 0); toast('Passwort gespeichert. Viel Spaß beim Stöbern!'); })
      .catch(ex => { btn.disabled = false; err.textContent = serverMsg(ex); err.hidden = false; });
    return;
  }
  if (e.target.id !== 'login-form') return;
  e.preventDefault();
  const name = $('#lg-user').value.trim().toLowerCase(), pw = $('#lg-pw').value, err = $('#lg-err');
  if (!name) { err.textContent = 'Bitte gib deinen Benutzernamen ein.'; err.hidden = false; $('#lg-user').focus(); return; }
  if (!pw) { err.textContent = 'Bitte gib dein Passwort ein.'; err.hidden = false; $('#lg-pw').focus(); return; }
  const btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Einen Moment …'; err.hidden = true;
  login(name, pw).catch(ex => {
    btn.disabled = false; btn.textContent = 'Anmelden';
    err.textContent = ex.status === 400 ? 'Benutzername oder Passwort stimmt nicht.' : serverMsg(ex); err.hidden = false; $('#lg-pw').focus();
  });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!pop.hidden) { closePop(true); e.preventDefault(); }
    else if (sheetOpen()) { closeSheet(); e.preventDefault(); }
    return;
  }
  if (e.key === 'Enter' && e.target.id === 'bgg-q') { e.preventDefault(); return; }
  if (e.key === 'Enter' && e.target.id === 'lst-new') { e.preventDefault(); $('#lst-add')?.click(); return; }
  /* Kalender: Pfeiltasten springen zum nächsten wählbaren Tag */
  if (e.target.classList?.contains('cal-day') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
    const F = S.form, step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    const d = addDays(parseISO(e.target.dataset.d), step);
    if (d < T0 || dnum(d) > DAYS_AHEAD + 34) return;
    F.focus = d; F.calInfo = null;
    if (d < F.anchor) F.anchor = mondayOf(d);
    if (d > addDays(F.anchor, WEEKS * 7 - 1)) F.anchor = addDays(mondayOf(d), -7 * (WEEKS - 1));
    rerenderSheet(); $(`#cd-${isoD(d)}`)?.focus({ preventScroll: true });
    return;
  }
  if (e.key === 'Tab' && !pop.hidden && pop.contains(document.activeElement)) {
    const f = [...pop.querySelectorAll('button')], first = f[0], last = f[f.length - 1], a = S.popAnchor;
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); closePop(false);
      const all = [...document.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),textarea,select')].filter(el => el.offsetParent !== null && !pop.contains(el));
      (all[all.indexOf(a) + 1] || a)?.focus();
    } else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); closePop(true); }
    return;
  }
  if (e.key === 'Tab' && sheetOpen()) {
    const f = [...sheetPanel.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null || el.type === 'file');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !sheetPanel.contains(document.activeElement))) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }
});
addEventListener('scroll', () => {
  const tb = $('#topbar'); if (tb) tb.classList.toggle('scrolled', scrollY > 4);
  if (!pop.hidden && S.popAnchor && S.popAnchor.closest('.topbar')) closePop(false);
}, { passive: true });
let lastW = innerWidth;
addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; closePop(false); } if (sheetOpen()) footEdge(); });
/* Popup schließt, wenn der Fokus per Tastatur woanders hin wandert (Klicks regelt pointerdown) */
pop.addEventListener('focusout', e => { const to = e.relatedTarget; if (to && !pop.contains(to) && to !== S.popAnchor) closePop(false); });
document.addEventListener('scroll', e => { if (e.target && e.target.id === 'chips') closePop(false); }, true);
document.addEventListener('focusin', e => { if (!pop.hidden && !pop.contains(e.target) && e.target !== S.popAnchor) closePop(false); });

