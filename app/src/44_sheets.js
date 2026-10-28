
/* ---------- Blatt (Handy) bzw. Seitenpanel (Desktop) ---------- */
const sheetRoot = $('#sheet'), sheetPanel = $('#sheet-panel'), sheetBody = $('#sheet-body'), sheetFoot = $('#sheet-foot');
let lastFocus = null, lastKey = null, closeTimer = null;
function focusKey(el) {
  if (!el || el === document.body) return null;
  if (el.id) return '#' + CSS.escape(el.id);
  if (el.matches('#view .h1')) return '#view .h1';
  if (el.dataset && el.dataset.act) return `[data-act="${el.dataset.act}"]` + (el.dataset.id ? `[data-id="${el.dataset.id}"]` : '');
  return null;
}
function restoreFocus(el, key) {
  if (!el || el === document.body) return;
  if (document.contains(el) && el.offsetParent !== null) { el.focus({ preventScroll: true }); return; }
  const k = key && document.querySelector(key);
  (k && k.offsetParent !== null ? k : $('#view .h1') || $('#app .h1'))?.focus({ preventScroll: true });
}
function openSheet(view, { focus = 'title' } = {}) {
  closePop(false);
  const wasOpen = !sheetRoot.hidden && sheetRoot.classList.contains('open');
  S.sheetView = view;
  paintSheet(wasOpen);
  if (!wasOpen) {
    clearTimeout(closeTimer);
    lastFocus = document.activeElement; lastKey = focusKey(lastFocus);
    sheetRoot.hidden = false;
    document.documentElement.classList.add('lock', 'sheet-open');
    sheetBody.scrollTop = 0;
    void sheetPanel.offsetWidth;
    sheetRoot.classList.add('open');
  } else sheetBody.scrollTop = 0;
  requestAnimationFrame(() => { (focus === 'title' ? $('#sheet-title') : $(focus))?.focus({ preventScroll: true }); });
}
/* Trennlinie über dem Fuß nur, solange darunter noch Inhalt steht */
const footEdge = () => sheetPanel.classList.toggle('more', !sheetFoot.hidden && sheetBody.scrollHeight - sheetBody.clientHeight - sheetBody.scrollTop > 4);
sheetBody.addEventListener('scroll', footEdge, { passive: true });
function paintSheet(step) {
  const v = S.sheetView(); if (!v) return;
  sheetBody.innerHTML = v.body;
  sheetFoot.innerHTML = v.foot || '';
  sheetFoot.hidden = !v.foot;
  requestAnimationFrame(footEdge);
  if (step && !reduce()) [sheetBody, sheetFoot].forEach(el => { el.classList.remove('step-in'); void el.offsetWidth; el.classList.add('step-in'); });
}
function rerenderSheet() {
  if (!S.sheetView) return;
  const fid = document.activeElement && sheetPanel.contains(document.activeElement) ? document.activeElement.id : null;
  const st = sheetBody.scrollTop;
  sheetBody.classList.remove('step-in'); sheetFoot.classList.remove('step-in');
  paintSheet(false);
  sheetBody.scrollTop = st;
  if (fid) { const el = document.getElementById(fid); if (el && !el.disabled) el.focus({ preventScroll: true }); else $('#sheet-title')?.focus({ preventScroll: true }); }
}
function closeSheet() {
  if (sheetRoot.hidden) return;
  sheetRoot.classList.remove('open');
  S.sheetView = null; S.form = {}; S.undo = null; S.expOpen = false;
  document.documentElement.classList.remove('sheet-open');
  const done = () => {
    if (sheetRoot.classList.contains('open')) return;
    sheetRoot.hidden = true; sheetBody.innerHTML = ''; sheetFoot.innerHTML = '';
    document.documentElement.classList.remove('lock');
  };
  clearTimeout(closeTimer);
  closeTimer = setTimeout(done, reduce() ? 0 : 460);
  restoreFocus(lastFocus, lastKey);
}
const sheetOpen = () => !sheetRoot.hidden && sheetRoot.classList.contains('open');

/* Wischen zum Schließen (nur Handy) */
(() => {
  let drag = null;
  const grab = $('#sheet-grab'), scrim = sheetRoot.querySelector('.scrim');
  grab.addEventListener('pointerdown', e => {
    if (!isMobile()) return;
    drag = { y0: e.clientY, t0: performance.now(), dy: 0 };
    grab.setPointerCapture(e.pointerId);
    sheetPanel.classList.add('dragging');
  });
  grab.addEventListener('pointermove', e => {
    if (!drag) return;
    drag.dy = Math.max(0, e.clientY - drag.y0);
    sheetPanel.style.transform = `translateY(${drag.dy}px)`;
    scrim.style.opacity = String(1 - Math.min(drag.dy / 420, .7));
  });
  const end = () => {
    if (!drag) return;
    const v = drag.dy / Math.max(1, performance.now() - drag.t0);
    sheetPanel.classList.remove('dragging');
    sheetPanel.style.transform = ''; scrim.style.opacity = '';
    if (drag.dy > 110 || (v > .55 && drag.dy > 24)) closeSheet();
    drag = null;
  };
  grab.addEventListener('pointerup', end);
  grab.addEventListener('pointercancel', end);
})();

/* ---------- Bausteine im Blatt ---------- */
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const joinAnd = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} und ${a[a.length - 1]}`);
/* Spannen wie „5–6“ brechen nie am Strich um */
const nobr = s => String(s).replace(/(\d)–(\d)/g, '$1\u2060–\u2060$2');
const fact = (icon, val, lab, extra = '') => `<div class="fact">${ic(icon)}<div><b>${nobr(val)}</b><span>${lab}</span>${extra ? `<em>${nobr(extra)}</em>` : ''}</div></div>`;
function statusHTML(st) {
  const acts = (st.acts || (st.act ? [st.act] : [])).map(a => `<button class="mini-act" id="st-${a.act}" data-act="${a.act}" data-id="${a.id}">${ic(a.icon || 'next')}${esc(a.label)}</button>`).join('');
  return `<div class="status t-${st.tone}">${ic(st.icon)}<div>${esc(tidy(st.text))}${st.sub ? `<small>${esc(tidy(st.sub))}</small>` : ''}${acts ? `<div class="st-acts">${acts}</div>` : ''}</div></div>`;
}
const head = (title, sub, g) => `<div class="compact-head">${coverEl(g)}<div><h2 class="sheet-title" id="sheet-title" tabindex="-1">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
const MARK = '<svg class="done-mark" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="38"/><path d="M24 39.5l9 9 19-20"/></svg>';
const doneBody = (title, text, extra = '') => `<div class="done">${MARK}<h2 class="sheet-title" id="sheet-title" tabindex="-1" style="padding:0">${title}</h2><p>${text}</p>${extra}</div>`;
const simpleDone = (title, text) => () => ({ body: doneBody(title, text), foot: '<button class="btn btn-primary btn-block" data-act="close-sheet">Fertig</button>' });
const switchRow = (id, label, help, on, act) => `<div class="switch-row"><div><span class="label" id="${id}-l">${label}</span>${help ? `<span class="help">${help}</span>` : ''}</div><button class="switch" id="${id}-sw" role="switch" aria-checked="${!!on}" aria-labelledby="${id}-l" data-act="${act}"></button></div>`;

