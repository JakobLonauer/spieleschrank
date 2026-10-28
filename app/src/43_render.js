
/* ---------- Bausteine ---------- */
const avatar = (u, cls = '') => `<span class="av ${cls}" style="--avc:${AVC[u.av % AVC.length]}" aria-hidden="true">${esc(u.ini)}</span>`;
const STICKER = '<span class="sticker" aria-hidden="true">Leih<br>mich!</span>';
/* Basisspiele mit Erweiterungen bekommen eine stille Schachtelkante */
function stackEl(g, extra) {
  const ex = expsOf(g), c = coverEl(g, extra);
  if (!ex.length) return c;
  return `<span class="cover-wrap" data-stack="${Math.min(ex.length, 2)}" style="--e1:${tintOf(ex[0])};--e2:${tintOf(ex[1] || ex[0])}">${c}</span>`;
}
const sec = (title, n, body, action = '', id = '') => `<section class="section"${id ? ` id="${id}"` : ''}><div class="sec-head inline"><h2 class="h2">${title}${n != null ? `<span class="count">${n}</span>` : ''}</h2>${action}</div>${body}</section>`;

/* ---------- Rahmen ---------- */
function tabsFor() { return isAdmin() ? [['regal', 'Regal', 'shelf'], ['verwalten', 'Verwalten', 'inbox']] : [['regal', 'Regal', 'shelf'], ['meine', 'Meine', 'box']]; }
function badgeFor(t) {
  if (t === 'verwalten') return adminOpen();
  if (t === 'meine') return myOpen().filter(l => (l.status === 'reserviert' && (!l.start || l.start <= T0)) || (l.status === 'vorgemerkt' && l.notified)).length + myDeclined().length;
  return 0;
}
function renderProto() { }
function goneHTML() {
  return `<main class="wrap welcome"><div class="welcome-in empty"><div class="mini-pile" aria-hidden="true"></div><h1 class="h1" tabindex="-1">Diesen Link gibt es nicht mehr</h1><p class="sub">Frag einfach nach einem neuen Link oder nach einem eigenen Zugang.</p><a class="btn btn-primary" href="/">Zur Anmeldung</a></div></main>`;
}
function renderApp() {
  renderProto();
  document.body.classList.toggle('showcase', S.view === 'showcase');
  document.body.classList.toggle('no-tabbar', S.view !== 'app' || !S.user || !!me()?.mustChange);
  if (S.view === 'showcase') { $('#app').innerHTML = showcaseHTML(); return; }
  if (S.view === 'gone') { $('#app').innerHTML = goneHTML(); return; }
  if (S.view === 'catalog') { $('#app').innerHTML = catalogHTML(); requestAnimationFrame(() => $('#cat-h')?.focus({ preventScroll: true })); return; }
  if (!S.user) { $('#app').innerHTML = loginHTML(); return; }
  if (me().mustChange) { $('#app').innerHTML = welcomeHTML(); requestAnimationFrame(() => $('#wel-h')?.focus({ preventScroll: true })); return; }
  $('#app').innerHTML = `
    <header class="topbar" id="topbar"><div class="wrap topbar-in">
      <button class="brand" data-act="tab" data-tab="regal" aria-label="Spieleschrank, zum Regal">${BRAND}<span>Spieleschrank</span></button>
      <nav class="dtabs" id="dtabs" aria-label="Bereiche"></nav>
      <button class="avatar-btn" id="avatar-btn" data-act="account" aria-haspopup="dialog" aria-expanded="false" aria-label="Konto von ${esc(me().name)}">${avatar(me())}</button>
    </div></header>
    <main id="view" class="wrap view"></main>
    <nav class="tabbar" id="tabbar" aria-label="Bereiche"></nav>`;
  renderChrome();
  renderView();
  $('#topbar').classList.toggle('scrolled', scrollY > 4);
  if (!S.introDone && S.tab === 'regal' && !reduce()) { const v = $('#view'); v.classList.add('intro'); setTimeout(() => v.classList.remove('intro'), 1100); }
  S.introDone = true;
}
/* Passwort vergessen: Jakob setzt es zurück, die Nachricht ist schon vorbereitet */
const forgotURL = u => 'https://wa.me/?text=' + encodeURIComponent(`Hallo Jakob, ich komme nicht mehr in den Spieleschrank. ${u ? `Mein Benutzername ist ${u}. ` : ''}Kannst du mir ein neues Passwort geben?`);
function renderChrome() {
  const tabs = tabsFor(), prev = S.badgeSeen && S.badgeSeen.user === S.user ? S.badgeSeen : {}, seen = { user: S.user };
  const b = t => { const n = badgeFor(t); seen[t] = n; return n ? `<span class="badge${prev[t] !== undefined && n > prev[t] ? ' bump' : ''}" aria-label="${n} offen">${n}</span>` : ''; };
  const d = $('#dtabs'), m = $('#tabbar');
  if (d) d.innerHTML = tabs.map(([id, l, i]) => `<button class="dtab" data-act="tab" data-tab="${id}" ${S.tab === id ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${b(id)}</button>`).join('');
  if (m) m.innerHTML = tabs.map(([id, l, i]) => `<button class="ttab" data-act="tab" data-tab="${id}" ${S.tab === id ? 'aria-current="page"' : ''}><span class="ttab-ic">${ic(i)}${b(id)}</span><span>${l}</span></button>`).join('');
  S.badgeSeen = seen;
}
function renderView(fade = false) {
  const v = $('#view'); if (!v) return;
  const focusId = document.activeElement && v.contains(document.activeElement) ? document.activeElement.id : null;
  if (S.tab === 'regal') { v.innerHTML = regalHTML(); renderResults(false); }
  else if (S.tab === 'meine') v.innerHTML = `<div class="narrow">${meineHTML()}</div>`;
  else v.innerHTML = `<div class="narrow">${verwaltenHTML()}</div>`;
  if (fade && !reduce()) { v.classList.remove('fade-in'); void v.offsetWidth; v.classList.add('fade-in'); }
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
}
function refresh() {
  if (S.view !== 'app' || !S.user || me()?.mustChange) { if (S.sheetView) rerenderSheet(); return; }
  const ae = document.activeElement, view = $('#view');
  const key = view && ae && view.contains(ae) ? focusKey(ae) : null;
  renderChrome();
  if (S.tab === 'regal') { renderChips(); renderResults(false); renderHello(); }
  else renderView();
  if (S.sheetView) rerenderSheet();
  if (key && (!document.activeElement || document.activeElement === document.body)) {
    const k = document.querySelector(key);
    (k && k.offsetParent !== null ? k : $('#view .h1'))?.focus({ preventScroll: true });
  }
}
function welcomeHTML() {
  const u = me();
  return `<header class="topbar" id="topbar"><div class="wrap topbar-in"><span class="brand">${BRAND}<span>Spieleschrank</span></span></div></header>
  <main class="wrap welcome"><div class="welcome-in">
    <div><h1 class="h1" id="wel-h" tabindex="-1">Willkommen, ${esc(u.name)}!</h1><p class="sub" style="margin-top:6px">Hier siehst du alle Brettspiele und Puzzles von Jakob und kannst sie dir ausleihen. So geht's:</p></div>
    <ol class="steps">
      <li><div><b>Stöbern</b><span>Im Regal steht alles, was Jakob verleiht. Mit den Filtern findest du schnell etwas für eure Runde.</span></div></li>
      <li><div><b>Anfragen</b><span>Tipp auf ein Spiel, dann auf „Ausleihen anfragen“, und wähl im Kalender, wann du es holst und zurückbringst.</span></div></li>
      <li><div><b>Abholen</b><span>Jakob meldet sich bei dir. Unter „Meine“ siehst du, was du gerade hast.</span></div></li>
    </ol>
    <form class="pw-card" id="pw-form" novalidate>
      <div><h2 class="h2">Wähl dein eigenes Passwort</h2><p class="help" style="margin-top:4px">Mindestens 8 Zeichen. Das Startpasswort von Jakob gilt danach nicht mehr.</p></div>
      <div class="field"><label class="label" for="np1">Neues Passwort</label><div class="pw"><input class="input" id="np1" type="password" autocomplete="new-password"><button type="button" class="pw-toggle" data-act="pw-toggle" data-for="np1" aria-label="Passwort anzeigen" aria-pressed="false">${ic('eye')}</button></div></div>
      <div class="field"><label class="label" for="np2">Passwort wiederholen</label><input class="input" id="np2" type="password" autocomplete="new-password"></div>
      <p class="form-error" id="np-err" role="alert" hidden></p>
      <button class="btn btn-primary btn-block" type="submit">Passwort speichern und loslegen</button>
    </form>
  </div></main>`;
}

