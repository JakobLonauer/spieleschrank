
/* =================== Server: Laden, Abgleich, Anmeldung =================== */
/* Die Oberfläche arbeitet weiter mit S (wie im Prototyp). Nach jeder Aktion vergleicht persist()
   den Stand mit dem zuletzt vom Server bekannten und schickt nur die Änderungen. Lehnt der Server
   etwas ab, erscheint sein Satz als Hinweis und alles wird neu geladen. */
const pb = new PocketBase(location.origin);
pb.autoCancellation(false);

const ID_ABC = 'abcdefghijklmnopqrstuvwxyz0123456789';
const newId = () => { const a = new Uint8Array(15); crypto.getRandomValues(a); return Array.from(a, n => ID_ABC[n % 36]).join(''); };
const isoOrEmpty = d => (d ? isoD(d) : '');
const dOrNull = s => (s ? parseISO(String(s).slice(0, 10)) : null);
const fromStamp = s => (s ? new Date(String(s).replace(' ', 'T')) : T0);
const initials = name => String(name || '?').replace(/^(Oma|Opa|Onkel|Tante) /, '').charAt(0).toUpperCase() || '?';

/* ---------- Umwandlung Server-Datensatz ↔ Objekt der Oberfläche ---------- */
const coverURL = r => (r.cover ? pb.files.getURL(r, r.cover, { thumb: '480x480f' }) : null);
function toItem(r) {
  const kind = r.kind, pmin = r.pmin || 1, pmax = r.pmax || pmin, tmin = r.tmin || r.tmax || 0, tmax = r.tmax || tmin;
  return {
    id: r.id, kind, title: r.title, bggId: r.bggId || null,
    players: [pmin, pmax], time: [tmin, tmax], age: r.age || 0, diff: r.diff || 2, genres: Array.isArray(r.genres) ? r.genres : [],
    best: r.bestMin ? [r.bestMin, r.bestMax || r.bestMin] : null, lang: r.lang || 'de', textHeavy: !!r.textHeavy,
    desc: r.desc || '', rec: r.rec || '', adds: r.adds || '', base: r.base || '', standalone: !!r.standalone,
    withBase: r.standalone && r.withBaseMax ? [pmin, r.withBaseMax] : undefined,
    rules: r.rules ? { lang: r.rulesLang || 'Deutsch', size: '', file: r.rules } : null,
    img: coverURL(r), cover: r.cover || '', pal: Number.isFinite(r.pal) ? r.pal : hash(r.id) % PALETTES.length, pat: r.pat || '',
    pieces: r.pieces || 0, brand: r.brand || '', size: [r.w || 0, r.h || 0], motif: r.motif || '', missing: r.missing || 0,
    done: !!r.done, once: r.once || null, lendable: !!r.lendable, gift: !!r.gift, archived: !!r.archived,
    giftedTo: r.giftedTo || undefined, giftedAt: dOrNull(r.giftedAt) || undefined, added: dOrNull(r.added),
    alt: r.alt || '', note: r.note || '', knownBy: [], _r: r
  };
}
const itemRec = g => ({
  kind: g.kind, title: g.title, bggId: g.bggId || 0,
  pmin: g.players?.[0] || 0, pmax: g.players?.[1] || 0, tmin: g.time?.[0] || 0, tmax: g.time?.[1] || 0,
  age: g.age || 0, diff: g.diff || 0, genres: g.genres || [], bestMin: g.best?.[0] || 0, bestMax: g.best?.[1] || 0,
  lang: g.lang || '', textHeavy: !!g.textHeavy, desc: g.desc || '', rec: g.rec || '', adds: g.adds || '',
  base: g.base || '', standalone: !!g.standalone, withBaseMax: g.withBase?.[1] || 0,
  rulesLang: g.rules?.lang || '', pal: g.pal || 0, pat: g.pat || '',
  pieces: g.pieces || 0, brand: g.brand || '', w: g.size?.[0] || 0, h: g.size?.[1] || 0, motif: g.motif || '', missing: g.missing || 0,
  done: !!g.done, once: g.once || '', lendable: !!g.lendable, gift: !!g.gift, archived: !!g.archived,
  giftedTo: g.giftedTo || '', giftedAt: isoOrEmpty(g.giftedAt), added: isoOrEmpty(g.added), alt: g.alt || '', note: g.note || ''
});