/* ---------- Spielansicht ---------- */
function gameView(id) {
  return () => {
    const g = gameById(id); if (!g) return null;
    const admin = isAdmin(), pz = isPuzzle(g), ex = isExp(g), st = statusFor(g), cur = current(g.id), mine = admin ? null : mineFor(g.id);
    const tags = pz ? [g.motif, g.brand] : ex && !g.standalone ? ['Erweiterung'] : (g.genres || []);
    let facts;
    if (pz) {
      facts = fact('puzzle', g.pieces.toLocaleString('de-AT'), 'Teile') + fact('ruler', sizeText(g), 'fertige Größe') + fact('box', esc(g.brand), 'Marke')
        + fact(g.missing ? 'puzzle' : 'check', g.missing ? (g.missing === 1 ? '1 Teil fehlt' : `${g.missing} Teile fehlen`) : 'Komplett', 'Vollständigkeit');
    } else {
      const r = reach(g);
      const plExtra = [bestText(g), r.via ? `mit Erweiterung bis ${r.max}` : '', ex && g.standalone && g.withBase ? `mit ${baseOf(g).title} bis ${g.withBase[1]}` : ''].filter(Boolean).join(', ');
      const est = S.f.players && !ex ? `ca. ${minText(estimate(g, Math.min(S.f.players, 8)))} ${zuN(Math.min(S.f.players, 8))}` : '';
      facts = fact('meeple', playersText(g), g.players[0] === g.players[1] && g.players[0] === 1 ? 'Person' : 'Personen', esc(plExtra))
        + fact('glass', timeText(g), 'Spieldauer', est) + fact('gauge', cap(DIFF[g.diff] || 'mittel'), 'Schwierigkeit') + fact('person', `ab ${g.age}`, 'Jahren');
    }
    const rules = pz ? '' : g.rules
      ? `<div class="quiet-row"><button class="rules-link" id="rules-btn" data-act="rules" data-id="${g.id}">${ic('doc')}<span>Regeln <small>(${esc(g.rules.lang)}, PDF${g.rules.size ? `, ${esc(g.rules.size)}` : ''})</small></span></button></div>`
      : admin ? `<div class="quiet-row"><button class="rules-link" data-act="edit-game" data-id="${g.id}">${ic('doc')}<span>Kein Regelheft hinterlegt <small>Hinzufügen</small></span></button></div>` : '';
    const base = baseOf(g);
    const parent = ex && base ? `<div class="parent-note">${ic('layers')}<div>${g.standalone
      ? `Allein spielbar. Zusammen mit <button class="inline-link" data-act="open-game" data-id="${base.id}">${esc(base.title)}</button> für bis zu ${g.withBase ? g.withBase[1] : base.players[1]} Personen.`
      : `Erweiterung für <button class="inline-link" data-act="open-game" data-id="${base.id}">${esc(base.title)}</button>. Zum Spielen brauchst du das Grundspiel.`}${g.adds ? `<br><span class="help">${esc(g.adds)}.</span>` : ''}</div></div>` : '';
    const english = g.lang === 'en' ? `<div class="note">${ic('globe')}<div><b>Englische Ausgabe.</b> ${g.textHeavy ? 'Auf Karten und im Heft steht viel Text, man sollte gut Englisch lesen können.' : 'Im Spiel steht nur wenig Text.'}</div></div>` : '';
    const rec = g.rec ? `<p class="rec">${ic('chat')}<span><b>Jakobs Tipp:</b> ${esc(g.rec)}</span></p>` : '';
    const exps = expsOf(g);
    const expBox = exps.length ? `<div class="exp-box"><button class="exp-toggle" id="exp-toggle" data-act="toggle-exps" aria-expanded="${S.expOpen}" aria-controls="exp-list"><span class="mini-stack" aria-hidden="true">${exps.slice(0, 3).map(e => coverEl(e)).join('')}</span><span><b>${exps.length === 1 ? '1 Erweiterung' : `${exps.length} Erweiterungen`}</b><span>${esc(exps.map(shortExp).join(', '))}</span></span>${ic('chev', 'chev')}</button>
      <ul class="exp-list" id="exp-list" ${S.expOpen ? '' : 'hidden'}>${exps.map(e => { const p = pillFor(e); return `<li><button class="exp-row" data-act="open-game" data-id="${e.id}">${coverEl(e)}<span><b>${esc(shortExp(e))}</b><span>${esc(e.adds)}</span></span>${p ? `<span class="mini-pill t-${p.tone}">${esc(p.t)}</span>` : ic('next')}</button></li>`; }).join('')}</ul></div>` : '';
    let once = '';
    if (g.once) {
      const h = `<p class="once-head">${ic('puzzle')}Einmalspiel</p><p>${g.once === 'intakt' ? 'Jedes Rätsel löst man nur einmal. Das Material bleibt dabei komplett.' : 'Beim Spielen wird Material beschriftet oder zerschnitten. Danach ist es nicht mehr spielbar.'}</p>`;
      if (admin) {
        const known = g.knownBy.map(uname), notYet = S.users.filter(u => !u.admin && !g.knownBy.includes(u.id)).map(u => u.name);
        once = `<div class="once">${h}<p class="people-line"><b>Kennen es schon:</b> ${known.length ? esc(known.join(', ')) : 'noch niemand'}</p><p class="people-line"><b>Noch nicht gespielt:</b> ${notYet.length ? esc(notYet.join(', ')) : 'alle kennen es'}</p></div>`;
      } else {
        const k = g.knownBy.includes(S.user);
        once = `<div class="once">${h}<button class="togglebtn" id="known-btn" data-act="known" data-id="${g.id}" aria-pressed="${k}"><span class="cb">${ic('check')}</span>Kenn ich schon</button><p>${k ? 'Danke! Jakob sieht jetzt, dass du es schon kennst.' : 'Sag Jakob Bescheid, falls du es schon gespielt hast. Dann weiß er, wem er es anbieten kann.'}</p></div>`;
      }
    }
    let adminExtra = '';
    if (admin) {
      const trips = S.loans.filter(l => involves(l, g.id) && (l.status === 'verliehen' || l.status === 'zurück')).sort((a, b) => (b.handed || b.start) - (a.handed || a.start));
      if (trips.length) {
        const orts = [...new Set(trips.map(l => ortOf(l.userId)).filter(Boolean))];
        adminExtra += `<div class="pass"><p class="pass-head">${ic('pin')}<span><b>Spielepass:</b> ${trips.length === 1 ? 'einmal' : `${trips.length}-mal`} verliehen${orts.length ? `, war schon in ${esc(joinAnd(orts))}` : ''}.</span></p><ol class="pass-list">${trips.slice(0, 6).map(l => `<li>${esc(uname(l.userId))}${ortOf(l.userId) ? `, ${esc(ortOf(l.userId))}` : ''}: ${esc(rangeText(l.handed || l.start, l.status === 'zurück' ? l.returned : null))}</li>`).join('')}${trips.length > 6 ? `<li>und ${trips.length - 6} weitere Male</li>` : ''}</ol></div>`;
      }
      const ph = S.photos.filter(p => p.gameId === g.id);
      if (ph.length) adminExtra += `<div class="stack-s"><p class="gal-head">${ic('camera')}Fotos vom Spieleabend</p><div class="thumbs">${ph.flatMap(p => p.urls.map(u => `<img src="${esc(u)}" alt="Foto von ${esc(uname(p.userId))}">`)).join('')}</div></div>`;
      if (pz) adminExtra += `<p class="help">${g.done ? 'Du hast es schon gepuzzelt.' : 'Noch nicht von dir gepuzzelt.'}</p>`;
    }
    const body = `
      <div class="gs-head" style="--tint:${tintOf(g)}">
        ${coverEl(g, isLeihMich(g) ? STICKER : '')}
        <div class="gs-titles"><h2 class="sheet-title" id="sheet-title" tabindex="-1">${esc(g.title)}</h2><div class="tags">${tags.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div></div>
      </div>
      <div class="pad stack">
        ${statusHTML(st)}
        <div class="facts">${facts}</div>
        ${rules}${parent}${english}
        ${g.desc ? `<p class="desc">${esc(g.desc)}</p>` : ''}
        ${rec}${expBox}${once}${adminExtra}
      </div>`;
    let foot = '';
    if (admin) {
      let primary = `<button class="btn btn-primary" data-act="lend" data-id="${g.id}">Verleihen</button>`;
      if (cur?.status === 'reserviert') primary = `<button class="btn btn-primary" data-act="handover" data-id="${cur.id}">${ic('hand')}Übergeben</button>`;
      else if (cur?.status === 'verliehen') primary = `<button class="btn btn-primary" data-act="return" data-id="${cur.id}">Zurückbekommen</button>`;
      else if (g.gift) primary = `<button class="btn btn-primary" data-act="give-pick" data-id="${g.id}">${ic('gift')}Verschenken</button>`;
      foot = `<button class="btn btn-quiet" data-act="edit-game" data-id="${g.id}">Bearbeiten</button>${primary}`;
    } else {
      const on = onList(g.id);
      const mark = `<button class="foot-icon" id="mark-btn" data-act="bookmark" data-id="${g.id}" aria-pressed="${on}" aria-label="${on ? 'Auf deinen Listen. Listen ändern' : 'Auf die Merkliste'}" title="${on ? 'Auf deinen Listen' : 'Merken'}">${ic('bookmark', on ? 'fill' : '')}</button>`;
      let primary = '';
      if (mine?.status === 'angefragt') primary = `<button class="btn btn-quiet" data-act="withdraw" data-id="${mine.id}">Anfrage zurückziehen</button>`;
      else if (mine?.status === 'vorgemerkt') primary = mine.notified ? `<button class="btn btn-primary" data-act="pick-period" data-id="${mine.id}">${ic('cal')}Zeitraum wählen</button>` : `<button class="btn btn-quiet" data-act="withdraw" data-id="${mine.id}">Vormerkung zurückziehen</button>`;
      else if (mine?.status === 'reserviert') primary = `<button class="btn btn-quiet" data-act="cancel-res" data-id="${mine.id}">Reservierung absagen</button>`;
      else if (mine) primary = '';
      else if (myWish(g.id)) primary = `<button class="btn btn-quiet" data-act="unwish" data-id="${g.id}">Wunsch zurückziehen</button>`;
      else if (g.gift) primary = `<button class="btn btn-primary" data-act="wish" data-id="${g.id}">${ic('gift')}Hätte ich gern</button>`;
      else if (g.lendable) primary = `<button class="btn btn-primary" data-act="request" data-id="${g.id}">${cur ? 'Vormerken' : declinedFor(g.id) ? 'Nochmal anfragen' : 'Ausleihen anfragen'}</button>`;
      foot = mark + primary;
    }
    return { body, foot };
  };
}
/* Schaufenster: Spielansicht ohne Status und ohne Ausleihen */
function scGameView(id) {
  return () => {
    const g = gameById(id), pz = isPuzzle(g);
    const facts = pz ? fact('puzzle', g.pieces.toLocaleString('de-AT'), 'Teile') + fact('ruler', sizeText(g), 'fertige Größe')
      : fact('meeple', playersText(g), 'Personen') + fact('glass', timeText(g), 'Spieldauer') + fact('gauge', cap(DIFF[g.diff] || 'mittel'), 'Schwierigkeit') + fact('person', `ab ${g.age}`, 'Jahren');
    return {
      body: `<div class="gs-head" style="--tint:${tintOf(g)}">${coverEl(g)}<div class="gs-titles"><h2 class="sheet-title" id="sheet-title" tabindex="-1">${esc(g.title)}</h2><div class="tags">${(pz ? [g.motif] : g.genres || []).map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div></div></div>
        <div class="pad stack"><div class="facts">${facts}</div>${g.desc ? `<p class="desc">${esc(g.desc)}</p>` : ''}
        <div class="sc-lock">${ic('lock')}<span>Ausleihen können Familie und Freunde mit Zugang. Frag Jakob einfach danach.</span></div></div>`,
      foot: '<button class="btn btn-primary btn-block" data-act="access-request">Zugang anfragen</button>'
    };
  };
}

/* ---------- Kalender: Abholtag plus ein bis drei Rückgabetage innerhalb von drei Wochen ---------- */
/* Rollendes Raster aus fünf Wochen statt Monatsblättern: Abholtag plus drei Wochen passen immer auf einen Blick,
   auch über ein Monatsende hinweg. */
