
/* ---------- Abgeleitete Zustände ---------- */
const me = () => S.users.find(u => u.id === S.user);
const isAdmin = () => !!me()?.admin;
const userById = id => S.users.find(u => u.id === id) || { name: 'Unbekannt', ini: '?', av: 7 };
const uname = id => userById(id).name;
const gameById = id => S.games.find(g => g.id === id);
const loanById = id => S.loans.find(l => l.id === id);
const byTitle = (a, b) => a.title.localeCompare(b.title, 'de');
const live = () => S.games.filter(g => !g.archived);
const isPuzzle = g => g?.kind === 'puzzle';
const isExp = g => g?.kind === 'exp';
const isBaseGame = g => g?.kind === 'game';
const onShelf = g => !g.archived && (g.kind === 'game' || (g.kind === 'exp' && g.standalone));
const expsOf = g => (isBaseGame(g) ? S.games.filter(x => x.kind === 'exp' && x.base === g.id && !x.archived) : []);
const baseOf = e => (e && e.base ? gameById(e.base) : null);
/* Erweiterungen, deren Grundspiel fehlt (z. B. nach dem Import), sieht nur Jakob unter Werkzeuge */
const orphanExps = () => live().filter(g => isExp(g) && !g.standalone && !baseOf(g));
const shortExp = e => (e.title.includes(': ') ? e.title.split(': ').slice(1).join(': ') : e.title);
const ACTIVE = ['reserviert', 'verliehen'];
const OPEN = ['angefragt', 'vorgemerkt', 'reserviert', 'verliehen'];
const involves = (l, id) => l.gameId === id || (l.extras || []).includes(id);
const dueOf = l => (l.open || !l.ret.length ? null : maxD(l.ret));
const FAR = new Date(8.64e15);
/* Gerade weg: verliehen, oder reserviert und der Abholtag ist erreicht */
const current = id => S.loans.find(l => involves(l, id) && (l.status === 'verliehen' || (l.status === 'reserviert' && (!l.start || l.start <= T0))));
const futureRes = id => S.loans.filter(l => involves(l, id) && l.status === 'reserviert' && l.start && l.start > T0).sort((a, b) => a.start - b.start);
const busyOf = (ids, exceptId) => S.loans
  .filter(l => ids.some(id => involves(l, id)) && ACTIVE.includes(l.status) && l.id !== exceptId)
  .map(l => [l.handed || l.start || T0, l.open ? FAR : (dueOf(l) || l.handed || l.start || T0)]);
const pendingReq = id => S.loans.filter(l => l.gameId === id && l.status === 'angefragt').sort((a, b) => a.created - b.created);
const queue = id => S.loans.filter(l => l.gameId === id && l.status === 'vorgemerkt').sort((a, b) => a.created - b.created);
const queuePos = l => queue(l.gameId).findIndex(x => x.id === l.id) + 1;
const mineFor = id => S.loans.find(l => l.userId === S.user && OPEN.includes(l.status) && involves(l, id));
const myOpen = () => S.loans.filter(l => l.userId === S.user && OPEN.includes(l.status));
const overdue = l => l.status === 'verliehen' && !l.open && !!dueOf(l) && dueOf(l) < T0;
const isAvailable = g => g.lendable && !current(g.id);
const isLeihMich = g => g.kind === 'game' && g.once === 'intakt' && g.done && g.lendable && !g.gift;
const isNew = g => !!g.added && -dnum(g.added) <= S.settings.newWeeks * 7;
const declinedFor = id => S.loans.find(l => l.gameId === id && l.userId === S.user && l.status === 'abgelehnt' && !l.seen);
const myDeclined = () => S.loans.filter(l => l.userId === S.user && l.status === 'abgelehnt' && !l.seen);
const wishesFor = id => S.gifts.filter(w => w.gameId === id).sort((a, b) => a.created - b.created);
const myWish = id => S.gifts.find(w => w.gameId === id && w.userId === S.user);
const canExtend = l => l.status === 'verliehen' && !l.open && !l.ext && !overdue(l);
const recentReturns = () => S.loans.filter(l => l.userId === S.user && l.status === 'zurück' && l.returned && -dnum(l.returned) <= 14).sort((a, b) => b.returned - a.returned);
const historyOf = uid => S.loans.filter(l => l.userId === uid && l.status === 'zurück').sort((a, b) => b.returned - a.returned);
const photosOfLoan = l => S.photos.filter(p => p.loanId === l.id);
const myLists = () => {
  if (!S.user) return [];
  if (!S.lists[S.user]) S.lists[S.user] = [];
  if (!S.lists[S.user].some(li => li.isDefault)) S.lists[S.user].unshift({ id: newId(), name: 'Merkliste', ids: [], isDefault: true });
  return S.lists[S.user];
};
const onList = id => myLists().some(li => li.ids.includes(id));
const titleOf = l => { const g = gameById(l.gameId); const ex = (l.extras || []).map(gameById).filter(Boolean); return g.title + (ex.length ? ` mit ${ex.map(shortExp).join(' und ')}` : ''); };
const ortOf = uid => userById(uid).ort || '';
const inOrt = uid => !S.ort || ortOf(uid) === S.ort;
const whoOrt = uid => `${esc(uname(uid))}${!S.ort && ortOf(uid) ? ` <span class="who-ort">(${esc(ortOf(uid))})</span>` : ''}`;