/* ---------- Regal ---------- */
function helloHTML() {
  if (isAdmin()) {
    const n = adminOpen();
    return `<h1 class="h1" tabindex="-1">Hallo ${esc(me().name)}!</h1><p class="sub">${n ? `<button class="link" data-act="tab" data-tab="verwalten">${n === 1 ? '1 Sache wartet' : `${n} Sachen warten`} auf dich</button>` : 'Gerade ist nichts offen.'}</p>`;
  }
  const lv = (S.prevVisit !== undefined ? S.prevVisit : me().lastVisit) || day(-30);
  const nw = live().filter(g => (onShelf(g) || isPuzzle(g)) && isNew(g) && g.added > lv).sort((a, b) => b.added - a.added);
  const link = g => `${isPuzzle(g) ? 'das Puzzle ' : ''}<button class="inline-link" data-act="open-game" data-id="${g.id}">${esc(g.title)}</button>`;
  let sub = 'Was spielt ihr als Nächstes?';
  if (nw.length === 1) sub = `Neu seit deinem letzten Besuch: ${link(nw[0])}.`;
  else if (nw.length === 2) sub = `Neu seit deinem letzten Besuch: ${link(nw[0])} und ${link(nw[1])}.`;
  else if (nw.length > 2) sub = `Neu seit deinem letzten Besuch: ${link(nw[0])}, ${link(nw[1])} und ${nw.length - 2} weitere.`;
  return `<h1 class="h1" tabindex="-1">Hallo ${esc(me().name)}!</h1><p class="sub">${sub}</p>`;
}
const renderHello = () => { const h = $('#hello'); if (h) h.innerHTML = helloHTML(); };
function regalHTML() {
  const pz = S.mode === 'puzzles';
  const hasPz = live().some(isPuzzle);
  const sw = S.variant === 'switch' && hasPz
    ? `<div class="kind-switch seg" role="group" aria-label="Spiele oder Puzzles"><button id="kind-games" data-act="mode" data-v="games" aria-pressed="${!pz}">${ic('meeple')}Spiele</button><button id="kind-pz" data-act="mode" data-v="puzzles" aria-pressed="${pz}">${ic('puzzle')}Puzzles</button></div>`
    : (pz ? `<div class="mode-head"><button class="back-link" id="back-games" data-act="mode" data-v="games">${ic('back')}Zurück zu den Spielen</button></div>` : '');
  return `
    <div class="page-head" style="margin-bottom:0"><div id="hello">${helloHTML()}</div></div>
    ${sw}
    <div class="tools">
      <div class="search">${ic('search')}<input id="q" type="search" placeholder="${pz ? 'Puzzle suchen' : 'Spiel oder Puzzle suchen'}" value="${esc(S.q)}" autocomplete="off" enterkeyhint="search" aria-label="${pz ? 'Puzzle suchen' : 'Spiel oder Puzzle suchen'}"><button class="search-clear" id="q-clear" data-act="clear-q" aria-label="Suche leeren" ${S.q ? '' : 'hidden'}>${ic('x')}</button></div>
      <div class="chips" id="chips" role="group" aria-label="Filter">${chipsHTML()}</div>
    </div>
    <div id="results" aria-live="polite"></div>`;
}
function chipsHTML() {
  if (S.mode === 'puzzles') {
    const f = S.pf, more = pMoreCount(f);
    return `
      <button class="chip ${f.pieces ? 'on' : ''}" id="chip-pieces" data-act="pop-pieces" aria-haspopup="dialog" aria-expanded="false">${ic('puzzle')}<span>${f.pieces ? piecesLabel(f.pieces) : 'Teile'}</span>${ic('chev', 'chev')}</button>
      <button class="chip ${f.avail ? 'on' : ''}" id="chip-avail" data-act="toggle-avail" aria-pressed="${f.avail}">${ic('check', 'tick')}<span>Nur verfügbare</span></button>
      <button class="chip ${more ? 'on' : ''}" id="chip-more" data-act="more-filters" aria-haspopup="dialog">${ic('sliders')}<span>${more ? `Mehr Filter (${more})` : 'Mehr Filter'}</span></button>`;
  }
  const { players: pl, time: tm, avail } = S.f, more = moreCount(S.f);
  const plLabel = pl ? (pl >= 8 ? '8+ Personen' : pl === 1 ? '1 Person' : `${pl} Personen`) : 'Personen';
  return `
    <button class="chip ${pl ? 'on' : ''}" id="chip-players" data-act="pop-players" aria-haspopup="dialog" aria-expanded="false">${ic('meeple')}<span>${plLabel}</span>${ic('chev', 'chev')}</button>
    <button class="chip ${tm ? 'on' : ''}" id="chip-time" data-act="pop-time" aria-haspopup="dialog" aria-expanded="false">${ic('glass')}<span>${tm ? timeLabel(tm) : 'Spieldauer'}</span>${ic('chev', 'chev')}</button>
    <button class="chip ${avail ? 'on' : ''}" id="chip-avail" data-act="toggle-avail" aria-pressed="${avail}">${ic('check', 'tick')}<span>Nur verfügbare</span></button>
    <button class="chip ${more ? 'on' : ''}" id="chip-more" data-act="more-filters" aria-haspopup="dialog">${ic('sliders')}<span>${more ? `Mehr Filter (${more})` : 'Mehr Filter'}</span></button>`;
}
function renderChips() {
  const c = $('#chips'); if (!c) return;
  const fid = document.activeElement && c.contains(document.activeElement) ? document.activeElement.id : null;
  c.innerHTML = chipsHTML();
  if (fid) document.getElementById(fid)?.focus({ preventScroll: true });
}
function tileHTML(g, o = {}) {
  const pz = isPuzzle(g), plain = !!o.plain, hit = o.hit || {};
  const p = plain ? null : pillFor(g), lm = !plain && isLeihMich(g), en = g.lang === 'en';
  const nw = isNew(g) ? '<span class="new-tag">Neu</span>' : '';
  let meta, label;
  if (pz) {
    meta = `${nw}<span class="m">${ic('puzzle')}${pieceText(g)}</span><span class="m">${ic('ruler')}${sizeText(g)}</span>`;
    label = `${g.title}. Puzzle mit ${g.pieces} Teilen, fertig ${g.size[0]} mal ${g.size[1]} Zentimeter.`;
  } else if (isExp(g) && !g.standalone) {
    meta = `<span class="m">${ic('layers')}Erweiterung für ${esc(baseOf(g)?.title || '')}</span>`;
    label = `${g.title}. Erweiterung für ${baseOf(g)?.title || ''}.`;
  } else {
    const t = hit.est ? `ca. ${minText(hit.est)} ${zuN(Math.min(S.f.players, 8))}` : timeText(g);
    meta = `${nw}<span class="m">${ic('meeple')}${playersText(g)}${hit.viaExp ? ` <span class="via">(bis ${reach(g).max} mit Erw.)</span>` : ''}</span><span class="m">${ic('glass')}${t}</span>${en ? '<span class="m lang">Englisch</span>' : ''}`;
    label = `${g.title}. ${playersLong(g)}${hit.viaExp ? `, mit Erweiterung bis ${reach(g).max}` : ''}, ${hit.est ? `etwa ${hit.est} Minuten ${zuN(Math.min(S.f.players, 8))}` : timeLong(g)}${g.diff ? `, Schwierigkeit ${DIFF[g.diff]}` : ''}${en ? ', englische Ausgabe' : ''}.`;
  }
  const exps = expsOf(g).length;
  const note = hit.note || (isExp(g) && g.standalone ? `Auch Erweiterung für ${baseOf(g)?.title || ''}` : '');
  label += `${isNew(g) ? ' Neu.' : ''}${p ? ' ' + p.t + '.' : ''}${lm ? ' Leih mich.' : ''}${exps ? ` ${exps === 1 ? '1 Erweiterung' : exps + ' Erweiterungen'}.` : ''}${note ? ' ' + note + '.' : ''}`;
  return `<button class="tile" data-act="${o.act || 'open-game'}" data-id="${g.id}" aria-label="${esc(label)}">
    ${stackEl(g, (p ? pillHTML(p) : '') + (lm ? STICKER : ''))}
    <span class="tile-title" aria-hidden="true">${esc(g.title)}</span>
    <span class="meta" aria-hidden="true">${meta}</span>
    ${note ? `<span class="tile-note" aria-hidden="true">${esc(note)}</span>` : ''}
  </button>`;
}
/* Mit „Erweiterungen zeigen“ stehen Erweiterungen direkt hinter ihrem Spiel */
function withExps(list) {
  if (!S.f.exp) return list.map(([g, hit]) => tileHTML(g, { hit })).join('');
  return list.map(([g, hit]) => tileHTML(g, { hit }) + expsOf(g).filter(e => !e.standalone).map(e => tileHTML(e)).join('')).join('');
}
const sortHTML = () => `<div class="sort" role="group" aria-label="Sortierung"><button id="sort-mine" data-act="sort" data-v="mine" aria-pressed="${S.sort === 'mine'}">${isAdmin() ? 'Beliebt' : 'Für dich'}</button><button id="sort-az" data-act="sort" data-v="az" aria-pressed="${S.sort === 'az'}">A–Z</button></div>`;
function resultsHTML() { return S.mode === 'puzzles' ? puzzleResultsHTML() : gameResultsHTML(); }
function gameResultsHTML() {
  const shelfItems = live().filter(onShelf);
  if (!anyFilter()) {
    let h = '';
    const lm = shelfItems.filter(isLeihMich).sort(byTitle);
    if (lm.length) {
      h += `<section class="section feature" aria-labelledby="lm-h">
        <div class="sec-head"><h2 class="h2" id="lm-h">Leih mich!</h2><p class="sub">${isAdmin() ? 'Komplette Einmalspiele, die du schon gelöst hast. Alle sehen sie hier ganz oben.' : 'Rätsel und Krimis, die Jakob schon gelöst hat. Alles ist noch komplett.'}</p></div>
        <div class="shelf"><div class="shelf-row">${lm.map(g => tileHTML(g)).join('')}</div></div>
      </section>`;
    }
    if (S.variant === 'shelf') {
      const pzs = orderItems(live().filter(isPuzzle));
      if (pzs.length) h += `<section class="section feature feature-pz" aria-labelledby="pz-h">
        <div class="sec-head inline"><h2 class="h2" id="pz-h">Puzzles<span class="count">${pzs.length}</span></h2><button class="link" data-act="mode" data-v="puzzles">Alle ansehen</button></div>
        <div class="shelf"><div class="shelf-row">${pzs.slice(0, 10).map(g => tileHTML(g)).join('')}</div></div>
      </section>`;
    }
    const items = orderItems(shelfItems);
    h += `<section class="section" aria-labelledby="all-h"><div class="sec-head inline"><h2 class="h2" id="all-h">Alle Spiele<span class="count">${items.length}</span></h2>${sortHTML()}</div><div class="grid">${withExps(items.map(g => [g, null]))}</div></section>`;
    return h;
  }
  const hits = orderItems(shelfItems).map(g => [g, gameHit(g)]).filter(x => x[1]);
  const pzOnly = S.q.trim() ? orderItems(live().filter(isPuzzle)).filter(p => puzzleHit(p, PFDEF())) : [];
  if (!hits.length && pzOnly.length && !gameFilterCount(S.f)) {
    return `<section class="section" aria-labelledby="all-h"><div class="sec-head inline"><h2 class="h2" id="all-h">${pzOnly.length === 1 ? '1 passendes Puzzle' : `${pzOnly.length} passende Puzzles`}</h2><button class="link" data-act="clear-q">Suche löschen</button></div><div class="grid grid-pz">${pzOnly.map(p => tileHTML(p)).join('')}</div></section>`;
  }
  let h = `<section class="section" aria-labelledby="all-h"><div class="sec-head inline"><h2 class="h2" id="all-h">${hits.length === 1 ? '1 passendes Spiel' : `${hits.length} passende Spiele`}</h2><button class="link" data-act="reset-filters">Filter zurücksetzen</button></div>`;
  h += hits.length ? `<div class="grid">${withExps(hits)}</div>` : emptyResultsHTML();
  h += '</section>';
  if (S.q.trim()) {
    const pzHits = orderItems(live().filter(isPuzzle)).filter(p => puzzleHit(p, PFDEF()));
    if (pzHits.length) h += `<section class="section" aria-labelledby="pzr-h"><div class="sec-head inline"><h2 class="h2" id="pzr-h">Puzzles<span class="count">${pzHits.length}</span></h2></div><div class="grid grid-pz">${pzHits.map(p => tileHTML(p)).join('')}</div></section>`;
  }
  return h;
}
function puzzleResultsHTML() {
  const all = orderItems(live().filter(isPuzzle));
  if (!anyFilter()) return `<section class="section" aria-labelledby="all-h"><div class="sec-head inline"><h2 class="h2" id="all-h">Alle Puzzles<span class="count">${all.length}</span></h2>${sortHTML()}</div><div class="grid grid-pz">${all.map(p => tileHTML(p)).join('')}</div></section>`;
  const hits = all.filter(p => puzzleHit(p));
  const gOnly = S.q.trim() ? orderItems(live().filter(onShelf)).map(g => [g, gameHit(g, FDEF())]).filter(x => x[1]) : [];
  if (!hits.length && gOnly.length && !puzzleFilterCount(S.pf)) {
    return `<section class="section" aria-labelledby="all-h"><div class="sec-head inline"><h2 class="h2" id="all-h">${gOnly.length === 1 ? '1 passendes Spiel' : `${gOnly.length} passende Spiele`}</h2><button class="link" data-act="clear-q">Suche löschen</button></div><div class="grid">${gOnly.map(([g, hit]) => tileHTML(g, { hit })).join('')}</div></section>`;
  }
  let h = `<section class="section" aria-labelledby="all-h"><div class="sec-head inline"><h2 class="h2" id="all-h">${hits.length === 1 ? '1 passendes Puzzle' : `${hits.length} passende Puzzles`}</h2><button class="link" data-act="reset-filters">Filter zurücksetzen</button></div>`;
  h += hits.length ? `<div class="grid grid-pz">${hits.map(p => tileHTML(p)).join('')}</div>` : emptyResultsHTML();
  h += '</section>';
  if (S.q.trim()) {
    const gHits = orderItems(live().filter(onShelf)).map(g => [g, gameHit(g, FDEF())]).filter(x => x[1]);
    if (gHits.length) h += `<section class="section" aria-labelledby="gr-h"><div class="sec-head inline"><h2 class="h2" id="gr-h">Spiele<span class="count">${gHits.length}</span></h2></div><div class="grid">${gHits.map(([g, hit]) => tileHTML(g, { hit })).join('')}</div></section>`;
  }
  return h;
}
function emptyResultsHTML() {
  const pz = S.mode === 'puzzles', tries = [];
  const count = (f, q) => pz ? live().filter(isPuzzle).filter(p => puzzleHit(p, f, q)).length : live().filter(onShelf).filter(g => gameHit(g, f, q)).length;
  const F = pz ? S.pf : S.f, D = pz ? PFDEF() : FDEF();
  if (S.q.trim()) tries.push(['q', 'Ohne den Suchbegriff', 'Suchbegriff entfernen', count(F, '')]);
  const keys = pz
    ? [['pieces', 'Ohne Teile-Filter', 'Teile-Filter entfernen'], ['avail', 'Mit verliehenen Puzzles', 'Auch verliehene zeigen'], ['motifs', 'Ohne Motiv-Auswahl', 'Motive entfernen'], ['brands', 'Ohne Marken-Auswahl', 'Marken entfernen']]
    : [['players', 'Ohne Personenfilter', 'Personenfilter entfernen'], ['time', 'Ohne Zeitlimit', 'Zeitlimit entfernen'], ['avail', 'Mit verliehenen Spielen', 'Auch verliehene zeigen'], ['genres', 'Ohne Genre-Auswahl', 'Genres entfernen'], ['diff', 'Ohne Schwierigkeit', 'Schwierigkeit entfernen'], ['age', 'Ohne Altersfilter', 'Altersfilter entfernen'], ['gift', 'Auch ohne „zu verschenken“', 'Filter „zu verschenken“ entfernen']];
  for (const [k, lead, btn] of keys) {
    const v = F[k]; if (!v || (Array.isArray(v) && !v.length)) continue;
    tries.push([k, lead, btn, count({ ...F, [k]: D[k] }, S.q)]);
  }
  tries.sort((a, b) => b[3] - a[3]);
  const best = tries.find(t => t[3] > 0), noun = n => (pz ? (n === 1 ? 'ein Puzzle' : `${n} Puzzles`) : (n === 1 ? 'ein Spiel' : `${n} Spiele`));
  return `<div class="empty">
    <div class="mini-pile" aria-hidden="true">${miniPile()}</div>
    <h2 class="h2">${pz ? 'Kein Puzzle' : 'Kein Spiel'} passt zu allen Filtern</h2>
    ${best ? `<p class="sub">${best[1]} wären es ${noun(best[3])}.</p><button class="btn btn-quiet" data-act="drop-filter" data-k="${best[0]}">${best[2]}</button>` : `<p class="sub">Versuch es mit weniger Filtern.</p><button class="btn btn-quiet" data-act="reset-filters">Filter zurücksetzen</button>`}
  </div>`;
}
function miniPile() {
  const gs = ['azul', 'heat', 'mysterium'].map(gameById).filter(Boolean);
  const pos = [['8px', '30px', '-9deg'], ['70px', '26px', '7deg'], ['38px', '4px', '-2deg']];
  return gs.map((g, i) => `<span class="cover" style="--tint:${tintOf(g)};left:${pos[i][0]};top:${pos[i][1]};transform:rotate(${pos[i][2]})">${coverSVG(g)}</span>`).join('');
}
/* Nur sichtbare Kacheln bekommen einen Übergangsnamen: die Animation kostet so gleich viel, egal wie groß die Sammlung ist. */
function nameVisible(root) {
  const h = innerHeight, seen = new Set();
  root.querySelectorAll('.grid .tile').forEach(t => {
    const r = t.getBoundingClientRect(), id = t.dataset.id;
    const vis = r.bottom > -80 && r.top < h + 80 && !seen.has(id);
    if (vis) seen.add(id);
    t.style.viewTransitionName = vis ? `g-${id}` : '';
  });
}
const clearNames = root => root.querySelectorAll('.grid .tile').forEach(t => { t.style.viewTransitionName = ''; });
function renderResults(animate) {
  const el = $('#results'); if (!el) return;
  const run = () => { el.innerHTML = resultsHTML(); };
  if (animate && document.startViewTransition && !reduce()) {
    nameVisible(el);
    try {
      const vt = document.startViewTransition(() => { run(); nameVisible(el); });
      vt.finished.then(() => clearNames(el), () => clearNames(el));
      [vt.ready, vt.updateCallbackDone].forEach(pr => pr && pr.catch(() => {}));
    } catch (e) { run(); }
  } else run();
}