const WEEKS = 5, DAYS_AHEAD = 120;
const startDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
const MSHORT = new Intl.DateTimeFormat('de-AT', { month: 'short' });
const MLONG = new Intl.DateTimeFormat('de-AT', { month: 'long' });
function rangeLabel(a, b) {
  if (a.getMonth() === b.getMonth()) return MF.format(a);
  if (a.getFullYear() === b.getFullYear()) return `${MLONG.format(a)} und ${MF.format(b)}`;
  return `${MF.format(a)} und ${MF.format(b)}`;
}
/* Nach der Wahl des Abholtags rückt das Raster nach, falls der erlaubte Zeitraum sonst nicht ganz sichtbar wäre */
function fitAnchor(F) {
  const start = F.fixedStart ? T0 : F.start; if (!start) return;
  const last = addDays(F.anchor, WEEKS * 7 - 1), lim = calLimit(F);
  if (start < F.anchor || (lim && lim > last)) F.anchor = mondayOf(start);
}
function calLimit(F) {
  const start = F.fixedStart ? T0 : F.start; if (!start) return null;
  let lim = addDays(start, MAXDAYS);
  const nb = (F.busy || []).map(r => startDay(r[0])).filter(a => a > start).sort((a, b) => a - b)[0];
  if (nb && addDays(nb, -1) < lim) lim = addDays(nb, -1);
  return lim;
}
const inBusy = (F, d) => (F.busy || []).some(([a, b]) => d >= startDay(a) && d <= startDay(b));
/* Warum ein Tag nicht geht: wird beim Antippen eines gesperrten Tages angezeigt */
function dayReason(F, d) {
  const start = F.fixedStart ? T0 : F.start;
  if (d < T0) return 'Dieser Tag ist schon vorbei.';
  if (inBusy(F, d)) return 'An diesem Tag ist es schon vergeben.';
  if (F.fixedStart && same(d, start)) return 'Es geht heute los. Tipp auf die Rückgabetage.';
  const lim = calLimit(F);
  if (start && lim && d > lim) return lim < addDays(start, MAXDAYS) ? `Ab ${fdw(addDays(lim, 1))} ist es schon wieder vergeben.` : 'Höchstens drei Wochen ab dem Abholtag.';
  return 'Dieser Tag geht leider nicht.';
}
function dayState(F, d) {
  const start = F.fixedStart ? T0 : F.start, past = d < T0, busy = inBusy(F, d);
  const isStart = same(d, start), isRet = (F.ret || []).some(r => same(r, d));
  let enabled;
  if (!start) enabled = !past && !busy;
  else if (F.fixedStart) enabled = d > start && d <= calLimit(F);
  else if (isStart) enabled = true;
  else if (d < start) enabled = !past && !busy;
  else enabled = d <= calLimit(F);
  return { busy, isStart, isRet, enabled };
}
function calStep(F) {
  const n = (F.ret || []).length;
  if (!F.fixedStart && !F.start) return F.who === 'member' ? 'Tipp auf den Tag, ab dem du es brauchst.' : 'Tipp auf den Tag, ab dem es verliehen ist.';
  if (n === 0) return F.who === 'member' ? 'Jetzt bis zu drei Tage antippen, an denen du es zurückbringen kannst.' : 'Jetzt bis zu drei mögliche Rückgabetage antippen.';
  if (n < 3) return `Du kannst noch ${n === 2 ? 'einen Tag' : 'zwei Tage'} dazunehmen. Musst du aber nicht.`;
  return 'Drei Rückgabetage gewählt.';
}
function calSum(F) {
  const start = F.fixedStart ? T0 : F.start; if (!start) return '';
  const r = F.ret || [], ds = r.length ? `<b>${esc(listDates(r))}</b>` : '';
  let text;
  if (F.who === 'member') text = `Du holst es ab <b>${esc(fdw(start))}</b>${r.length ? ` und bringst es am ${ds} zurück` : ''}.`;
  else if (F.fixedStart) text = `Ab heute verliehen${r.length ? `, zurück am ${ds}` : ''}.`;
  else text = `Ab <b>${esc(fdw(start))}</b>${r.length ? `, zurück am ${ds}` : ''}.`;
  return `<div class="cal-sum"><span>${tidy(text).replace(/\.<\/b>\./g, '.</b>')}</span>${!F.fixedStart ? `<button class="link" id="cal-reset" data-act="cal-reset">Anderen Abholtag wählen</button>` : ''}</div>`;
}
function calHTML(F) {
  const start = F.fixedStart ? T0 : F.start, lastRet = F.ret?.length ? maxD(F.ret) : null;
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(F.anchor, i));
  const states = days.map(d => dayState(F, d));
  let fi = days.findIndex(d => same(d, F.focus));
  if (fi < 0) fi = days.findIndex((d, i) => same(d, start) && states[i].enabled);
  if (fi < 0) fi = states.findIndex(s => s.enabled);
  let cells = '';
  days.forEach((d, i) => {
    const s = states[i], inR = start && lastRet && d >= startDay(start) && d <= lastRet;
    const cls = ['cal-day', s.isStart && 'is-start', s.isRet && 'is-ret', s.busy && 'is-busy', same(d, T0) && 'is-today', inR && 'in-range', inR && same(d, start) && 'range-start', inR && same(d, lastRet) && 'range-end'].filter(Boolean).join(' ');
    const lab = `${fdl(d)}${s.isStart ? (F.fixedStart ? ', heute' : ', Abholtag') : ''}${s.isRet ? ', Rückgabetag' : ''}${s.busy ? ', schon vergeben' : ''}${s.enabled ? '' : ', nicht wählbar'}`;
    const firstOfM = d.getDate() === 1;
    cells += `<button class="${cls}${firstOfM ? ' m1' : ''}" id="cd-${isoD(d)}" data-act="cal-pick" data-d="${isoD(d)}" aria-label="${esc(lab)}" aria-pressed="${s.isStart || s.isRet}" tabindex="${i === fi ? 0 : -1}" ${s.enabled ? '' : 'aria-disabled="true"'}><span>${d.getDate()}${firstOfM ? `<small>${esc(MSHORT.format(d))}</small>` : ''}</span></button>`;
  });
  const canPrev = F.anchor > mondayOf(T0), canNext = dnum(addDays(F.anchor, 28)) <= DAYS_AHEAD;
  return `<div class="cal" id="cal">
    <p class="cal-step" id="cal-step" aria-live="polite">${esc(calStep(F))}</p>
    <div class="cal-head"><button class="icon-btn" id="cal-prev" data-act="cal-prev" aria-label="Frühere Wochen" ${canPrev ? '' : 'disabled'}>${ic('back')}</button><p class="cal-month" id="cal-month">${esc(rangeLabel(days[0] < T0 ? T0 : days[0], days[days.length - 1]))}</p><button class="icon-btn" id="cal-next" data-act="cal-next" aria-label="Spätere Wochen" ${canNext ? '' : 'disabled'}>${ic('next')}</button></div>
    <div class="cal-week" aria-hidden="true">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => `<span>${w}</span>`).join('')}</div>
    <div class="cal-grid" role="group" aria-labelledby="cal-month">${cells}</div>
    <div class="cal-legend" aria-hidden="true"><span><i class="lg-start"></i>${F.fixedStart ? 'Heute' : 'Abholtag'}</span><span><i class="lg-ret"></i>Rückgabetag</span>${(F.busy || []).length ? '<span><i class="lg-busy"></i>Schon vergeben</span>' : ''}</div>
    ${F.calWarn || F.calInfo ? `<p class="cal-hint info" id="cal-info" role="status">${ic('info')}<span>${esc(F.calWarn || F.calInfo)}</span></p>` : ''}
    ${F.err ? `<p class="err" id="cal-err" role="alert">${esc(F.err)}</p>` : ''}
    ${calSum(F)}
  </div>`;
}
const calForm = (o = {}) => ({ who: 'member', start: null, ret: [], anchor: mondayOf(o.start && o.start > T0 ? o.start : T0), busy: [], extras: [], msg: '', focus: null, calWarn: null, err: null, ...o });
function extrasHTML(g, F) {
  const ex = expsOf(g);
  if (!ex.length) return '';
  return `<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:8px;padding:0">Erweiterungen dazu? <span class="opt">(optional)</span></legend><div class="xpicks">${ex.map(e => {
    const out = !!current(e.id) && !F.extras.includes(e.id);
    return `<label class="xpick${out ? ' is-out' : ''}"><input type="checkbox" name="xp" id="xp-${e.id}" value="${e.id}" ${F.extras.includes(e.id) ? 'checked' : ''} ${out ? 'disabled' : ''}>${coverEl(e)}<span><b>${esc(shortExp(e))}</b><span>${out ? 'Gerade verliehen' : esc(e.adds)}</span></span><span class="xcheck">${ic('check')}</span></label>`;
  }).join('')}</div></fieldset>`;
}