const toUser = r => ({ id: r.id, name: r.name || r.username, username: r.username, ini: initials(r.name || r.username), av: r.color || 0, ort: r.ort || '', phone: r.phone || '', mustChange: !!r.mustChange, lastVisit: dOrNull(r.lastVisit), admin: r.role === 'admin' });
const userRec = u => ({ name: u.name, ort: u.ort || '', phone: u.phone || '', color: u.av || 0, mustChange: !!u.mustChange, lastVisit: isoOrEmpty(u.lastVisit) });

const toLoan = r => ({
  id: r.id, gameId: r.item, userId: r.user, status: r.status, extras: r.extras || [], created: fromStamp(r.created),
  start: dOrNull(r.start), ret: (Array.isArray(r.ret) ? r.ret : []).map(dOrNull).filter(Boolean), open: !!r.open,
  handed: dOrNull(r.handed), returned: dOrNull(r.returned), pub: !!r.pub, msg: r.msg || '', reason: r.reason || '',
  seen: !!r.seen, notified: !!r.notified, ext: r.ext || null, extended: !!r.extended, photoHint: r.photoHint || null, returnNote: r.returnNote || ''
});
const loanRec = l => ({
  item: l.gameId, user: l.userId, status: l.status, extras: l.extras || [], start: isoOrEmpty(l.start), ret: (l.ret || []).map(isoD),
  open: !!l.open, handed: isoOrEmpty(l.handed), returned: isoOrEmpty(l.returned), pub: !!l.pub, msg: l.msg || '', reason: l.reason || '',
  seen: !!l.seen, notified: !!l.notified, ext: l.ext || '', extended: !!l.extended, photoHint: l.photoHint || '', returnNote: l.returnNote || ''
});
/* Ausleihen anderer Personen (nur für Mitglieder): ohne Person, Name nur wenn sichtbar */
const toForeign = r => ({ ...toLoan({ ...r, user: 'p_' + r.id, msg: '', reason: '' }), foreign: true, pub: !!r.pub });

const toWish = r => ({ id: r.id, gameId: r.item, userId: r.user, created: fromStamp(r.created) });
const wishRec = w => ({ item: w.gameId, user: w.userId });
const toList = r => ({ id: r.id, name: r.name, ids: r.items || [], isDefault: !!r.isDefault });
const listRec = li => ({ user: S.user, name: li.name, items: li.ids, isDefault: !!li.isDefault });
function toPhoto(r) {
  const p = { id: r.id, gameId: r.item, userId: r.user, loanId: r.loan || null, caption: r.caption || '', created: fromStamp(r.created), liked: !!r.liked, _r: r };
  Object.defineProperty(p, 'urls', { enumerable: false, get: () => (r.files || []).map(f => pb.files.getURL(r, f, { thumb: '400x300', token: S.fileToken || '' })) });
  return p;
}
const photoRec = p => ({ liked: !!p.liked });
const toAccess = r => ({ id: r.id, name: r.name, contact: r.contact, msg: r.msg || '', created: fromStamp(r.created) });
const settingsRec = s => ({ newWeeks: s.newWeeks, showcase: s.link || '', ...(isAdmin() ? { bggToken: s.bggToken || '' } : {}) });

/* „Kenn ich schon“ steckt in g.knownBy; auf dem Server ist es je Paar ein Datensatz */
function knownList() {
  const out = [];
  S.games.forEach(g => (g.knownBy || []).forEach(uid => {
    if (!isAdmin() && uid !== S.user) return;
    const key = g.id + '|' + uid;
    if (!S.knownIds[key]) S.knownIds[key] = newId();
    out.push({ id: S.knownIds[key], item: g.id, user: uid });
  }));
  return out;
}