/* ---------- Meine ---------- */
function rowHTML(l, line, action = '', tone = '', o = {}) {
  const g = gameById(l.gameId);
  return `<div class="row${o.stacked ? ' stacked' : ''}"><button class="row-main" data-act="open-game" data-id="${g.id}">${coverEl(g)}<span class="row-text"><span class="row-title">${esc(o.title || titleOf(l))}</span><span class="row-line ${tone}">${line}</span></span></button>${action ? `<div class="row-actions">${action}</div>` : ''}${o.after || ''}</div>`;
}
const iconBtn = (act, id, icon, label, extra = '') => `<button class="icon-btn" data-act="${act}" data-id="${id}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${ic(icon)}</button>`;
function meineHTML() {
  const mine = myOpen(), dec = myDeclined(), rec = recentReturns(), hist = historyOf(S.user), lists = myLists().filter(li => li.ids.some(id => gameById(id) && !gameById(id).archived));
  const wishes = S.gifts.filter(w => w.userId === S.user);
  const head = `<div class="page-head"><div><h1 class="h1" tabindex="-1">Meine Ausleihen</h1><p class="sub">Was du gerade hast und was du angefragt hast.</p></div></div>`;
  let h = head;
  const res = mine.filter(l => l.status === 'reserviert').sort((a, b) => (a.start || T0) - (b.start || T0));
  const back = mine.filter(l => l.status === 'vorgemerkt' && l.notified);
  const bei = mine.filter(l => l.status === 'verliehen').sort((a, b) => (dueOf(a) ?? FAR) - (dueOf(b) ?? FAR));
  const req = mine.filter(l => l.status === 'angefragt' || (l.status === 'vorgemerkt' && !l.notified));
  const active = res.length + back.length + dec.length + bei.length + req.length + wishes.length + rec.length;
  if (!active) {
    h += `<div class="empty"><div class="mini-pile" aria-hidden="true">${miniPile()}</div><h2 class="h2">Du hast gerade nichts ausgeliehen</h2><p class="sub">Im Regal findest du alles, was Jakob verleiht.</p><button class="btn btn-primary" data-act="tab" data-tab="regal">Zum Regal</button></div>`;
  }
  if (res.length) h += sec('Abholbereit', res.length, `<div class="list">${res.map(l => rowHTML(l, l.start && l.start > T0 ? `Für dich reserviert ab ${esc(fdw(l.start))}` : `Für dich reserviert, ${esc(retText(l))}`, `<button class="btn btn-ghost btn-sm" data-act="cancel-res" data-id="${l.id}">Absagen</button>`)).join('')}</div>`);
  if (back.length) h += sec('Wieder da', back.length, `<div class="list">${back.map(l => rowHTML(l, 'Jakob verleiht es wieder. Wann möchtest du es?', `<button class="btn btn-primary btn-sm" data-act="pick-period" data-id="${l.id}">${ic('cal')}Zeitraum wählen</button>`)).join('')}</div>`);
  if (dec.length) h += sec('Abgelehnt', dec.length, `<div class="list">${dec.map(l => rowHTML(l, l.reason ? `Jakob: „${esc(l.reason)}“` : 'Jakob hat deine Anfrage abgelehnt.', `<button class="btn btn-ghost btn-sm" data-act="dismiss" data-id="${l.id}">Ausblenden</button>`, '', { stacked: true })).join('')}</div>`);
  if (bei.length) h += sec('Bei dir', bei.length, `<div class="list">${bei.map(l => {
    const acts = (canExtend(l) ? iconBtn('extend', l.id, 'calplus', 'Um zwei Wochen verlängern') : '') + iconBtn('photos', l.id, 'camera', 'Fotos vom Spieleabend teilen');
    const extLine = { angefragt: '<br><span class="sep">Verlängerung angefragt</span>', ok: '<br><span class="sep">Um zwei Wochen verlängert</span>', abgelehnt: '<br><span class="sep">Verlängerung nicht angenommen</span>' }[l.ext] || '';
    /* Einmal pro Ausleihe, ein paar Tage nach der Übergabe: ein leiser Hinweis auf die Fotos */
    const hint = !l.photoHint && !photosOfLoan(l).length && l.handed && -dnum(l.handed) >= 3
      ? `<div class="row-hint">${ic('camera')}<p>Hattet ihr einen schönen Abend mit ${esc(gameById(l.gameId).title)}? Wenn du magst, kannst du Jakob <button class="inline-link" data-act="photos" data-id="${l.id}">Fotos schicken</button>.</p>${iconBtn('hint-dismiss', l.id, 'x', 'Hinweis ausblenden')}</div>` : '';
    if (overdue(l)) return rowHTML(l, `Rückgabe war am ${fd(dueOf(l))} geplant`, acts, 'danger', { after: hint });
    if (l.open) return rowHTML(l, 'Ohne festes Rückgabedatum', acts, '', { after: hint });
    return rowHTML(l, `Zurück am ${esc(listDates(l.ret))}${extLine}`, acts, '', { after: hint });
  }).join('')}</div><p class="list-note">Die Rückgabe trägt Jakob ein, sobald er das Spiel wieder hat.</p>`);
  if (req.length || wishes.length) h += sec('Angefragt', req.length + wishes.length, `<div class="list">${req.map(l => {
    const line = l.status === 'vorgemerkt' ? `Vorgemerkt, du bist Nummer ${queuePos(l)} in der Reihe` : `Ab ${esc(fdw(l.start))}, ${esc(retText(l))}`;
    return rowHTML(l, line, `<button class="btn btn-ghost btn-sm" data-act="withdraw" data-id="${l.id}">Zurückziehen</button>`);
  }).join('')}${wishes.map(w => rowHTML({ gameId: w.gameId, extras: [] }, 'Du hättest es gern. Jakob entscheidet, wer es bekommt.', `<button class="btn btn-ghost btn-sm" data-act="unwish" data-id="${w.gameId}">Zurückziehen</button>`)).join('')}</div>`);
  if (rec.length) h += sec('Zuletzt zurückgegeben', null, `<div class="list">${rec.map(l => {
    const ph = photosOfLoan(l), liked = ph.some(p => p.liked);
    const line = liked ? 'Jakob hat sich über deine Fotos gefreut.' : ph.length ? 'Danke für die Fotos!' : `Zurückgegeben am ${esc(fd(l.returned))}`;
    return rowHTML(l, line, iconBtn('photos', l.id, 'camera', 'Fotos vom Spieleabend teilen'), liked ? 'ok' : '');
  }).join('')}</div>`);
  if (lists.length) h += sec('Meine Listen', null, lists.map(li => {
    const items = li.ids.map(gameById).filter(g => g && !g.archived);
    return `<div class="list-block"><p class="list-name">${esc(li.name)}<small>${items.length}</small></p><div class="cover-row">${items.map(g => `<button class="${isPuzzle(g) ? 'pz' : ''}" data-act="open-game" data-id="${g.id}" aria-label="${esc(g.title)}">${coverEl(g)}</button>`).join('')}</div></div>`;
  }).join(''));
  if (hist.length) h += `<details class="history" id="history"><summary>${ic('clock')}Früher ausgeliehen (${hist.length})${ic('chev', 'chev')}</summary><ul class="hist-list">${hist.map(l => {
    const g = gameById(l.gameId), d = dnum(l.returned) - dnum(l.handed || l.start);
    return `<li>${coverEl(g)}<span><b>${esc(titleOf(l))}</b><small>${esc(rangeText(l.handed || l.start, l.returned))}</small></span><em>${daysWord(Math.max(1, d))}</em></li>`;
  }).join('')}</ul></details>`;
  return h;
}