/* ---------- Mitglied: Anfrage, Vormerkung, Verlängerung, Fotos, Listen ---------- */
function requestView(id) {
  return () => {
    const g = gameById(id), F = S.form;
    const body = `<div class="pad stack">
      ${head(F.fromLoan ? 'Zeitraum wählen' : 'Ausleihen anfragen', esc(g.title), g)}
      ${calHTML(F)}
      ${extrasHTML(g, F)}
      <div class="field"><label class="label" for="f-msg">Nachricht an Jakob <span class="opt">(optional)</span></label><textarea class="textarea" id="f-msg" placeholder="Zum Beispiel: Für unseren Spieleabend am Samstag">${esc(F.msg || '')}</textarea></div>
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="back-game" data-id="${g.id}">Zurück</button><button class="btn btn-primary" id="send-req" data-act="send-request" data-id="${g.id}">Anfrage senden</button>` };
  };
}
function vormerkView(id) {
  return () => {
    const g = gameById(id), F = S.form, pos = queue(id).length + 1;
    const body = `<div class="pad stack">
      ${head('Vormerken', esc(g.title), g)}
      <p class="sub">Gerade ist es verliehen. Du stellst dich in die Reihe und bist Nummer ${pos}. Sobald Jakob es wieder verleiht, gibt er dir Bescheid, und du wählst deinen Zeitraum.</p>
      <div class="field"><label class="label" for="f-msg">Nachricht an Jakob <span class="opt">(optional)</span></label><textarea class="textarea" id="f-msg" placeholder="Zum Beispiel: Gern vor Weihnachten">${esc(F.msg || '')}</textarea></div>
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="back-game" data-id="${g.id}">Zurück</button><button class="btn btn-primary" data-act="send-vormerk" data-id="${g.id}">Vormerken</button>` };
  };
}
function requestDoneView(id, vor) {
  return () => {
    const g = gameById(id), l = S.loans.find(x => x.gameId === id && x.userId === S.user && OPEN.includes(x.status));
    const text = encodeURIComponent(`Hallo Jakob, ich habe im Spieleschrank „${g.title}“ ${vor ? 'vorgemerkt' : 'angefragt'}.`);
    return {
      body: doneBody(vor ? 'Vorgemerkt' : 'Anfrage gesendet', vor ? `Du bist Nummer ${l ? queuePos(l) : 1} in der Reihe. Sobald Jakob ${esc(g.title)} wieder verleiht, gibt er dir Bescheid.` : 'Jakob sieht deine Anfrage in seiner Übersicht und meldet sich bei dir.', `<a class="btn btn-quiet" href="https://wa.me/?text=${text}" target="_blank" rel="noopener">${ic('chat')}Jakob per WhatsApp Bescheid geben</a>`),
      foot: '<button class="btn btn-primary btn-block" data-act="close-sheet">Fertig</button>'
    };
  };
}
function extendView(loanId) {
  return () => {
    const l = loanById(loanId), g = gameById(l.gameId), next = l.ret.map(d => addDays(d, EXTDAYS));
    const body = `<div class="pad stack">
      ${head('Verlängern', esc(titleOf(l)), g)}
      <p class="sub">Jede Ausleihe kannst du einmal um zwei Wochen verlängern. Jakob bestätigt das kurz.</p>
      <div class="wish-box"><span>Bisher: zurück am <b>${esc(listDates(l.ret))}</b></span><span>Neu: zurück am <b>${esc(listDates(next))}</b></span></div>
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="close-sheet">Abbrechen</button><button class="btn btn-primary" data-act="extend-send" data-id="${l.id}">Verlängerung anfragen</button>` };
  };
}
function photosView(loanId) {
  return () => {
    const l = loanById(loanId), g = gameById(l.gameId), F = S.form;
    const text = encodeURIComponent(`Hallo Jakob, hier ein paar Fotos von unserem Abend mit „${g.title}“.`);
    const body = `<div class="pad stack">
      ${head('Fotos für Jakob', esc(g.title), g)}
      <label class="drop">${ic('camera')}<b>${F.photos.length ? 'Weitere Fotos auswählen' : 'Fotos auswählen'}</b><span>Am Handy kannst du auch direkt fotografieren.</span><input type="file" id="ph-in" accept="image/*" multiple aria-label="Fotos auswählen"></label>
      ${F.photos.length ? `<div class="prev-grid">${F.photos.map((p, i) => `<div class="prev${p.busy ? ' busy' : ''}">${p.busy ? '<img alt="Foto wird vorbereitet">' : `<img src="${esc(p.url)}" alt="Ausgewähltes Foto ${i + 1}">`}<button id="ph-rm-${i}" data-act="photo-remove" data-i="${i}" aria-label="Foto ${i + 1} entfernen">${ic('x')}</button></div>`).join('')}</div>` : ''}
      <div class="field"><label class="label" for="ph-cap">Ein Satz dazu <span class="opt">(optional)</span></label><input class="input" id="ph-cap" value="${esc(F.cap || '')}" placeholder="Zum Beispiel: Oma hat dreimal gewonnen."></div>
      <p class="privacy">${ic('lock')}<span>Nur Jakob sieht deine Fotos. Der Aufnahmeort wird beim Hochladen automatisch entfernt.</span></p>
      <p class="help">Lieber per WhatsApp? <a class="link" href="https://wa.me/?text=${text}" target="_blank" rel="noopener">Dann schick sie Jakob einfach direkt.</a></p>
      ${F.err ? `<p class="err" role="alert">${esc(F.err)}</p>` : ''}
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="close-sheet">Abbrechen</button><button class="btn btn-primary" id="ph-send" data-act="photo-send" data-id="${l.id}">Senden</button>` };
  };
}
function listsView(id) {
  return () => {
    const g = gameById(id), F = S.form, lists = myLists();
    const body = `<div class="pad stack">
      ${head('Auf deine Listen', esc(g.title), g)}
      <div class="stack-s">${lists.map(li => `<label class="lst-row"><input type="checkbox" name="lst" id="lst-${li.id}" value="${li.id}" ${li.ids.includes(id) ? 'checked' : ''}><span class="box">${ic('check')}</span><span>${esc(li.name)}</span><small>${li.ids.filter(x => gameById(x)).length}</small></label>`).join('')}</div>
      <div class="field"><label class="label" for="lst-new">Neue Liste</label><div class="inline-form"><input class="input" id="lst-new" placeholder="Zum Beispiel: Für den Urlaub" value="${esc(F.newList || '')}"><button class="btn btn-quiet" id="lst-add" data-act="list-new" data-id="${id}">Anlegen</button></div></div>
      <p class="help">Deine Listen siehst nur du.</p>
    </div>`;
    return { body, foot: `<button class="btn btn-primary btn-block" data-act="back-game" data-id="${id}">Fertig</button>` };
  };
}

/* ---------- Filter ---------- */
function filtersView() {
  return () => {
    const f = S.f, n = live().filter(onShelf).filter(g => gameHit(g)).length, more = moreCount(f);
    const hasGift = live().some(g => g.gift);
    const body = `<div class="pad stack">
      <h2 class="sheet-title" id="sheet-title" tabindex="-1">Mehr Filter</h2>
      <div class="field"><span class="label" id="fg-l">Genre</span><div class="tags" role="group" aria-labelledby="fg-l">${GENRES.map((x, i) => `<button class="tagbtn" id="fg-${i}" data-act="f-genre" data-v="${esc(x)}" aria-pressed="${f.genres.includes(x)}">${ic('check')}${esc(x)}</button>`).join('')}</div></div>
      <div class="field"><span class="label" id="fd-l">Schwierigkeit</span><div class="seg" role="group" aria-labelledby="fd-l">${[[null, 'Alle'], [1, 'Leicht'], [2, 'Mittel'], [3, 'Schwer']].map(([v, l]) => `<button id="fd-${v ?? 0}" data-act="f-diff" data-v="${v ?? ''}" aria-pressed="${f.diff === v}">${l}</button>`).join('')}</div></div>
      <div class="field"><span class="label" id="fa-l">Jüngste Person am Tisch</span><div class="seg" role="group" aria-labelledby="fa-l">${[[null, 'Egal'], [6, '6 J.'], [8, '8 J.'], [10, '10 J.'], [12, '12 J.']].map(([v, l]) => `<button id="fa-${v ?? 0}" data-act="f-age" data-v="${v ?? ''}" aria-pressed="${f.age === v}" ${v ? `aria-label="${v} Jahre"` : ''}>${l}</button>`).join('')}</div><p class="help">Zeigt Spiele, die laut Schachtel ab diesem Alter passen.</p></div>
      ${switchRow('fx', 'Erweiterungen zeigen', 'Sie stehen dann direkt hinter ihrem Spiel.', f.exp, 'f-exp')}
      ${hasGift ? switchRow('fgf', 'Nur zu verschenken', 'Spiele, die Jakob weitergeben möchte.', f.gift, 'f-gift') : ''}
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="f-reset-more" ${more ? '' : 'disabled'}>Zurücksetzen</button><button class="btn btn-primary" data-act="close-sheet">${n === 1 ? '1 Spiel anzeigen' : `${n} Spiele anzeigen`}</button>` };
  };
}
function puzzleFiltersView() {
  return () => {
    const f = S.pf, n = live().filter(isPuzzle).filter(p => puzzleHit(p)).length, more = pMoreCount(f);
    const body = `<div class="pad stack">
      <h2 class="sheet-title" id="sheet-title" tabindex="-1">Mehr Filter</h2>
      <div class="field"><span class="label" id="pm-l">Motiv</span><div class="tags" role="group" aria-labelledby="pm-l">${MOTIFS.map((x, i) => `<button class="tagbtn" id="pm-${i}" data-act="p-motif" data-v="${esc(x)}" aria-pressed="${f.motifs.includes(x)}">${ic('check')}${esc(x)}</button>`).join('')}</div></div>
      <div class="field"><span class="label" id="pb-l">Marke</span><div class="tags" role="group" aria-labelledby="pb-l">${brands().map((x, i) => `<button class="tagbtn" id="pb-${i}" data-act="p-brand" data-v="${esc(x)}" aria-pressed="${f.brands.includes(x)}">${ic('check')}${esc(x)}</button>`).join('')}</div></div>
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="p-reset-more" ${more ? '' : 'disabled'}>Zurücksetzen</button><button class="btn btn-primary" data-act="close-sheet">${n === 1 ? '1 Puzzle anzeigen' : `${n} Puzzles anzeigen`}</button>` };
  };
}