/* ---------- Was abgeglichen wird, in dieser Reihenfolge ---------- */
const SYNC = [
  { c: 'users', list: () => S.users.filter(u => !u.pseudo && (isAdmin() || u.id === S.user)), to: userRec, create: false, del: false },
  { c: 'items', list: () => (isAdmin() ? S.games : []), to: itemRec, create: true, del: true },
  { c: 'loans', list: () => S.loans.filter(l => !l.foreign), to: loanRec, create: true, del: () => isAdmin() },
  { c: 'wishes', list: () => S.gifts.filter(w => isAdmin() || w.userId === S.user), to: wishRec, create: true, del: true },
  { c: 'known', list: () => knownList(), to: k => ({ item: k.item, user: k.user }), create: true, del: true },
  { c: 'lists', list: () => myLists(), to: listRec, create: true, del: true },
  { c: 'photos', list: () => S.photos, to: photoRec, create: false, del: false },
  { c: 'access_requests', list: () => (isAdmin() ? S.access : []), to: () => ({}), create: false, del: true },
  { c: 'settings', list: () => (S.settings.id ? [S.settings] : []), to: settingsRec, create: false, del: false }
];
let shadow = {};
/* Nur was wirklich vom Server kam, gilt als bekannt; alles andere (z. B. die leere Merkliste) wird beim nächsten Abgleich angelegt */
const snapshot = seen => { shadow = {}; SYNC.forEach(d => { shadow[d.c] = new Map(d.list().filter(o => !seen || seen[d.c]?.has(o.id)).map(o => [o.id, JSON.stringify(d.to(o))])); }); };
const remember = (c, id, rec) => { if (shadow[c]) shadow[c].set(id, JSON.stringify(rec)); };

let persistTimer = null, persisting = null;
function schedulePersist() { if (!S.ready) return; clearTimeout(persistTimer); persistTimer = setTimeout(persist, 0); }
/* Ein Abgleich nach dem anderen. Wer währenddessen ruft, wartet und schickt danach den neuen Stand,
   damit z. B. das Cover erst geholt wird, wenn das Spiel wirklich auf dem Server liegt. */
async function persist() {
  while (persisting) await persisting;
  persisting = syncAll();
  try { return await persisting; } finally { persisting = null; }
}
async function syncAll() {
  try {
    for (const d of SYNC) {
      const prev = shadow[d.c] || new Map(), cur = d.list(), ids = new Set();
      for (const o of cur) {
        ids.add(o.id);
        const rec = d.to(o), js = JSON.stringify(rec), old = prev.get(o.id);
        if (old === js) continue;
        if (old === undefined) {
          if (!d.create) continue;
          await pb.collection(d.c).create({ id: o.id, ...rec });
        } else {
          const was = JSON.parse(old), diff = {};
          Object.keys(rec).forEach(k => { if (JSON.stringify(rec[k]) !== JSON.stringify(was[k])) diff[k] = rec[k]; });
          if (Object.keys(diff).length) await pb.collection(d.c).update(o.id, diff);
        }
        prev.set(o.id, js);
      }
      const mayDelete = typeof d.del === 'function' ? d.del() : d.del;
      if (mayDelete) for (const id of [...prev.keys()]) if (!ids.has(id)) { await pb.collection(d.c).delete(id).catch(e => { if (e.status !== 404) throw e; }); prev.delete(id); }
      shadow[d.c] = prev;
    }
    return true;
  } catch (e) {
    console.warn('Abgleich fehlgeschlagen', e);
    toast(serverMsg(e));
    await reload();
    return false;
  }
}
function serverMsg(e) {
  if (!e) return 'Das hat nicht geklappt.';
  if (e.status === 0) return 'Keine Verbindung zum Spieleschrank. Bitte prüf das Internet.';
  const m = e.response?.message || e.message || '';
  if (/Failed to (create|update|delete) record/i.test(m) || /something went wrong/i.test(m)) return 'Das hat nicht geklappt. Bitte versuch es noch einmal.';
  if (/^Too Many Requests/i.test(m)) return 'Kurz durchatmen: zu viele Versuche. Gleich noch einmal.';
  return m || 'Das hat nicht geklappt.';
}