/* ---------- Verwalten ---------- */
function verwaltenHTML() {
  const orts = [...new Set(S.users.filter(u => !u.admin && u.ort).map(u => u.ort))].sort((a, b) => a.localeCompare(b, 'de'));
  const loansIn = st => S.loans.filter(l => l.status === st && inOrt(l.userId));
  const reqs = loansIn('angefragt').sort((a, b) => a.created - b.created);
  const exts = extRequests().filter(l => inOrt(l.userId));
  const gifts = giftGroups().map(id => [gameById(id), wishesFor(id).filter(w => inOrt(w.userId))]).filter(x => x[1].length);
  const resv = loansIn('reserviert').sort((a, b) => (a.start || T0) - (b.start || T0));
  const lent = loansIn('verliehen').sort((a, b) => (overdue(b) - overdue(a)) || ((dueOf(a) ?? FAR) - (dueOf(b) ?? FAR)));
  const freeQ = live().filter(g => !current(g.id) && queue(g.id).length && inOrt(queue(g.id)[0].userId));
  const outQ = live().filter(g => current(g.id) && queue(g.id).length).filter(g => queue(g.id).some(l => inOrt(l.userId)));
  const photos = S.photos.filter(p => -dnum(p.created) <= 30 && inOrt(p.userId)).sort((a, b) => b.created - a.created);
  const openCount = uid => S.loans.filter(l => l.userId === uid && OPEN.includes(l.status)).length + S.gifts.filter(w => w.userId === uid).length;
  const ortCount = o => S.users.filter(u => u.ort === o).reduce((n, u) => n + openCount(u.id), 0);

  let h = `<div class="page-head"><div><h1 class="h1" tabindex="-1">Verwalten</h1><p class="sub">Anfragen, Übergaben und wer gerade was hat.</p></div><button class="btn btn-primary btn-sm" data-act="add-item">${ic('plus')}Hinzufügen</button></div>`;
  if (orts.length) {
    let sum = '';
    if (S.ort) {
      const parts = [];
      if (lent.length) parts.push(`${lent.length} verliehen`);
      if (resv.length) parts.push(`${resv.length} zur Übergabe`);
      if (reqs.length + exts.length) parts.push(`${reqs.length + exts.length} ${reqs.length + exts.length === 1 ? 'Anfrage' : 'Anfragen'}`);
      sum = `<p class="ort-sum">${parts.length ? `In ${esc(S.ort)}: ${parts.join(', ')}.` : `In ${esc(S.ort)} ist gerade nichts unterwegs.`}</p>`;
    }
    h += `<div class="ort-bar"><div class="ort-chips" role="group" aria-label="Nach Ort filtern"><button class="chip ${!S.ort ? 'on' : ''}" id="ort-all" data-act="ort" data-v="" aria-pressed="${!S.ort}">${ic('pin')}<span>Alle Orte</span></button>${orts.map((o, i) => `<button class="chip ${S.ort === o ? 'on' : ''}" id="ort-${i}" data-act="ort" data-v="${esc(o)}" aria-pressed="${S.ort === o}"><span>${esc(o)}</span><small>${ortCount(o)}</small></button>`).join('')}</div>${sum}</div>`;
  }
  const nReq = reqs.length + exts.length + gifts.length;
  h += sec('Anfragen', nReq, nReq ? `<div class="list">${reqs.map(reqCard).join('')}${exts.map(extCard).join('')}${gifts.map(([g, w]) => giftCard(g, w)).join('')}</div>` : `<p class="quiet-empty">${S.ort ? `Keine offenen Anfragen aus ${esc(S.ort)}.` : 'Keine offenen Anfragen. Alles erledigt.'}</p>`);
  if (freeQ.length) h += sec('Wieder da, vorgemerkt', freeQ.filter(g => !queue(g.id)[0].notified).length || null, `<div class="list">${freeQ.map(g => {
    const q = queue(g.id), first = q[0];
    const names = q.map(l => uname(l.userId)).join(', dann ');
    return first.notified
      ? rowHTML({ gameId: g.id, extras: [] }, `${esc(uname(first.userId))} weiß Bescheid und wählt einen Zeitraum.`)
      : rowHTML({ gameId: g.id, extras: [] }, `Vorgemerkt: ${esc(names)}`, `<button class="btn btn-primary btn-sm" data-act="notify" data-id="${first.id}">${ic('chat')}${esc(uname(first.userId))} Bescheid geben</button>`);
  }).join('')}</div><p class="list-note">Erst wenn du Bescheid gibst, kann die erste Person in der Reihe ihren Zeitraum wählen.</p>`);
  if (resv.length) h += sec('Zur Übergabe', resv.length, `<div class="list">${resv.map(l => rowHTML(l, `Für ${whoOrt(l.userId)}, ${l.start && l.start > T0 ? `ab ${esc(fdw(l.start))}` : 'ab heute'}`, `<button class="btn btn-primary btn-sm" data-act="handover" data-id="${l.id}">${ic('hand')}Übergeben</button>`)).join('')}</div>`);
  h += sec('Verliehen', lent.length, lent.length ? `<div class="list">${lent.map(l => {
    const who = esc(uname(l.userId));
    const line = overdue(l) ? `Bei ${whoOrt(l.userId)}, seit ${fd(dueOf(l))} fällig` : l.open ? `Bei ${whoOrt(l.userId)}, offen` : `Bei ${whoOrt(l.userId)}, zurück am ${esc(listDates(l.ret))}`;
    const vis = `<button class="icon-btn" data-act="toggle-vis" data-id="${l.id}" aria-pressed="${l.pub}" aria-label="${l.pub ? 'Für alle sichtbar. Antippen, um es nur für dich und ' + who + ' zu zeigen.' : 'Nur für dich und ' + who + ' sichtbar. Antippen, um es allen zu zeigen.'}" title="${l.pub ? 'Für alle sichtbar' : 'Nur für dich und ' + who + ' sichtbar'}">${ic(l.pub ? 'eye' : 'eyeoff')}</button>`;
    const remind = overdue(l) ? `<a class="btn btn-ghost btn-sm" href="${esc(waLink(l.userId, `Hallo ${uname(l.userId)}, hast du „${titleOf(l)}“ noch? Kein Stress, sag einfach, wann es dir passt.`))}" target="_blank" rel="noopener">${ic('chat')}Erinnern</a>` : '';
    return rowHTML(l, line, remind + vis + `<button class="btn btn-quiet btn-sm" data-act="return" data-id="${l.id}">Zurückbekommen</button>`, overdue(l) ? 'danger' : '');
  }).join('')}</div>` : `<p class="quiet-empty">${S.ort ? `In ${esc(S.ort)} ist gerade nichts verliehen.` : 'Gerade ist nichts verliehen.'}</p>`);
  if (outQ.length) h += sec('Vorgemerkt', null, `<div class="list">${outQ.map(g => {
    const cur = current(g.id);
    return rowHTML({ gameId: g.id, extras: [] }, `Vorgemerkt: ${esc(queue(g.id).map(l => uname(l.userId)).join(', dann '))}. Gerade bei ${esc(uname(cur.userId))}.`);
  }).join('')}</div>`);
  if (photos.length) h += sec('Fotos vom Spieleabend', null, `<div class="list">${photos.map(photoCard).join('')}</div>`);
  if (S.access.length && !S.ort) h += sec('Zugangsanfragen', S.access.length, `<div class="list">${S.access.map(a => `<div class="person">${avatar({ ini: a.name.replace(/^(Oma|Opa|Onkel|Tante) /, '').charAt(0).toUpperCase(), av: 6 })}<div class="person-text"><b>${esc(a.name)}</b><span>${esc(a.contact)}, ${ago(a.created)}</span></div><div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="access-decline" data-id="${a.id}">Ablehnen</button><button class="btn btn-primary btn-sm" data-act="access-accept" data-id="${a.id}">Zugang anlegen</button></div></div>`).join('')}</div>`);
  const people = S.users.filter(u => !u.admin && inOrt(u.id));
  h += sec('Personen', people.length, `<div class="list">${people.map(u => `<div class="person">${avatar(u)}<div class="person-text"><b>${esc(u.name)}</b><span>${u.ort ? `${esc(u.ort)}, ` : ''}Benutzername: ${esc(u.username)}</span></div><div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="edit-person" data-id="${u.id}">Bearbeiten</button><button class="btn btn-ghost btn-sm" data-act="reset-pw" data-id="${u.id}">Neues Passwort</button></div></div>`).join('')}</div>`, `<button class="btn btn-quiet btn-sm" data-act="add-person">${ic('userplus')}Person hinzufügen</button>`);
  const noRules = live().filter(g => !isPuzzle(g) && !g.rules).length, gifted = S.games.filter(g => g.archived && g.giftedTo).length, orphans = orphanExps().length;
  h += sec('Werkzeuge', null, `<div class="tools-list">
    ${orphans ? `<button class="tool-row" data-act="orphan-list">${ic('layers')}<span><b>Ohne Grundspiel</b><span>${orphans === 1 ? '1 Erweiterung wartet auf ihr Grundspiel' : `${orphans} Erweiterungen warten auf ihr Grundspiel`}</span></span>${ic('next')}</button>` : ''}
    <button class="tool-row" data-act="catalog">${ic('book')}<span><b>Katalog erstellen</b><span>Deine Sammlung als PDF, auf Knopfdruck.</span></span>${ic('next')}</button>
    <button class="tool-row" data-act="import">${ic('layers')}<span><b>Sammlung importieren</b><span>Aus deinem BGG-Export, alles auf einmal.</span></span>${ic('next')}</button>
    <button class="tool-row" data-act="link">${ic('link')}<span><b>Schaufenster-Link</b><span>Abgespeckte Ansicht für alle ohne Zugang.</span></span>${ic('next')}</button>
    <button class="tool-row" data-act="rules-list">${ic('doc')}<span><b>Ohne Regelheft</b><span>${noRules === 0 ? 'Alle Spiele haben eins.' : noRules === 1 ? '1 Spiel oder Erweiterung' : `${noRules} Spiele und Erweiterungen`}</span></span>${ic('next')}</button>
    ${gifted ? `<button class="tool-row" data-act="gifted-list">${ic('gift')}<span><b>Verschenkt</b><span>${gifted === 1 ? '1 Spiel' : `${gifted} Spiele`}</span></span>${ic('next')}</button>` : ''}
    <button class="tool-row" data-act="settings">${ic('gear')}<span><b>Einstellungen</b><span>Neu-Markierung: ${S.settings.newWeeks} Wochen${S.settings.bggToken ? '' : '. BGG-Schlüssel fehlt noch.'}</span></span>${ic('next')}</button>
  </div>`);
  return h;
}
function reqHead(u, text, g, meta) {
  return `<div class="req-top">${avatar(u)}
      <div class="req-text"><p>${text}</p><p class="req-meta">${meta}</p></div>
      ${coverEl(g)}
    </div>`;
}
function reqCard(l) {
  const g = gameById(l.gameId), u = userById(l.userId);
  const cur = current(g.id), conflict = busyOf([g.id, ...l.extras], l.id).some(([a, b]) => l.start <= b && maxD(l.ret) >= a);
  const ex = l.extras.map(gameById).filter(Boolean);
  const actions = S.declining === l.id
    ? `<div class="decline"><label class="label" for="dr-${l.id}">Kurzer Grund für ${esc(u.name)} <span class="opt">(optional)</span></label><textarea class="textarea" id="dr-${l.id}" rows="2" placeholder="Zum Beispiel: Brauche ich am Wochenende selbst."></textarea><div class="req-actions"><button class="btn btn-ghost btn-sm" data-act="decline-cancel">Abbrechen</button><button class="btn btn-danger btn-sm" data-act="decline-confirm" data-id="${l.id}">Ablehnen</button></div></div>`
    : `<div class="req-actions"><button class="btn btn-quiet btn-sm" data-act="decline" data-id="${l.id}">Ablehnen</button><button class="btn btn-primary btn-sm" data-act="accept" data-id="${l.id}">Annehmen</button></div>`;
  return `<article class="req" aria-label="Anfrage von ${esc(u.name)}">
    ${reqHead(u, `<strong>${whoOrt(u.id)}</strong> möchte <button class="inline-link" data-act="open-game" data-id="${g.id}">${esc(g.title)}</button>${ex.length ? ` mit ${esc(ex.map(shortExp).join(' und '))}` : ''} ausleihen.`, g, `<span class="m">${ic('cal')}${esc(tidy(`Ab ${fdw(l.start)}, zurück am ${listDates(l.ret)}`))}</span><span>${ago(l.created)}</span>`)}
    ${l.msg ? `<p class="bubble">${esc(l.msg)}</p>` : ''}
    ${conflict ? `<p class="req-note">${ic('glass')}<span>${cur ? `Gerade bei ${esc(uname(cur.userId))}.` : 'Der Zeitraum überschneidet sich mit einer anderen Zusage.'} Beim Annehmen kannst du einen anderen Zeitraum wählen.</span></p>` : ''}
    ${actions}
  </article>`;
}
function extCard(l) {
  const g = gameById(l.gameId), u = userById(l.userId), q = queue(g.id);
  const next = l.ret.map(d => addDays(d, EXTDAYS));
  return `<article class="req" aria-label="Verlängerung von ${esc(u.name)}">
    ${reqHead(u, `<strong>${whoOrt(u.id)}</strong> möchte <button class="inline-link" data-act="open-game" data-id="${g.id}">${esc(titleOf(l))}</button> um zwei Wochen verlängern.`, g, `<span class="m">${ic('calplus')}${esc(tidy(`Neu: zurück am ${listDates(next)}`))}</span>`)}
    ${q.length ? `<p class="req-note">${ic('inbox')}<span>${esc(q.map(x => uname(x.userId)).join(', '))} ${q.length === 1 ? 'hat' : 'haben'} vorgemerkt.</span></p>` : ''}
    <div class="req-actions"><button class="btn btn-quiet btn-sm" data-act="ext-decline" data-id="${l.id}">Ablehnen</button><button class="btn btn-primary btn-sm" data-act="ext-accept" data-id="${l.id}">Verlängern</button></div>
  </article>`;
}
function giftCard(g, wishes) {
  const names = wishes.map(w => uname(w.userId));
  const text = names.length === 1 ? `<strong>${esc(names[0])}</strong> hätte` : `<strong>${esc(names.slice(0, -1).join(', '))}</strong> und <strong>${esc(names[names.length - 1])}</strong> hätten`;
  return `<article class="req" aria-label="Wünsche zu ${esc(g.title)}">
    ${reqHead(userById(wishes[0].userId), `${text} gern <button class="inline-link" data-act="open-game" data-id="${g.id}">${esc(g.title)}</button>.`, g, `<span class="m">${ic('gift')}Zu verschenken</span><span>${ago(wishes[wishes.length - 1].created)}</span>`)}
    <div class="req-actions">${wishes.map(w => `<button class="btn btn-quiet btn-sm" data-act="give" data-id="${g.id}" data-u="${w.userId}">An ${esc(uname(w.userId))} verschenken</button>`).join('')}</div>
  </article>`;
}
function photoCard(p) {
  const u = userById(p.userId), g = gameById(p.gameId);
  return `<article class="req" aria-label="Fotos von ${esc(u.name)}">
    <div class="req-top">${avatar(u)}
      <div class="req-text"><p><strong>${esc(u.name)}</strong> hat ${p.urls.length === 1 ? 'ein Foto' : `${p.urls.length} Fotos`} zu <button class="inline-link" data-act="open-game" data-id="${g.id}">${esc(g.title)}</button> geschickt.</p><p class="req-meta"><span>${ago(p.created)}</span></p></div>
      <button class="heart" id="heart-${p.id}" data-act="heart" data-id="${p.id}" aria-pressed="${p.liked}" aria-label="${p.liked ? 'Gefällt dir. Nochmal antippen zum Zurücknehmen.' : `${esc(u.name)} zeigen, dass du dich freust`}" title="${p.liked ? 'Gefällt dir' : 'Freut mich'}">${ic('heart')}</button>
    </div>
    ${p.caption ? `<p class="bubble">${esc(p.caption)}</p>` : ''}
    <div class="thumbs">${p.urls.map((url, i) => `<img src="${esc(url)}" alt="Foto ${i + 1} von ${esc(u.name)} zu ${esc(g.title)}">`).join('')}</div>
  </article>`;
}