/* ---------- Jakob: annehmen, verleihen, zurückbekommen, verschenken ---------- */
function pubHTML(F, name) {
  const preview = !F.pub ? 'Gerade verliehen.' : F.mode === 'open' ? `Gerade bei ${name}, ohne festes Rückgabedatum.` : (F.ret?.length ? `Gerade bei ${name}, zurück am ${listDates(F.ret)}.` : `Gerade bei ${name}.`);
  return switchRow('pub', 'Für alle sichtbar', `Andere sehen: „${esc(tidy(preview))}“`, F.pub, 'f-pub');
}
function acceptView(loanId) {
  return () => {
    const l = loanById(loanId), g = gameById(l.gameId), u = userById(l.userId), F = S.form;
    const ex = l.extras.map(gameById).filter(Boolean);
    const clash = busyOf([l.gameId, ...l.extras], l.id).some(([a, b]) => l.start <= startDay(b) && maxD(l.ret) >= startDay(a));
    const body = `<div class="pad stack">
      ${head(`${esc(g.title)} an ${esc(u.name)}`, ex.length ? `Mit ${esc(ex.map(shortExp).join(' und '))}` : '', g)}
      <div class="wish-box"><span>Wunsch von ${esc(u.name)}:</span><span>Ab <b>${esc(fdw(l.start))}</b>, zurück am <b>${esc(listDates(l.ret))}</b></span>${clash ? '<span class="err">Überschneidet sich mit einer anderen Zusage. Wähl „Anders“.</span>' : ''}</div>
      <div class="field"><span class="label" id="am-l">Zeitraum</span><div class="seg" role="group" aria-labelledby="am-l">${[['wish', 'Wie gewünscht'], ['other', 'Anders'], ['open', 'Offen']].map(([v, t]) => `<button id="am-${v}" data-act="acc-mode" data-v="${v}" aria-pressed="${F.mode === v}">${t}</button>`).join('')}</div>${F.mode === 'open' ? '<p class="help">Ohne festes Rückgabedatum. Das kannst nur du so vergeben.</p>' : ''}</div>
      ${F.mode === 'other' ? calHTML(F) : ''}
      ${F.err && F.mode !== 'other' ? `<p class="err" role="alert">${esc(F.err)}</p>` : ''}
      ${pubHTML(F.mode === 'wish' ? { ...F, ret: l.ret } : F, u.name)}
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="close-sheet">Abbrechen</button><button class="btn btn-primary" data-act="accept-confirm" data-id="${l.id}">Annehmen</button>` };
  };
}
function lendView(gid) {
  return () => {
    const g = gameById(gid), F = S.form;
    const asked = new Set([...pendingReq(g.id), ...queue(g.id)].map(l => l.userId));
    const people = S.users.filter(u => !u.admin);
    const body = `<div class="pad stack">
      ${head(`${esc(g.title)} verleihen`, 'Direkt übergeben, ohne Anfrage.', g)}
      <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:8px;padding:0">An wen?</legend>
        <div class="pick-list">${people.map(u => `<label class="pick"><input type="radio" name="lend-u" value="${u.id}" ${F.uid === u.id ? 'checked' : ''}>${avatar(u, 'sm')}<span>${esc(u.name)}</span>${asked.has(u.id) ? '<small>wartet darauf</small>' : u.ort ? `<small style="color:var(--fg-3)">${esc(u.ort)}</small>` : ''}</label>`).join('')}</div>
        ${F.err2 ? `<p class="err" style="margin-top:8px" role="alert">${esc(F.err2)}</p>` : ''}
      </fieldset>
      <div class="field"><span class="label" id="lm-l">Zeitraum</span><div class="seg" role="group" aria-labelledby="lm-l">${[['days', 'Mit Rückgabetagen'], ['open', 'Offen']].map(([v, t]) => `<button id="lm-${v}" data-act="lend-mode" data-v="${v}" aria-pressed="${F.mode === v}">${t}</button>`).join('')}</div>${F.mode === 'open' ? '<p class="help">Ohne festes Rückgabedatum. Das kannst nur du so vergeben.</p>' : ''}</div>
      ${F.mode === 'days' ? calHTML(F) : (F.err ? `<p class="err" role="alert">${esc(F.err)}</p>` : '')}
      ${extrasHTML(g, F)}
      ${pubHTML(F, F.uid ? uname(F.uid) : 'der Person')}
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="back-game" data-id="${g.id}">Abbrechen</button><button class="btn btn-primary" data-act="lend-confirm" data-id="${g.id}">Verleihen</button>` };
  };
}
function doneWithWa(title, text, uid, wa, waLabel) {
  return { body: doneBody(title, text, `<a class="btn btn-quiet" href="${esc(waLink(uid, wa))}" target="_blank" rel="noopener">${ic('chat')}${esc(waLabel)}</a>`), foot: `<button class="btn btn-quiet" data-act="undo-done">Rückgängig</button><button class="btn btn-primary" data-act="close-sheet">Fertig</button>` };
}
const acceptDoneView = id => () => { const l = loanById(id), u = userById(l.userId); return doneWithWa('Angenommen', `${esc(titleOf(l))} ist für ${esc(u.name)} reserviert. ${esc(u.name)} sieht das unter „Meine“.`, u.id, `Hallo ${u.name}, „${titleOf(l)}“ ist für dich reserviert${l.start && l.start > T0 ? ` ab ${fdw(l.start)}` : ''}. Wann magst du es abholen?`, `${u.name} per WhatsApp Bescheid geben`); };
const declineDoneView = id => () => { const l = loanById(id), u = userById(l.userId); return doneWithWa('Abgelehnt', `${esc(u.name)} sieht ${l.reason ? 'die Ablehnung samt Grund' : 'die Ablehnung'} unter „Meine“. Wenn es persönlicher sein soll, schreib kurz dazu.`, u.id, `Hallo ${u.name}, „${titleOf(l)}“ kann ich dir gerade leider nicht leihen.${l.reason ? ' ' + l.reason : ''}`, `${u.name} per WhatsApp schreiben`); };
const notifyDoneView = id => () => { const l = loanById(id), u = userById(l.userId), g = gameById(l.gameId); return doneWithWa(`${esc(u.name)} weiß Bescheid`, `${esc(u.name)} sieht unter „Meine“, dass ${esc(g.title)} wieder da ist, und wählt dort ihren Zeitraum. Danach kommt die Anfrage zu dir.`, u.id, `Hallo ${u.name}, „${g.title}“ ist wieder da. Wähl einfach im Spieleschrank, wann du es holen magst.`, `${u.name} per WhatsApp Bescheid geben`); };
function returnPuzzleView(loanId) {
  return () => {
    const l = loanById(loanId), g = gameById(l.gameId), F = S.form;
    const body = `<div class="pad stack">
      ${head(`${esc(g.title)} zurück`, `von ${esc(uname(l.userId))}`, g)}
      <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:8px;padding:0">Alle Teile da?</legend><div class="radios">
        <label class="radio"><input type="radio" name="rp-mode" value="ok" ${F.mode === 'ok' ? 'checked' : ''}><span class="dot"></span><span><b>Ja, komplett</b><span>${g.missing ? `Bisher ${g.missing === 1 ? 'fehlte 1 Teil' : `fehlten ${g.missing} Teile`}, das bleibt so.` : 'Alles vollständig.'}</span></span></label>
        <label class="radio"><input type="radio" name="rp-mode" value="missing" ${F.mode === 'missing' ? 'checked' : ''}><span class="dot"></span><span><b>Es fehlen Teile</b><span>Wird beim Puzzle vermerkt, damit alle Bescheid wissen.</span></span></label>
      </div></fieldset>
      ${F.mode === 'missing' ? `<div class="field"><span class="label" id="rpn-l">Wie viele fehlen insgesamt?</span><div class="stepper" role="group" aria-labelledby="rpn-l"><button id="rp-dec" data-act="rp-dec" aria-label="Eins weniger" ${F.n <= 1 ? 'disabled' : ''}>${ic('minus')}</button><output aria-live="polite">${F.n}</output><button id="rp-inc" data-act="rp-inc" aria-label="Eins mehr">${ic('plus')}</button></div></div>` : ''}
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="close-sheet">Abbrechen</button><button class="btn btn-primary" data-act="return-confirm" data-id="${l.id}">Zurückbekommen</button>` };
  };
}
function giveView(gid) {
  return () => {
    const g = gameById(gid), F = S.form, wish = new Set(wishesFor(gid).map(w => w.userId));
    const people = S.users.filter(u => !u.admin).sort((a, b) => wish.has(b.id) - wish.has(a.id));
    const body = `<div class="pad stack">
      ${head(`${esc(g.title)} verschenken`, 'Danach verschwindet es aus dem Regal. In deinem Archiv bleibt es.', g)}
      <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:8px;padding:0">An wen?</legend>
        <div class="pick-list">${people.map(u => `<label class="pick"><input type="radio" name="give-u" value="${u.id}" ${F.uid === u.id ? 'checked' : ''}>${avatar(u, 'sm')}<span>${esc(u.name)}</span>${wish.has(u.id) ? '<small>hätte es gern</small>' : ''}</label>`).join('')}</div>
        ${F.err ? `<p class="err" style="margin-top:8px" role="alert">${esc(F.err)}</p>` : ''}
      </fieldset>
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="back-game" data-id="${g.id}">Abbrechen</button><button class="btn btn-primary" data-act="give-confirm" data-id="${g.id}">${ic('gift')}Verschenken</button>` };
  };
}

/* ---------- Hinzufügen und Bearbeiten ---------- */
function addChooserView() {
  return () => ({
    body: `<div class="pad stack">
      <h2 class="sheet-title" id="sheet-title" tabindex="-1">Was kommt dazu?</h2>
      <div class="option-cards">
        <button class="option-card" data-act="add-bgg"><span class="oc-ic">${ic('meeple')}</span><span><b>Spiel oder Erweiterung</b><span>Eckdaten und Cover kommen von BoardGameGeek.</span></span>${ic('next')}</button>
        <button class="option-card" data-act="add-puzzle"><span class="oc-ic">${ic('puzzle')}</span><span><b>Puzzle</b><span>Mit einem Foto der Schachtel und ein paar Angaben.</span></span>${ic('next')}</button>
      </div>
    </div>`, foot: ''
  });
}
function bggView() {
  return () => ({
    body: `<div class="pad stack">
      <h2 class="sheet-title" id="sheet-title" tabindex="-1">Spiel oder Erweiterung</h2>
      <div class="search">${ic('search')}<input id="bgg-q" type="search" placeholder="Titel bei BoardGameGeek suchen" value="${esc(S.bgg.q)}" autocomplete="off" enterkeyhint="search" aria-label="Titel bei BoardGameGeek suchen"></div>
      <div id="bgg-results">${bggResultsHTML()}</div>
    </div>`, foot: '<button class="btn btn-quiet btn-block" data-act="add-item">Zurück</button>'
  });
}
function bggResultsHTML() {
  const b = S.bgg;
  if (b.loading) return `<div aria-busy="true">${[0, 1, 2].map(() => `<div class="skel-row"><div class="skel"></div><div class="skel-lines"><div class="skel" style="height:14px;width:62%"></div><div class="skel" style="height:12px;width:40%"></div></div></div>`).join('')}<span class="sr">Suche läuft</span></div>`;
  if (b.error) return `<p class="quiet-empty">${esc(b.error)}</p>`;
  if (!b.q.trim() || !b.results) return `<p class="bgg-note">Eckdaten und Cover kommen von BoardGameGeek. Erweiterungen ordnen sich ihrem Grundspiel zu. Englische Titel finden oft mehr.</p>`;
  if (!b.results.length) return `<p class="quiet-empty">Kein Treffer für „${esc(b.q.trim())}“. Prüf die Schreibweise oder versuch den englischen Titel.</p>`;
  return `<ul class="bgg-list">${b.results.map((it, i) => {
    const has = !!it.owned && !!gameById(it.owned) && !gameById(it.owned).archived;
    const fake = { id: 'bgg-' + it.id, kind: 'game', title: it.name, pal: it.id % PALETTES.length };
    const line = `${it.type === 'boardgameexpansion' ? 'Erweiterung' : 'Spiel'}${it.year ? `, ${it.year}` : ''}`;
    return `<li><button class="bgg-row" data-act="bgg-pick" data-i="${i}" ${has ? 'disabled aria-disabled="true"' : ''}>${coverEl(fake)}<span><b>${esc(it.name)}</b><span>${line}</span></span>${has ? '<span class="mini-pill">Schon im Regal</span>' : ic('next')}</button></li>`;
  }).join('')}</ul><p class="bgg-note" style="margin-top:12px">Daten von BoardGameGeek</p>`;
}
let bggTimer = null, bggSeq = 0;
function bggSearch(q) {
  S.bgg.q = q; S.bgg.error = null;
  clearTimeout(bggTimer);
  if (q.trim().length < 2) { S.bgg.loading = false; S.bgg.results = null; paintBgg(); return; }
  S.bgg.loading = true; paintBgg();
  const seq = ++bggSeq;
  bggTimer = setTimeout(async () => {
    try {
      const d = await pb.send('/api/bgg/search', { method: 'GET', query: { q: q.trim() } });
      if (seq !== bggSeq) return;
      S.bgg.results = d.items;
    } catch (e) { if (seq !== bggSeq) return; S.bgg.results = null; S.bgg.error = serverMsg(e); }
    S.bgg.loading = false; paintBgg();
  }, 450);
}
const paintBgg = () => { const el = $('#bgg-results'); if (el) el.innerHTML = bggResultsHTML(); };