/* ---------- Laden ---------- */
const all = (c, opt = {}) => pb.collection(c).getFullList({ batch: 500, ...opt });
async function loadAll() {
  const meRec = pb.authStore.record;
  const admin = meRec.role === 'admin';
  const [items, settings, loans, stats, wishes, known, lists, photos] = await Promise.all([
    all('items', { sort: 'title' }), all('settings'), all('loans', { sort: 'created' }), all('item_stats'),
    all('wishes', { sort: 'created' }), all('known'), all('lists', { sort: 'sort,created' }), all('photos', { sort: '-created' })
  ]);
  const [users, access, foreign] = await Promise.all([
    admin ? all('users', { sort: 'name' }) : Promise.resolve([meRec]),
    admin ? all('access_requests', { filter: "status = 'neu'", sort: 'created' }) : Promise.resolve([]),
    admin ? Promise.resolve([]) : all('loan_public', { sort: 'created' })
  ]);
  S.games = items.map(toItem);
  const byId = Object.fromEntries(S.games.map(g => [g.id, g]));
  S.knownIds = {};
  known.forEach(k => { const g = byId[k.item]; if (g && !g.knownBy.includes(k.user)) g.knownBy.push(k.user); S.knownIds[k.item + '|' + k.user] = k.id; });
  S.users = users.map(toUser);
  S.loans = loans.map(toLoan);
  if (!admin) {
    const own = new Set(S.loans.map(l => l.id));
    foreign.filter(r => !own.has(r.id)).forEach(r => {
      S.loans.push(toForeign(r));
      S.users.push({ id: 'p_' + r.id, name: r.who || 'jemand', ini: initials(r.who), av: 7, pseudo: true });
    });
  }
  S.stats = Object.fromEntries(stats.map(s => [s.id, s.n]));
  S.gifts = wishes.map(toWish);
  S.lists = { [meRec.id]: lists.map(toList) };
  S.photos = photos.map(toPhoto);
  S.access = access.map(toAccess);
  const st = settings[0] || {};
  S.settings = { id: st.id, newWeeks: st.newWeeks || 3, link: st.showcase || '', owner: st.owner || 'Jakob', title: st.title || 'Spieleschrank', bggToken: st.bggToken || '' };
  S.user = meRec.id;
  if (S.photos.length) await refreshFileToken();
  const ids = rs => new Set(rs.map(r => r.id));
  snapshot({ users: ids(users), items: ids(items), loans: ids(loans), wishes: ids(wishes), known: ids(known), lists: ids(lists), photos: ids(photos), access_requests: ids(access), settings: ids(settings) });
}
async function refreshFileToken() { try { S.fileToken = await pb.files.getToken(); } catch (e) { S.fileToken = ''; } }

async function reload() {
  if (!pb.authStore.isValid) return;
  try { await loadAll(); } catch (e) { if (e.status === 401 || e.status === 403) { await logout(true); return; } console.warn(e); return; }
  S.ready = true;
  if (S.view === 'app' && !me()?.mustChange) refresh(); else renderApp();
}

/* ---------- Anmelden, Abmelden, erster Login ---------- */
async function login(username, password) {
  await pb.collection('users').authWithPassword(username.trim().toLowerCase(), password);
  S.loginPw = password;   // nur für den Passwortwechsel beim ersten Login, bleibt im Speicher
  await startSession();
}
async function startSession() {
  S.ready = false;
  await loadAll();
  S.view = 'app'; S.tab = 'regal'; resetMode();
  S.ready = true;
  const u = me(), prev = u.lastVisit;
  renderApp(); scrollTo(0, 0);
  if (!u.mustChange && (!prev || !same(prev, T0))) { S.prevVisit = prev; u.lastVisit = T0; schedulePersist(); }
  subscribe();
}
async function logout(expired) {
  try { pb.realtime.unsubscribe(); } catch (e) { }
  pb.authStore.clear();
  Object.assign(S, { user: null, ready: false, games: [], loans: [], users: [], gifts: [], photos: [], lists: {}, access: [], loginPw: null });
  shadow = {};
  closeSheet(); S.view = 'app'; renderApp(); scrollTo(0, 0);
  toast(expired ? 'Bitte melde dich neu an.' : 'Abgemeldet');
}
async function changeOwnPassword(pw, old) {
  const u = me();
  await pb.collection('users').update(u.id, { oldPassword: old ?? S.loginPw ?? '', password: pw, passwordConfirm: pw, mustChange: false });
  await pb.collection('users').authWithPassword(u.username, pw);
  S.loginPw = null;
  u.mustChange = false; remember('users', u.id, userRec(u));
}