/* ---------- Anmeldung ---------- */
function loginHTML() {
  const ids = [['fluegelschlag', '6px', '74px', '-10deg', '0ms'], ['heat', '170px', '82px', '8deg', '90ms'], ['codenames', '150px', '0px', '-5deg', '180ms'], ['micromacro', '86px', '36px', '2deg', '270ms']];
  /* Dekorative Schachteln: unabhängig von den echten Daten, weil vor dem Anmelden nichts geladen ist */
  const deko = { fluegelschlag: { pal: 0, pat: 'arcs' }, heat: { pal: 3, pat: 'stripes' }, codenames: { pal: 4, pat: 'blocks' }, micromacro: { pal: 6, pat: 'tiles', sticker: true } };
  const boxes = ids.map(([id, x, y, r, d]) => { const g = { id: 'deko-' + id, kind: 'game', title: '', ...deko[id] }; return `<div class="pbox" style="left:${x};top:${y};--r:${r};--d:${d}">${coverEl(g, g.sticker ? STICKER : '')}</div>`; }).join('');
  return `<main class="login">
    <section class="felt"><div class="felt-in">
      <div class="pile" aria-hidden="true">${boxes}</div>
      <p class="felt-brand">${BRAND}Spieleschrank</p>
      <p class="felt-line">Jakobs Brettspiele und Puzzles für Familie und Freunde. Schau, was da ist, und frag einfach an.</p>
    </div></section>
    <section class="login-side">
      <form class="login-form" id="login-form" novalidate>
        <h1 class="h1">Anmelden</h1>
        <div class="field"><label class="label" for="lg-user">Benutzername</label><input class="input" id="lg-user" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="zum Beispiel lisa"></div>
        <div class="field"><div class="label-row"><label class="label" for="lg-pw">Passwort</label><a class="quiet-link" id="lg-forgot" href="${forgotURL('')}" target="_blank" rel="noopener">Vergessen?</a></div><div class="pw"><input class="input" id="lg-pw" type="password" autocomplete="current-password"><button type="button" class="pw-toggle" data-act="pw-toggle" aria-label="Passwort anzeigen" aria-pressed="false">${ic('eye')}</button></div></div>
        <label class="check"><input type="checkbox" id="lg-keep" checked><span class="box">${ic('check')}</span>Angemeldet bleiben</label>
        <p class="form-error" id="lg-err" role="alert" hidden></p>
        <button class="btn btn-primary btn-block" type="submit">Anmelden</button>
        <p class="login-alt">Noch keinen Zugang? <button type="button" class="link" data-act="access-request">Zugang anfragen</button></p>
      </form>
    </section>
  </main>`;
}