function rulesField(F) {
  return `<div class="field"><span class="label">Regelheft <span class="opt">(PDF)</span></span>
    ${F.rules ? `<div class="file-line">${ic('doc')}<span>Regeln<small>${esc(F.rules.lang)}, PDF${F.rules.size ? `, ${esc(F.rules.size)}` : ''}${F.rules.name ? `, ${esc(F.rules.name)}` : ''}</small></span><button class="btn btn-ghost btn-sm" data-act="gf-rules-remove">Entfernen</button></div>` : ''}
    <label class="btn btn-quiet btn-sm file-pick" style="justify-self:start">${ic('doc')}${F.rules ? 'Anderes PDF wählen' : 'PDF auswählen'}<input type="file" id="gf-rules" accept="application/pdf" aria-label="Regelheft als PDF auswählen"></label>
    ${F.rules ? `<div class="seg" role="group" aria-label="Sprache des Regelhefts" style="max-width:280px">${['Deutsch', 'Englisch'].map(v => `<button id="gfr-${v}" data-act="gf-rlang" data-v="${v}" aria-pressed="${F.rules.lang === v}">${v}</button>`).join('')}</div>` : ''}
    <p class="help">Das PDF liegt auf deinem Server und ist nur nach dem Anmelden abrufbar. Tipp: Für deutsche Ausgaben ist das Regelheft vom Verlag oft die beste Quelle.</p>
  </div>`;
}
function gameFormView() {
  return () => {
    const F = S.form, src = F.src, add = F.mode === 'add', exp = F.kind === 'exp', once = F.once || 'none';
    const bases = live().filter(isBaseGame).sort(byTitle);
    const info = exp ? `Erweiterung, ${playersLong(src)}` : `${playersLong(src)}, ${timeText(src)}, ab ${src.age} Jahren`;
    const body = `<div class="pad stack">
      ${head(esc(src.title), `${esc(info)}${add ? `<br><span class="bgg-note">Daten von BoardGameGeek${src.year ? `, ${src.year}` : ''}</span>` : ''}`, { ...src, kind: 'game' })}
      ${exp ? `<div class="field"><label class="label" for="gf-base">Erweiterung für</label><select class="input" id="gf-base">${F.base ? '' : '<option value="">Bitte wählen</option>'}${bases.map(b => `<option value="${b.id}" ${F.base === b.id ? 'selected' : ''}>${esc(b.title)}</option>`).join('')}</select>${F.baseMissing ? `<p class="help">„${esc(F.baseMissing)}“ steht noch nicht im Regal. Wähl das passende Grundspiel oder füge es zuerst hinzu.</p>` : ''}${F.errBase ? `<p class="err" role="alert">${esc(F.errBase)}</p>` : ''}</div>
        <div class="field"><label class="label" for="gf-adds">Was bringt sie? <span class="opt">(ein kurzer Satz)</span></label><input class="input" id="gf-adds" value="${esc(F.adds || '')}" placeholder="Zum Beispiel: Für bis zu sechs Personen"></div>
        ${switchRow('gfs', 'Auch allein spielbar', 'Steht dann zusätzlich als eigenes Spiel im Regal.', F.standalone, 'gf-standalone')}` : ''}
      <div class="field"><label class="label" for="gf-desc">Kurz gesagt <span class="opt">(optional)</span></label><textarea class="textarea" id="gf-desc" placeholder="Ein, zwei Sätze für deine Familie, worum es geht.">${esc(F.desc || '')}</textarea></div>
      ${!exp ? `<div class="field"><label class="label" for="gf-rec">Dein Tipp <span class="opt">(optional)</span></label><input class="input" id="gf-rec" value="${esc(F.rec || '')}" placeholder="Zum Beispiel: Fürs erste Mal ohne Erweiterung"><p class="help">Erscheint in der Spielansicht als „Jakobs Tipp“.</p></div>` : ''}
      ${!exp || F.standalone ? `<div class="field"><span class="label" id="gfg-l">Genres</span><div class="tags" role="group" aria-labelledby="gfg-l">${GENRES.map((x, i) => `<button class="tagbtn" id="gfg-${i}" data-act="gf-genre" data-v="${esc(x)}" aria-pressed="${F.genres.includes(x)}">${ic('check')}${esc(x)}</button>`).join('')}</div></div>` : ''}
      <div class="field"><span class="label" id="gflang-l">Sprache der Ausgabe</span><div class="seg" role="group" aria-labelledby="gflang-l">${[['de', 'Deutsch'], ['en', 'Englisch']].map(([v, l]) => `<button id="gflang-${v}" data-act="gf-lang" data-v="${v}" aria-pressed="${(F.lang || 'de') === v}">${l}</button>`).join('')}</div></div>
      ${rulesField(F)}
      ${switchRow('gfl', 'Verleihbar', F.lendable ? 'Alle können es anfragen.' : 'Erscheint als „Nur gemeinsam“.', F.lendable, 'gf-lend')}
      ${switchRow('gfgift', 'Zu verschenken', F.gift ? 'Alle sehen „Hätte ich gern“. Du entscheidest, wer es bekommt.' : 'Wenn du es weitergeben möchtest.', F.gift, 'gf-gift')}
      ${!exp ? `<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:8px;padding:0">Spielart</legend><div class="radios">
        ${[['none', 'Normales Spiel', 'Lässt sich beliebig oft spielen.'], ['intakt', 'Einmalspiel, Material bleibt komplett', 'Etwa Krimifälle oder Unlock. Gut zum Weitergeben.'], ['verbraucht', 'Einmalspiel, Material wird verbraucht', 'Etwa EXIT-Spiele, bei denen man schneidet oder schreibt.']]
          .map(([v, t, s]) => `<label class="radio"><input type="radio" name="gf-once" value="${v}" ${once === v ? 'checked' : ''}><span class="dot"></span><span><b>${t}</b><span>${s}</span></span></label>`).join('')}
      </div></fieldset>
      ${once !== 'none' ? switchRow('gfd', 'Schon durchgespielt', once === 'intakt' ? 'Taucht dann für alle unter „Leih mich!“ auf.' : 'Danach ist es nicht mehr spielbar.', F.done, 'gf-done') : ''}` : ''}
    </div>`;
    const foot = add ? `<button class="btn btn-quiet" data-act="add-bgg">Zurück</button><button class="btn btn-primary" data-act="gf-save">Ins Regal stellen</button>`
      : `<button class="btn btn-quiet" data-act="back-game" data-id="${F.id}">Abbrechen</button><button class="btn btn-primary" data-act="gf-save">Speichern</button>`;
    return { body, foot };
  };
}
function puzzleFormView() {
  return () => {
    const F = S.form, add = F.mode === 'add';
    const known = [300, 500, 1000, 1500, 2000];
    const body = `<div class="pad stack">
      <h2 class="sheet-title" id="sheet-title" tabindex="-1">${add ? 'Puzzle hinzufügen' : 'Puzzle bearbeiten'}</h2>
      ${F.img ? `<div class="prev" style="max-width:240px"><img src="${esc(F.img)}" alt="Foto der Schachtel" style="aspect-ratio:4/3"><button id="pz-img-rm" data-act="pz-img-remove" aria-label="Foto entfernen">${ic('x')}</button></div>`
        : `<label class="drop">${ic('camera')}<b>Foto der Schachtel</b><span>Am besten gerade von vorne, bei Tageslicht. Ohne Foto gibt es ein Platzhalter-Bild.</span><input type="file" id="pz-img" accept="image/*" aria-label="Foto der Schachtel auswählen"></label>`}
      <div class="field"><label class="label" for="pz-title">Titel</label><input class="input" id="pz-title" value="${esc(F.title || '')}" placeholder="Zum Beispiel: Alpenpanorama" ${F.err ? 'aria-invalid="true" aria-describedby="pz-err"' : ''}>${F.err ? `<p class="err" id="pz-err" role="alert">${esc(F.err)}</p>` : ''}</div>
      <div class="field"><span class="label" id="pzp-l">Teile</span><div class="tags" role="group" aria-labelledby="pzp-l">${known.map(n => `<button class="tagbtn" id="pzp-${n}" data-act="pz-pieces" data-v="${n}" aria-pressed="${F.pieces === n && !F.otherPieces}">${ic('check')}${n.toLocaleString('de-AT')}</button>`).join('')}<button class="tagbtn" id="pzp-other" data-act="pz-pieces" data-v="other" aria-pressed="${!!F.otherPieces}">${ic('check')}Andere</button></div>${F.otherPieces ? `<input class="input" id="pz-pieces-n" type="number" inputmode="numeric" min="10" max="40000" value="${esc(F.pieces || '')}" aria-label="Anzahl der Teile" style="max-width:180px">` : ''}</div>
      <div class="field"><label class="label" for="pz-brand">Marke</label><input class="input" id="pz-brand" list="pz-brands" value="${esc(F.brand || '')}" placeholder="Zum Beispiel: Ravensburger"><datalist id="pz-brands">${brands().map(b => `<option value="${esc(b)}"></option>`).join('')}</datalist></div>
      <div class="field"><span class="label" id="pzs-l">Fertige Größe</span><div class="two-inputs" role="group" aria-labelledby="pzs-l"><input class="input" id="pz-w" type="number" inputmode="numeric" value="${esc(F.w || '')}" placeholder="70" aria-label="Breite in Zentimetern"><span>×</span><input class="input" id="pz-h" type="number" inputmode="numeric" value="${esc(F.h || '')}" placeholder="50" aria-label="Höhe in Zentimetern"></div><p class="help">In Zentimetern. Steht meist auf der Schachtel.</p></div>
      <div class="field"><span class="label" id="pzm-l">Motiv</span><div class="tags" role="group" aria-labelledby="pzm-l">${MOTIFS.map((x, i) => `<button class="tagbtn" id="pzm-${i}" data-act="pz-motif" data-v="${esc(x)}" aria-pressed="${F.motif === x}">${ic('check')}${esc(x)}</button>`).join('')}</div></div>
      <div class="field"><span class="label" id="pzx-l">Fehlende Teile</span><div class="stepper" role="group" aria-labelledby="pzx-l"><button id="pz-dec" data-act="pz-miss" data-v="-1" aria-label="Eins weniger" ${F.missing <= 0 ? 'disabled' : ''}>${ic('minus')}</button><output aria-live="polite">${F.missing}</output><button id="pz-inc" data-act="pz-miss" data-v="1" aria-label="Eins mehr">${ic('plus')}</button></div></div>
      ${switchRow('pzl', 'Verleihbar', F.lendable ? 'Alle können es anfragen.' : 'Steht im Regal, lässt sich aber nicht anfragen.', F.lendable, 'pz-lend')}
      ${switchRow('pzd', 'Schon gepuzzelt', '', F.done, 'pz-done')}
      ${switchRow('pzg', 'Zu verschenken', '', F.gift, 'pz-gift')}
    </div>`;
    const foot = add ? `<button class="btn btn-quiet" data-act="add-item">Zurück</button><button class="btn btn-primary" data-act="pz-save">Ins Regal stellen</button>`
      : `<button class="btn btn-quiet" data-act="back-game" data-id="${F.id}">Abbrechen</button><button class="btn btn-primary" data-act="pz-save">Speichern</button>`;
    return { body, foot };
  };
}