/* ---------- Was nicht in den Abgleich passt: Konten, Dateien, BGG ---------- */
async function apiCreateUser(u, password) {
  const r = await pb.collection('users').create({ id: u.id, username: u.username, name: u.name, ort: u.ort || '', phone: u.phone || '', color: u.av || 0, role: 'member', password, passwordConfirm: password });
  const nu = toUser(r); S.users.push(nu); remember('users', nu.id, userRec(nu));
  return nu;
}
async function apiSetPassword(uid, password) {
  await pb.collection('users').update(uid, { password, passwordConfirm: password, mustChange: true });
  const u = userById(uid); u.mustChange = true; remember('users', uid, userRec(u));
}
async function apiUploadPhotos(l, blobs, caption) {
  const fd = new FormData();
  fd.append('id', newId()); fd.append('user', S.user); fd.append('item', l.gameId); fd.append('loan', l.id); fd.append('caption', caption);
  blobs.forEach((b, i) => fd.append('files', b, `foto-${i + 1}.jpg`));
  const r = await pb.collection('photos').create(fd);
  const p = toPhoto(r); S.photos.unshift(p); remember('photos', p.id, photoRec(p));
}
async function apiItemFiles(id, files) {
  const fd = new FormData();
  Object.entries(files).forEach(([k, v]) => { if (v === null) fd.append(k, ''); else fd.append(k, v, v.name || k); });
  const r = await pb.collection('items').update(id, fd);
  const g = gameById(id); if (g) { g.img = coverURL(r); g.cover = r.cover || ''; g.rules = r.rules ? { lang: r.rulesLang || 'Deutsch', size: '', file: r.rules } : null; g._r = r; }
  coverCache.clear();
}
async function apiCoverFromBgg(id) {
  try { await pb.send(`/api/bgg/cover/${id}`, { method: 'POST' }); const r = await pb.collection('items').getOne(id); const g = gameById(id); if (g) { g.img = coverURL(r); g.cover = r.cover; g._r = r; } refresh(); } catch (e) { /* ohne Cover geht es auch */ }
}
async function openRules(id) {
  const g = gameById(id); if (!g?.rules?.file) return;
  const w = window.open('', '_blank');
  try {
    const token = await pb.files.getToken();
    const url = pb.files.getURL(g._r, g.rules.file, { token });
    if (w) w.location = url; else location.href = url;
  } catch (e) { if (w) w.close(); toast(serverMsg(e)); }
}
const blobFromDataURL = async url => (await fetch(url)).blob();

/* ---------- Live: neue Anfragen und Entscheidungen erscheinen ohne Neuladen ---------- */
let reloadTimer = null;
const softReload = () => { clearTimeout(reloadTimer); reloadTimer = setTimeout(() => { if (!persisting && !S.sheetView) reload(); else softReload(); }, 600); };
function subscribe() {
  try {
    pb.realtime.unsubscribe();
    ['loans', 'items', 'settings'].concat(isAdmin() ? ['wishes', 'access_requests', 'photos', 'users'] : []).forEach(c => pb.collection(c).subscribe('*', softReload).catch(() => { }));
  } catch (e) { }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.ready) softReload(); });
setInterval(() => { if (document.visibilityState === 'visible' && S.ready) softReload(); }, 120000);
setInterval(() => { if (S.ready && S.photos.length) refreshFileToken(); }, 150000);

/* ---------- Schaufenster ohne Login ---------- */
async function loadShowcase(token) {
  const d = await pb.send(`/api/showcase/${encodeURIComponent(token)}`, { method: 'GET' });
  S.games = d.items.map(it => toItem({ ...it, lendable: true, archived: false, added: '' }));
  S.loans = []; S.users = []; S.gifts = []; S.photos = []; S.lists = {}; S.access = []; S.stats = {};
  S.settings = { newWeeks: 3, link: '', owner: d.owner, title: d.title };
}

/* ---------- Start ---------- */
async function boot() {
  const sc = location.pathname.match(/^\/schaufenster\/([A-Za-z0-9]+)/);
  if (sc) {
    try { await loadShowcase(sc[1]); S.view = 'showcase'; }
    catch (e) { S.view = 'gone'; }
    renderApp(); return;
  }
  if (pb.authStore.isValid) {
    try { await pb.collection('users').authRefresh(); await startSession(); return; }
    catch (e) { if (e.status !== 0) pb.authStore.clear(); else { S.offline = true; } }
  }
  S.view = 'app'; renderApp();
}
document.documentElement.lang = 'de-AT';
boot();
})();