/* ---------- Schaufenster: abgespeckt, ohne Login, ohne Ausleihen ---------- */
function showcaseHTML() {
  const games = live().filter(onShelf).sort(byTitle), pzs = live().filter(isPuzzle).sort(byTitle);
  return `<header class="topbar" id="topbar"><div class="wrap topbar-in"><span class="brand">${BRAND}<span>Spieleschrank</span></span></div></header>
  <main class="wrap view showcase-view">
    <div class="sc-hero"><h1 class="h1">${esc(S.settings.title)}</h1><p class="sub">${games.length} Spiele und ${pzs.length} Puzzles, die Jakob mit Familie und Freunden teilt. Tipp auf eine Schachtel, um mehr zu sehen.</p></div>
    <section class="section" aria-labelledby="sc-g"><div class="sec-head"><h2 class="h2" id="sc-g">Spiele<span class="count">${games.length}</span></h2></div><div class="grid">${games.map(g => tileHTML(g, { plain: true, act: 'sc-open' })).join('')}</div></section>
    ${pzs.length ? `<section class="section" aria-labelledby="sc-p"><div class="sec-head"><h2 class="h2" id="sc-p">Puzzles<span class="count">${pzs.length}</span></h2></div><div class="grid grid-pz">${pzs.map(p => tileHTML(p, { plain: true, act: 'sc-open' })).join('')}</div></section>` : ''}
  <p class="bgg-credit sc-credit"><a href="https://boardgamegeek.com" target="_blank" rel="noopener">Spieldaten: Powered by BGG</a></p>
  </main>
  <aside class="sc-cta" aria-label="Zugang"><p>Lust bekommen? Frag Jakob nach einem Zugang.</p><button class="btn btn-primary btn-sm" data-act="access-request">Zugang anfragen</button></aside>`;
}