/* ---------- Personen und Zugänge ---------- */
const PW_WORDS = ['Meeple', 'Joker', 'Turm', 'Insel', 'Krone', 'Drache', 'Stern', 'Burg', 'Karte', 'Feder', 'Pfeil', 'Kompass', 'Laterne', 'Anker'];
function genPw() { const a = PW_WORDS[Math.floor(Math.random() * PW_WORDS.length)]; let b; do { b = PW_WORDS[Math.floor(Math.random() * PW_WORDS.length)]; } while (b === a); return `${a}-${b}-${10 + Math.floor(Math.random() * 90)}`; }
const slug = s => normAE(s).replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
const orts = () => [...new Set(S.users.map(u => u.ort).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
function personFormView() {
  return () => {
    const F = S.form, edit = F.mode === 'edit';
    const body = `<div class="pad stack">
      <div><h2 class="sheet-title" id="sheet-title" tabindex="-1">${edit ? `${esc(F.name)} bearbeiten` : 'Person hinzufügen'}</h2>${edit ? '' : '<p class="sub" style="margin-top:6px">Lege einen Zugang an und schick die Zugangsdaten per Nachricht weiter.</p>'}</div>
      <div class="field"><label class="label" for="pf-name">Name</label><input class="input" id="pf-name" value="${esc(F.name || '')}" placeholder="zum Beispiel Michael Gruber" ${F.err === 'name' ? 'aria-invalid="true" aria-describedby="pf-err"' : ''}></div>
      ${edit ? `<p class="help">Benutzername: ${esc(F.user)}</p>` : `<div class="field"><label class="label" for="pf-user">Benutzername</label><input class="input" id="pf-user" value="${esc(F.user || '')}" autocapitalize="none" spellcheck="false" ${F.err === 'user' ? 'aria-invalid="true" aria-describedby="pf-err"' : ''}><p class="help">Wird beim Anmelden eingegeben. Kleinbuchstaben, ohne Leerzeichen.</p></div>`}
      <div class="field"><label class="label" for="pf-ort">Ort <span class="opt">(optional)</span></label><input class="input" id="pf-ort" list="pf-orts" value="${esc(F.ort || '')}" placeholder="zum Beispiel Mauthausen"><datalist id="pf-orts">${orts().map(o => `<option value="${esc(o)}"></option>`).join('')}</datalist><p class="help">Nur für dich: In Verwalten kannst du danach filtern.</p></div>
      <div class="field"><label class="label" for="pf-phone">Handynummer <span class="opt">(optional)</span></label><input class="input" id="pf-phone" type="tel" inputmode="tel" autocomplete="off" value="${esc(F.phone || '')}" placeholder="+43 …"><p class="help">Dann öffnet „per WhatsApp Bescheid geben“ direkt den richtigen Chat.</p></div>
      ${F.errText ? `<p class="err" id="pf-err" role="alert">${esc(F.errText)}</p>` : ''}
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="close-sheet">Abbrechen</button><button class="btn btn-primary" data-act="pf-save">${edit ? 'Speichern' : 'Zugang anlegen'}</button>` };
  };
}
function credView(uid, pw, fresh) {
  return () => {
    const u = userById(uid);
    return {
      body: doneBody(fresh ? `Zugang für ${esc(u.name)} ist bereit` : `Neues Passwort für ${esc(u.name)}`, `${fresh ? 'Schick die Zugangsdaten am besten direkt per Nachricht.' : 'Das bisherige Passwort gilt ab jetzt nicht mehr.'} Beim ersten Anmelden wählt ${esc(u.name)} ein eigenes Passwort.`, `<dl class="cred" id="cred"><div><dt>Benutzername</dt><dd>${esc(u.username)}</dd></div><div><dt>Passwort</dt><dd>${esc(pw)}</dd></div></dl>`),
      foot: `<button class="btn btn-quiet" id="copy-btn" data-act="copy-cred" data-u="${esc(u.username)}" data-p="${esc(pw)}">${ic('copy')}Kopieren</button><button class="btn btn-primary" data-act="close-sheet">Fertig</button>`
    };
  };
}
function resetPwView(uid) {
  return () => {
    const u = userById(uid);
    return { body: `<div class="pad stack"><h2 class="sheet-title" id="sheet-title" tabindex="-1">Neues Passwort für ${esc(u.name)}?</h2><p class="sub">Das bisherige Passwort gilt danach nicht mehr. ${esc(u.name)} wählt beim nächsten Anmelden ein eigenes.</p></div>`, foot: `<button class="btn btn-quiet" data-act="close-sheet">Abbrechen</button><button class="btn btn-primary" data-act="reset-pw-confirm" data-id="${u.id}">Neues Passwort erstellen</button>` };
  };
}
function accessRequestView() {
  return () => {
    const F = S.form;
    const body = `<div class="pad stack">
      <div><h2 class="sheet-title" id="sheet-title" tabindex="-1">Zugang anfragen</h2><p class="sub" style="margin-top:6px">Jakob legt dir einen Zugang an und schickt dir deine Zugangsdaten.</p></div>
      <div class="field"><label class="label" for="ar-name">Dein Name</label><input class="input" id="ar-name" value="${esc(F.name || '')}" autocomplete="name" ${F.err === 'name' ? 'aria-invalid="true" aria-describedby="ar-err"' : ''}></div>
      <input type="text" id="ar-website" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
      <div class="field"><label class="label" for="ar-contact">Wie erreicht Jakob dich?</label><input class="input" id="ar-contact" value="${esc(F.contact || '')}" placeholder="Telefonnummer oder E-Mail" ${F.err === 'contact' ? 'aria-invalid="true" aria-describedby="ar-err"' : ''}></div>
      ${F.errText ? `<p class="err" id="ar-err" role="alert">${esc(F.errText)}</p>` : ''}
    </div>`;
    return { body, foot: `<button class="btn btn-primary btn-block" data-act="ar-send">Anfrage senden</button>` };
  };
}

/* ---------- Werkzeuge ---------- */
/* Sammlung aus dem BGG-Export (collection.csv) übernehmen */
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
function bggRowsFrom(text) {
  const recs = parseCSV(text);
  if (!recs.length || !('objectid' in recs[0])) return null;
  const owned = new Set(S.games.filter(g => g.bggId).map(g => +g.bggId));
  const rows = recs.filter(r => r.own === '1' || r.own === undefined).map(r => ({
    bggId: +r.objectid, title: r.objectname || r.originalname, kind: /expansion/i.test(r.itemtype || r.objecttype || '') ? 'exp' : 'game',
    pmin: r.minplayers, pmax: r.maxplayers, tmin: r.minplaytime || r.playingtime, tmax: r.maxplaytime || r.playingtime,
    age: (r.bggrecagerange || '').match(/\d+/)?.[0] || '', weight: r.avgweight || r.weight
  })).filter(r => r.bggId > 0);
  return { rows, fresh: rows.filter(r => !owned.has(r.bggId)) };
}
function importView() {
  return () => {
    const F = S.form, st = F.status, data = F.data;
    const nGame = data ? data.fresh.filter(r => r.kind === 'game').length : 0, nExp = data ? data.fresh.length - nGame : 0;
    const body = `<div class="pad stack">
      <div><h2 class="sheet-title" id="sheet-title" tabindex="-1">Sammlung importieren</h2><p class="sub" style="margin-top:6px">Alles aus deiner BGG-Sammlung auf einmal ins Regal. Danach ergänzt du nach und nach Kurzbeschreibung, Regelheft und Spielart.</p></div>
      <ol class="steps"><li><div><b>Auf BoardGameGeek</b><span>Deine Sammlung öffnen und dort „Export“ wählen. Du bekommst die Datei collection.csv.</span></div></li><li><div><b>Hier auswählen</b><span>Spiele, die schon im Regal stehen, werden übersprungen.</span></div></li></ol>
      <label class="btn btn-quiet file-pick" style="justify-self:start">${ic('doc')}${data ? 'Andere Datei wählen' : 'collection.csv auswählen'}<input type="file" id="imp-file" accept=".csv,text/csv" aria-label="BGG-Export auswählen"></label>
      ${F.err ? `<p class="err" role="alert">${esc(F.err)}</p>` : ''}
      ${data ? `<div class="import-sum" role="status"><span><b>${nGame} ${nGame === 1 ? 'Spiel' : 'Spiele'}</b> und <b>${nExp} ${nExp === 1 ? 'Erweiterung' : 'Erweiterungen'}</b> kommen neu dazu.</span>${data.rows.length > data.fresh.length ? `<span>${data.rows.length - data.fresh.length} stehen schon im Regal.</span>` : ''}<span>Sie zählen nicht als „Neu“, damit das Regal ruhig bleibt.</span></div>` : ''}
      ${st ? (st.token ? `<p class="help">${st.waiting ? `BGG ergänzt gerade ${st.waiting} Einträge mit Cover und Eckdaten. Das läuft im Hintergrund weiter.` : 'Cover, Eckdaten und andere Titel holt der Spieleschrank automatisch von BGG.'}</p>${!st.waiting ? '<button class="link" data-act="imp-enrich" style="justify-self:start">Fehlende Cover jetzt von BGG holen</button>' : ''}` : '<p class="help">Sobald der BGG-Schlüssel eingetragen ist, kommen Cover und Eckdaten automatisch dazu. Bis dahin gibt es Platzhalter-Bilder.</p>') : ''}
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="close-sheet">Abbrechen</button><button class="btn btn-primary" id="imp-go" data-act="imp-go" ${data && data.fresh.length && !F.busy ? '' : 'disabled'} ${F.busy ? 'aria-busy="true"' : ''}>${F.busy ? 'Wird übernommen …' : 'Ins Regal stellen'}</button>` };
  };
}