/* Wie oft ausgeliehen: für die Reihenfolge „Für dich“ und den Spielepass */
const borrowCount = (id, uid) => (!uid && !isAdmin()) ? (S.stats[id] || 0) : S.loans.filter(l => involves(l, id) && (l.status === 'verliehen' || l.status === 'zurück') && (!uid || l.userId === uid)).length;
function orderItems(items) {
  if (S.sort === 'az') return items.slice().sort(byTitle);
  const uid = isAdmin() ? null : S.user;
  const scored = items.map(g => {
    /* Einmalspiele, die jemand schon kennt, rücken nicht nach vorn */
    const done = uid && g.once && (g.knownBy.includes(uid) || borrowCount(g.id, uid) > 0);
    return [g, uid && !done ? borrowCount(g.id, uid) : 0, borrowCount(g.id)];
  });
  return scored.sort((a, b) => (b[1] - a[1]) || (b[2] - a[2]) || byTitle(a[0], b[0])).map(x => x[0]);
}

/* Spielerzahl mit Erweiterungen und geschätzte Dauer je Personenzahl */
function reach(g) {
  let max = g.players[1], via = null;
  expsOf(g).forEach(e => { const r = e.withBase || e.players; if (r[1] > max) { max = r[1]; via = e; } });
  return { min: g.players[0], max, via };
}
function estimate(g, p) {
  const [pmin, pmax] = g.players, [tmin, tmax] = g.time;
  if (p > pmax) { const r = reach(g); return r.via && r.via.time ? r.via.time[1] : tmax; }
  if (pmax === pmin || tmin === tmax) return tmax;
  const q = Math.min(Math.max(p, pmin), pmax);
  return Math.round((tmin + (q - pmin) / (pmax - pmin) * (tmax - tmin)) / 5) * 5;
}
const zuN = p => ({ 1: 'allein', 2: 'zu zweit', 3: 'zu dritt', 4: 'zu viert', 5: 'zu fünft', 6: 'zu sechst', 7: 'zu siebt' }[p] || 'zu acht');
const hrs = n => (n / 60).toLocaleString('de-AT', { maximumFractionDigits: 1 });
const minText = m => (m < 90 ? `${m} Min` : `${hrs(m)} Std`);
const playersText = g => (g.players[0] === g.players[1] ? `${g.players[0]}` : `${g.players[0]}–${g.players[1]}`);
const playersLong = g => (g.players[0] === g.players[1] ? (g.players[0] === 1 ? '1 Person' : `${g.players[0]} Personen`) : `${g.players[0]} bis ${g.players[1]} Personen`);
const timeText = g => { const [a, b] = g.time; if (b <= 90) return a === b ? `${a} Min` : `${a}–${b} Min`; return a === b ? `${hrs(a)} Std` : `${hrs(a)}–${hrs(b)} Std`; };
const timeLong = g => timeText(g).replace('Min', 'Minuten').replace('Std', 'Stunden').replace('–', ' bis ');
const pieceText = p => `${p.pieces.toLocaleString('de-AT')} Teile`;
const sizeText = p => `${p.size[0]} × ${p.size[1]} cm`;
const bestText = g => { const b = g.best; if (!b || (b[0] === g.players[0] && b[1] === g.players[1])) return ''; return `am besten mit ${b[0] === b[1] ? b[0] : b[0] + '–' + b[1]}`; };
const retText = l => (l.open ? 'ohne festes Rückgabedatum' : `zurück am ${listDates(l.ret)}`);
function waLink(uid, text) {
  let n = String(userById(uid).phone || '').replace(/[^\d+]/g, '');
  if (n.startsWith('+')) n = n.slice(1); else if (n.startsWith('00')) n = n.slice(2); else if (n.startsWith('0')) n = '43' + n.slice(1);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

/* ---------- Filter ---------- */
const TIMES = [[20, 'bis 20 Min'], [30, 'bis 30 Min'], [45, 'bis 45 Min'], [60, 'bis 1 Std'], [90, 'bis 1½ Std'], [120, 'bis 2 Std'], [999, 'länger als 2 Std']];
const timeLabel = t => (TIMES.find(x => x[0] === t) || [0, ''])[1];
const PIECES = [[500, 'bis 500 Teile'], [1000, '1000 Teile'], [1001, 'mehr als 1000']];
const piecesLabel = v => (PIECES.find(x => x[0] === v) || [0, ''])[1];
const moreCount = f => f.genres.length + (f.diff ? 1 : 0) + (f.age ? 1 : 0) + (f.exp ? 1 : 0) + (f.gift ? 1 : 0);
/* „Erweiterungen zeigen“ ist eine Anzeige-Option und kein Filter */
const gameFilterCount = f => (f.players ? 1 : 0) + (f.time ? 1 : 0) + (f.avail ? 1 : 0) + f.genres.length + (f.diff ? 1 : 0) + (f.age ? 1 : 0) + (f.gift ? 1 : 0);
const pMoreCount = f => f.motifs.length + f.brands.length;
const puzzleFilterCount = f => (f.pieces ? 1 : 0) + (f.avail ? 1 : 0) + pMoreCount(f);
const anyFilter = () => !!S.q.trim() || (S.mode === 'games' ? gameFilterCount(S.f) : puzzleFilterCount(S.pf)) > 0;
const brands = () => [...new Set(live().filter(isPuzzle).map(p => p.brand))].sort((a, b) => a.localeCompare(b, 'de'));

/* Trifft ein Spiel? Gibt Zusatzinfos zurück: gefundene Erweiterung, Spielerzahl nur mit Erweiterung, geschätzte Dauer */
function gameHit(g, f = S.f, q = S.q) {
  const res = { note: '', viaExp: null, est: null };
  const qq = q.trim();
  if (qq && !textMatch(g.title, qq) && !(g.alt && textMatch(g.alt, qq))) {
    const e = expsOf(g).find(x => textMatch(x.title, qq) || (x.alt && textMatch(x.alt, qq)));
    if (!e) return null;
    res.note = `Mit Erweiterung: ${shortExp(e)}`;
  }
  const p = f.players ? Math.min(f.players, 8) : null;
  if (p) {
    const inBase = f.players >= 8 ? g.players[1] >= 8 : (p >= g.players[0] && p <= g.players[1]);
    if (!inBase) {
      const r = reach(g);
      const ok = r.via && (f.players >= 8 ? r.max >= 8 : p >= r.min && p <= r.max);
      if (!ok) return null;
      res.viaExp = r.via;
    }
    res.est = estimate(g, p);
  }
  if (f.time) {
    if (f.time === 999) { if (!((res.est ?? g.time[1]) > 120)) return null; }
    else if ((res.est ?? g.time[0]) > f.time) return null;
  }
  if (f.avail && !isAvailable(g)) return null;
  if (f.genres.length && !f.genres.some(x => (g.genres || []).includes(x))) return null;
  if (f.diff && g.diff !== f.diff) return null;
  if (f.age && g.age > f.age) return null;
  if (f.gift && !g.gift) return null;
  return res;
}
function puzzleHit(p, f = S.pf, q = S.q) {
  const qq = q.trim();
  if (qq && !textMatch(p.title, qq) && !textMatch(p.brand, qq) && !textMatch(p.motif, qq)) return null;
  if (f.pieces === 500 && p.pieces > 500) return null;
  if (f.pieces === 1000 && (p.pieces <= 500 || p.pieces > 1000)) return null;
  if (f.pieces === 1001 && p.pieces <= 1000) return null;
  if (f.avail && !isAvailable(p)) return null;
  if (f.motifs.length && !f.motifs.includes(p.motif)) return null;
  if (f.brands.length && !f.brands.includes(p.brand)) return null;
  return { note: '' };
}

/* ---------- Abzeichen: nur Ausnahmen ---------- */
function pillFor(g) {
  const admin = isAdmin(), cur = current(g.id);
  if (!admin) {
    const mine = mineFor(g.id);
    if (mine) {
      if (mine.status === 'verliehen') return overdue(mine) ? { t: 'Rückgabe fällig', tone: 'danger' } : { t: 'Bei dir', tone: 'mine' };
      if (mine.status === 'reserviert') return { t: mine.start && mine.start > T0 ? 'Für dich reserviert' : 'Abholbereit', tone: 'mine' };
      if (mine.status === 'vorgemerkt') return { t: mine.notified ? 'Wieder da' : 'Vorgemerkt', tone: 'mine' };
      return { t: 'Angefragt', tone: 'mine' };
    }
    if (myWish(g.id)) return { t: 'Gewünscht', tone: 'mine', icon: 'gift' };
    if (declinedFor(g.id)) return { t: 'Abgelehnt', tone: 'lock' };
  }
  if (cur) {
    if (admin && overdue(cur)) return { t: 'Überfällig', tone: 'danger' };
    return cur.status === 'reserviert' ? { t: 'Reserviert', tone: 'res' } : { t: 'Verliehen', tone: 'lent' };
  }
  if (admin) { const n = pendingReq(g.id).length; if (n) return { t: n === 1 ? '1 Anfrage' : `${n} Anfragen`, tone: 'mine' }; }
  if (g.gift) return { t: 'Zu verschenken', tone: 'gift', icon: 'gift' };
  if (!g.lendable) return isPuzzle(g) ? { t: 'Nicht verleihbar', tone: 'lock', icon: 'lock' } : { t: 'Nur gemeinsam', tone: 'lock', icon: 'lock' };
  return null;
}
const pillHTML = p => `<span class="pill t-${p.tone}">${p.icon ? ic(p.icon) : ''}${esc(p.t)}</span>`;

/* ---------- Status in der Spielansicht ---------- */
function statusFor(g) {
  const admin = isAdmin(), cur = current(g.id);
  if (admin) {
    const q = queue(g.id), fut = futureRes(g.id), pend = pendingReq(g.id);
    const qtxt = q.length ? ` Vorgemerkt: ${q.map(l => uname(l.userId)).join(', ')}.` : '';
    if (cur && cur.status === 'verliehen') {
      const who = uname(cur.userId);
      const vis = cur.pub ? 'Alle sehen, bei wem es ist.' : `Nur du und ${who} sehen, bei wem es ist.`;
      const with_ = cur.gameId !== g.id ? ` Zusammen mit ${gameById(cur.gameId).title}.` : (cur.extras.length ? ` Mit ${cur.extras.map(id => shortExp(gameById(id))).join(' und ')}.` : '');
      if (overdue(cur)) return { tone: 'danger', icon: 'glass', text: `Bei ${who}. Die Rückgabe war für ${fd(dueOf(cur))} geplant.`, sub: vis + with_ + qtxt };
      return { tone: 'lent', icon: 'box', text: cur.open ? `Bei ${who}, offen verliehen.` : `Bei ${who}, zurück am ${listDates(cur.ret)}.`, sub: vis + with_ + qtxt + (cur.ext === 'ok' ? ' Schon einmal verlängert.' : '') };
    }
    if (cur) return { tone: 'res', icon: 'cal', text: `Für ${uname(cur.userId)} reserviert, noch nicht übergeben.`, sub: `${cur.open ? 'Offen verliehen' : retText(cur).replace(/^z/, 'Z')}.` };
    if (g.gift) { const w = wishesFor(g.id); return { tone: 'gift', icon: 'gift', text: 'Zu verschenken.', sub: w.length ? `Hätten es gern: ${w.map(x => uname(x.userId)).join(', ')}.` : 'Noch hat sich niemand gemeldet.' }; }
    if (!g.lendable) return { tone: 'lock', icon: 'lock', text: 'Nicht verleihbar.', sub: isPuzzle(g) ? 'Direkt verleihen kannst du es trotzdem.' : 'Alle anderen sehen „Nur gemeinsam“. Direkt verleihen kannst du es trotzdem.' };
    if (q.length) {
      const first = q[0];
      return { tone: 'mine', icon: 'inbox', text: `Steht im Regal. Vorgemerkt: ${q.map(l => uname(l.userId)).join(', ')}.`, sub: first.notified ? `${uname(first.userId)} weiß Bescheid und wählt einen Zeitraum.` : 'Willst du es wieder verleihen? Dann gib Bescheid.', act: first.notified ? null : { act: 'notify', id: first.id, label: `${uname(first.userId)} Bescheid geben`, icon: 'chat' } };
    }
    if (pend.length) return { tone: 'mine', icon: 'inbox', text: `Angefragt von ${pend.map(l => uname(l.userId)).join(', ')}.`, sub: 'Annehmen kannst du unter Verwalten oder hier direkt mit „Verleihen“.' };
    if (fut.length) return { tone: 'ok', icon: 'cal', text: 'Steht im Regal und ist frei.', sub: `Ab ${fd(fut[0].start)} für ${uname(fut[0].userId)} reserviert.` };
    return { tone: 'ok', icon: 'check', text: 'Steht im Regal und ist frei.' };
  }
  const mine = mineFor(g.id);
  if (mine) {
    if (mine.status === 'verliehen') {
      const acts = [];
      if (canExtend(mine)) acts.push({ act: 'extend', id: mine.id, label: 'Verlängern', icon: 'calplus' });
      acts.push({ act: 'photos', id: mine.id, label: 'Fotos teilen', icon: 'camera' });
      if (overdue(mine)) return { tone: 'danger', icon: 'glass', text: `Bei dir. Die Rückgabe war für ${fd(dueOf(mine))} geplant.`, sub: 'Bring es Jakob einfach beim nächsten Treffen mit.', acts };
      const extSub = { angefragt: 'Verlängerung angefragt. Jakob meldet sich.', ok: 'Um zwei Wochen verlängert.', abgelehnt: 'Die Verlängerung hat Jakob diesmal nicht angenommen.' }[mine.ext] || 'Die Rückgabe trägt Jakob ein, sobald er es wieder hat.';
      return { tone: 'mine', icon: 'box', text: mine.open ? 'Bei dir, ohne festes Rückgabedatum.' : `Bei dir. Zurück am ${listDates(mine.ret)}.`, sub: extSub, acts };
    }
    if (mine.status === 'reserviert') return { tone: 'mine', icon: 'cal', text: mine.start && mine.start > T0 ? `Ab ${fdw(mine.start)} für dich reserviert.` : 'Für dich reserviert.', sub: `${mine.open ? 'Ohne festes Rückgabedatum' : retText(mine).replace(/^z/, 'Z')}. Mach mit Jakob aus, wann du es abholst.` };
    if (mine.status === 'vorgemerkt') return mine.notified
      ? { tone: 'mine', icon: 'check', text: 'Ist wieder da.', sub: 'Wähl einfach deinen Zeitraum.' }
      : { tone: 'mine', icon: 'check', text: `Vorgemerkt. Du bist Nummer ${queuePos(mine)} in der Reihe.`, sub: 'Sobald Jakob es wieder verleiht, sagt er dir Bescheid.' };
    return { tone: 'mine', icon: 'check', text: `Angefragt ${ago(mine.created)}.`, sub: `Ab ${fdw(mine.start)}, ${retText(mine)}. Jakob meldet sich bei dir.` };
  }
  if (myWish(g.id)) return { tone: 'mine', icon: 'gift', text: 'Du hättest es gern.', sub: 'Jakob entscheidet, wer es bekommt.' };
  if (g.gift) return { tone: 'gift', icon: 'gift', text: 'Jakob verschenkt dieses Spiel.', sub: 'Wenn du es gern hättest, sag Bescheid. Jakob entscheidet, wer es bekommt.' };
  const dec = declinedFor(g.id);
  if (dec) return { tone: 'lock', icon: 'x', text: 'Jakob hat deine Anfrage abgelehnt.', sub: dec.reason ? `„${dec.reason}“` : 'Du kannst es später gern nochmal versuchen.' };
  if (cur) {
    const who = uname(cur.userId), after = g.lendable ? 'Du kannst es vormerken.' : (isPuzzle(g) ? '' : 'Danach spielt Jakob es lieber gemeinsam mit dir.');
    if (cur.status === 'reserviert') return { tone: 'res', icon: 'cal', text: cur.pub ? `Gerade für ${who} reserviert.` : 'Gerade reserviert.', sub: g.lendable ? 'Du kannst es trotzdem vormerken.' : after };
    if (cur.pub) return { tone: 'lent', icon: 'box', text: cur.open ? `Gerade bei ${who}, ohne festes Rückgabedatum.` : `Gerade bei ${who}, zurück am ${listDates(cur.ret)}.`, sub: after };
    return { tone: 'lent', icon: 'box', text: 'Gerade verliehen.', sub: after };
  }
  if (!g.lendable) return isPuzzle(g)
    ? { tone: 'lock', icon: 'lock', text: 'Dieses Puzzle verleiht Jakob gerade nicht.' }
    : { tone: 'lock', icon: 'lock', text: 'Spielt Jakob lieber gemeinsam mit dir.', sub: g.once === 'verbraucht' ? 'Beim Spielen wird Material verbraucht.' : 'Frag ihn einfach beim nächsten Treffen.' };
  const fut = futureRes(g.id);
  if (fut.length) return { tone: 'ok', icon: 'check', text: 'Steht im Regal und ist frei.', sub: `Ab ${fd(fut[0].start)} ist es schon vergeben.` };
  return { tone: 'ok', icon: 'check', text: 'Steht im Regal und ist frei.' };
}

/* Offene Punkte für Jakob (Abzeichen am Reiter „Verwalten“) */
const extRequests = () => S.loans.filter(l => l.status === 'verliehen' && l.ext === 'angefragt');
const giftGroups = () => [...new Set(S.gifts.map(w => w.gameId))].filter(id => gameById(id) && !gameById(id).archived);
const backQueued = () => live().filter(g => !current(g.id) && queue(g.id).length && !queue(g.id)[0].notified);
const adminOpen = () => S.loans.filter(l => l.status === 'angefragt').length + extRequests().length + giftGroups().length + backQueued().length + S.access.length;