/* ---------- Katalog auf Knopfdruck ---------- */
function catalogHTML() {
  const o = S.cat, standalone = window.self === window.top;
  const games = live().filter(onShelf).sort(byTitle), pzs = live().filter(isPuzzle).sort(byTitle);
  const nExp = live().filter(isExp).filter(e => !e.standalone).length;
  const item = g => {
    const ex = o.exps ? expsOf(g).filter(e => !e.standalone) : [];
    const info = isPuzzle(g) ? `${pieceText(g)}, ${sizeText(g)}, ${g.brand}` : `${playersText(g)} Personen, ${timeText(g)}, ab ${g.age} Jahren`;
    return `<div class="cat-item${isPuzzle(g) ? ' pz' : ''}">${coverEl(g)}<span><b>${esc(g.title)}</b><span>${esc(info)}</span>${!isPuzzle(g) && g.genres?.length ? `<span>${esc(g.genres.join(', '))}</span>` : ''}${ex.length ? `<span class="cat-exp">Erweiterungen: ${esc(ex.map(shortExp).join(', '))}</span>` : ''}</span></div>`;
  };
  let body = '';
  if (o.games) {
    if (o.sort === 'genre') {
      const groups = GENRES.map(gn => [gn, games.filter(g => (g.genres || [])[0] === gn)]).filter(x => x[1].length);
      body += `<section class="cat-section"><h2>Spiele <small>${games.length}</small></h2>${groups.map(([gn, list]) => `<h3>${esc(gn)}</h3><div class="cat-grid">${list.map(item).join('')}</div>`).join('')}</section>`;
    } else body += `<section class="cat-section"><h2>Spiele <small>${games.length}</small></h2><div class="cat-grid">${games.map(item).join('')}</div></section>`;
  }
  if (o.puzzles && pzs.length) body += `<section class="cat-section"><h2>Puzzles <small>${pzs.length}</small></h2><div class="cat-grid">${pzs.map(item).join('')}</div></section>`;
  const parts = [];
  if (o.games) parts.push(`${games.length} Spiele`);
  if (o.games && o.exps) parts.push(`${nExp} Erweiterungen`);
  if (o.puzzles) parts.push(`${pzs.length} Puzzles`);
  return `<div class="catalog-wrap">
    <nav class="cat-bar" aria-label="Katalog"><div class="wrap cat-bar-in">
      <button class="back-link" data-act="cat-close">${ic('back')}Zurück</button>
      <p class="cat-note">${standalone ? 'So sieht dein Katalog aus. Drucken oder als PDF speichern geht direkt hier.' : 'Vorschau. Auf der fertigen Seite lädt hier das PDF herunter.'}</p>
      ${standalone ? `<button class="btn btn-primary btn-sm" data-act="cat-print">${ic('print')}Drucken oder als PDF speichern</button>` : ''}
    </div></nav>
    <main class="wrap"><article class="paper" aria-labelledby="cat-h">
      <header class="cat-cover">
        <div class="cat-pile" aria-hidden="true">${games.slice(0, 6).map(g => coverEl(g)).join('')}</div>
        <div><h1 class="cat-title" id="cat-h" tabindex="-1">${esc(S.settings.title)}</h1><p class="cat-meta">Katalog, Stand ${esc(DFY.format(T0))}. ${esc(parts.join(', '))}.</p></div>
      </header>
      ${body}
    </article></main>
  </div>`;
}