function catalogOptionsView() {
  return () => {
    const o = S.cat, opt = (k, label, n) => `<label class="lst-row"><input type="checkbox" name="cat" id="cat-${k}" value="${k}" ${o[k] ? 'checked' : ''}><span class="box">${ic('check')}</span><span>${label}</span><small>${n}</small></label>`;
    const body = `<div class="pad stack">
      <div><h2 class="sheet-title" id="sheet-title" tabindex="-1">Katalog erstellen</h2><p class="sub" style="margin-top:6px">Ein PDF deiner Sammlung, zum Ausdrucken, Weitergeben oder als Inventarliste.</p></div>
      <div class="stack-s">${opt('games', 'Spiele', live().filter(onShelf).length)}${opt('exps', 'Erweiterungen bei ihrem Spiel', live().filter(isExp).filter(e => !e.standalone).length)}${opt('puzzles', 'Puzzles', live().filter(isPuzzle).length)}</div>
      <div class="field"><span class="label" id="cs-l">Spiele sortieren</span><div class="seg" role="group" aria-labelledby="cs-l">${[['az', 'Von A bis Z'], ['genre', 'Nach Genre']].map(([v, t]) => `<button id="cs-${v}" data-act="cat-sort" data-v="${v}" aria-pressed="${o.sort === v}">${t}</button>`).join('')}</div></div>
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="close-sheet">Abbrechen</button><button class="btn btn-primary" data-act="cat-make" ${o.games || o.puzzles ? '' : 'disabled'}>${ic('book')}Katalog erstellen</button>` };
  };
}
const linkURL = () => `${location.origin}/schaufenster/${S.settings.link}`;
function linkView() {
  return () => {
    const F = S.form;
    const body = `<div class="pad stack">
      <div><h2 class="sheet-title" id="sheet-title" tabindex="-1">Schaufenster-Link</h2><p class="sub" style="margin-top:6px">Wer diesen Link hat, sieht eine abgespeckte Ansicht deiner Sammlung: Cover, Titel, Personen und Dauer. Wer gerade was hat, sieht niemand, und ausleihen geht nur mit Zugang.</p></div>
      <div class="link-box"><code id="link-url">${esc(linkURL())}</code><button class="btn btn-quiet btn-sm" id="link-copy" data-act="link-copy">${ic('copy')}Kopieren</button></div>
      <p class="help">Suchmaschinen finden die Seite nicht.</p>
      ${F.confirmNew ? `<div class="confirm-box" role="alert"><span>Der bisherige Link funktioniert danach nicht mehr. Wer ihn schon hat, sieht dann nichts mehr.</span><div class="req-actions"><button class="btn btn-quiet btn-sm" id="link-new-no" data-act="link-new-cancel">Abbrechen</button><button class="btn btn-danger btn-sm" data-act="link-new-confirm">Neuen Link erstellen</button></div></div>`
        : `<button class="link" id="link-new" data-act="link-new" style="justify-self:start">Neuen Link erstellen</button>`}
    </div>`;
    return { body, foot: `<button class="btn btn-quiet" data-act="link-view">${ic('eye')}Ansehen</button><button class="btn btn-primary" data-act="close-sheet">Fertig</button>` };
  };
}
function rulesListView() {
  return () => {
    const list = live().filter(g => !isPuzzle(g) && !g.rules).sort(byTitle);
    return {
      body: `<div class="pad stack"><div><h2 class="sheet-title" id="sheet-title" tabindex="-1">Ohne Regelheft</h2><p class="sub" style="margin-top:6px">Nach und nach ergänzen. Tipp auf ein Spiel, um das PDF hinzuzufügen.</p></div>
        ${list.length ? `<div class="list">${list.map(g => `<button class="exp-row" data-act="edit-game" data-id="${g.id}">${coverEl(g)}<span><b>${esc(g.title)}</b><span>${isExp(g) ? 'Erweiterung' : 'Spiel'}</span></span>${ic('next')}</button>`).join('')}</div>` : '<p class="quiet-empty">Alle Spiele haben ein Regelheft.</p>'}</div>`,
      foot: '<button class="btn btn-primary btn-block" data-act="close-sheet">Fertig</button>'
    };
  };
}
function orphanListView() {
  return () => {
    const list = orphanExps().sort(byTitle);
    return {
      body: `<div class="pad stack"><div><h2 class="sheet-title" id="sheet-title" tabindex="-1">Ohne Grundspiel</h2><p class="sub" style="margin-top:6px">Diese Erweiterungen sieht im Regal noch niemand. Tipp auf eine und wähl ihr Grundspiel.</p></div>
        ${list.length ? `<div class="list">${list.map(g => `<button class="exp-row" data-act="edit-game" data-id="${g.id}">${coverEl(g)}<span><b>${esc(g.title)}</b><span>Erweiterung</span></span>${ic('next')}</button>`).join('')}</div>` : '<p class="quiet-empty">Alle Erweiterungen haben ihr Grundspiel.</p>'}</div>`,
      foot: '<button class="btn btn-primary btn-block" data-act="close-sheet">Fertig</button>'
    };
  };
}
function giftedListView() {
  return () => {
    const list = S.games.filter(g => g.archived && g.giftedTo);
    return {
      body: `<div class="pad stack"><h2 class="sheet-title" id="sheet-title" tabindex="-1">Verschenkt</h2>
        <div class="list">${list.map(g => `<div class="exp-row" style="cursor:default">${coverEl(g)}<span><b>${esc(g.title)}</b><span>An ${esc(uname(g.giftedTo))}, ${esc(fd(g.giftedAt))}</span></span></div>`).join('')}</div></div>`,
      foot: '<button class="btn btn-primary btn-block" data-act="close-sheet">Fertig</button>'
    };
  };
}
function ownPwView() {
  return () => {
    const pwField = (id, label, auto) => `<div class="field"><label class="label" for="${id}">${label}</label><div class="pw"><input class="input" id="${id}" type="password" autocomplete="${auto}"><button type="button" class="pw-toggle" data-act="pw-toggle" data-for="${id}" aria-label="Passwort anzeigen" aria-pressed="false">${ic('eye')}</button></div></div>`;
    return {
      body: `<div class="pad stack"><div><h2 class="sheet-title" id="sheet-title" tabindex="-1">Passwort ändern</h2><p class="sub" style="margin-top:6px">Mindestens 8 Zeichen. Auf anderen Geräten meldest du dich danach neu an.</p></div>
        <input type="text" autocomplete="username" value="${esc(me().username || '')}" hidden aria-hidden="true">
        ${pwField('op0', 'Bisheriges Passwort', 'current-password')}${pwField('op1', 'Neues Passwort', 'new-password')}
        <div class="field"><label class="label" for="op2">Neues Passwort wiederholen</label><input class="input" id="op2" type="password" autocomplete="new-password"></div>
        <p class="err" id="op-err" role="alert" hidden></p></div>`,
      foot: `<button class="btn btn-quiet" data-act="close-sheet">Abbrechen</button><button class="btn btn-primary" id="op-save" data-act="own-pw-save">Speichern</button>`
    };
  };
}
function settingsView() {
  return () => {
    const tok = !!S.settings.bggToken;
    return {
      body: `<div class="pad stack"><h2 class="sheet-title" id="sheet-title" tabindex="-1">Einstellungen</h2>
      <div class="field"><span class="label" id="nw-l">Neu-Markierung</span><div class="seg" role="group" aria-labelledby="nw-l">${[2, 3, 4].map(w => `<button id="nw-${w}" data-act="set-new" data-v="${w}" aria-pressed="${S.settings.newWeeks === w}">${w} Wochen</button>`).join('')}</div><p class="help">So lange tragen neue Spiele und Puzzles das kleine „Neu“. Die Begrüßung nennt nur, was seit dem letzten Besuch dazugekommen ist.</p></div>
      <div class="field"><div class="label-row"><label class="label" for="set-bgg">BGG-Schlüssel</label>${tok ? `<span class="mini-pill ok">${ic('check')}Eingetragen</span>` : ''}</div>
        <input class="input" id="set-bgg" type="text" value="${esc(S.settings.bggToken || '')}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Von BoardGameGeek, nach der Registrierung" aria-describedby="set-bgg-h">
        <p class="help" id="set-bgg-h">Damit funktionieren die BGG-Suche, Cover und Eckdaten. Den Schlüssel bekommst du auf boardgamegeek.com unter „Applications“, sobald deine Anwendung freigegeben ist.</p></div></div>`,
      foot: '<button class="btn btn-primary btn-block" data-act="settings-done">Fertig</button>'
    };
  };
}
