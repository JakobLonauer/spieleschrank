/* Gemeinsame Hilfsfunktionen für die Hooks.
   PocketBase führt jeden Handler in einem eigenen Kontext aus, darum lädt jeder Handler diese Datei per require(). */

const MAXDAYS = 21;   // Höchstdauer: drei Wochen ab dem Abholtag
const EXTDAYS = 14;   // Verlängerung: einmal um zwei Wochen
const ACTIVE = ['reserviert', 'verliehen'];
const OPEN = ['angefragt', 'vorgemerkt', 'reserviert', 'verliehen'];

/* ---------- Kalendertage als 'YYYY-MM-DD' (Ortszeit des Servers, TZ=Europe/Vienna) ---------- */
const pad = n => (n < 10 ? '0' : '') + n;
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const parse = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(parse(s)) === s;
const maxOf = arr => arr.slice().sort().pop();

function isAdmin(e) {
  if (e.hasSuperuserAuth && e.hasSuperuserAuth()) return true;
  const a = e.auth;
  return !!(a && a.collection().name === 'users' && a.getString('role') === 'admin');
}

/* JSON-Felder kommen als Rohbytes; getString liefert den JSON-Text */
function jsonOf(rec, key, fallback) {
  try { const v = JSON.parse(rec.getString(key) || 'null'); return v === null ? fallback : v; } catch (err) { return fallback; }
}
function retOf(rec) {
  const arr = jsonOf(rec, 'ret', []);
  return Array.isArray(arr) ? arr.map(String) : [];
}

/* Belegte Zeiträume eines Spiels (und seiner mitgeliehenen Erweiterungen) */
function busyRanges(app, itemIds, exceptId) {
  const out = [];
  itemIds.forEach(id => {
    const recs = app.findRecordsByFilter('loans', `(item = {:id} || extras ~ {:id}) && (status = 'reserviert' || status = 'verliehen')`, '', 0, 0, { id });
    recs.forEach(l => {
      if (l.id === exceptId) return;
      const from = l.getString('handed') || l.getString('start') || today();
      const r = retOf(l);
      const to = l.getBool('open') ? '9999-12-31' : (r.length ? maxOf(r) : addDays(from, MAXDAYS));
      out.push([from, to]);
    });
  });
  return out;
}

/* Prüft Abholtag und Rückgabetage. Wirft BadRequestError mit einem Satz, den man versteht. */
function checkPeriod(app, o) {
  const { start, ret, items, exceptId, member } = o;
  const limit = o.limit !== false;
  if (!isDate(start)) throw new BadRequestError('Bitte wähl einen Abholtag.');
  if (!Array.isArray(ret) || ret.length < 1) throw new BadRequestError('Bitte wähl mindestens einen Rückgabetag.');
  if (limit && ret.length > 3) throw new BadRequestError('Höchstens drei Rückgabetage.');
  if (new Set(ret).size !== ret.length) throw new BadRequestError('Ein Rückgabetag ist doppelt.');
  if (member && start < today()) throw new BadRequestError('Der Abholtag liegt in der Vergangenheit.');
  const lim = addDays(start, MAXDAYS);
  ret.forEach(r => {
    if (!isDate(r)) throw new BadRequestError('Ein Rückgabetag ist ungültig.');
    if (r <= start) throw new BadRequestError('Rückgabetage liegen nach dem Abholtag.');
    if (limit && r > lim) throw new BadRequestError('Alle Rückgabetage müssen innerhalb von drei Wochen liegen.');
  });
  const end = maxOf(ret);
  const clash = busyRanges(app, items, exceptId).some(([a, b]) => start <= b && end >= a);
  if (clash) throw new BadRequestError('In diesem Zeitraum ist es schon vergeben.');
}

/* ---------- BoardGameGeek ---------- */
const BGG_BASE = () => ($os.getenv('BGG_BASE') || 'https://boardgamegeek.com/xmlapi2').replace(/\/$/, '');
/* Schlüssel: zuerst aus den Einstellungen (trägt Jakob in der App ein), sonst aus der Server-Einrichtung */
function BGG_TOKEN() {
  try { const t = $app.findFirstRecordByFilter('settings', "id != ''").getString('bggToken').trim(); if (t) return t; } catch (err) { }
  return $os.getenv('BGG_TOKEN') || '';
}

function bggGet(path) {
  const headers = { 'User-Agent': 'Spieleschrank (privat)' };
  if (BGG_TOKEN()) headers.Authorization = 'Bearer ' + BGG_TOKEN();
  for (let attempt = 0; attempt < 4; attempt++) {
    let res;
    try { res = $http.send({ url: BGG_BASE() + path, method: 'GET', headers, timeout: 30 }); }
    catch (err) { throw new BadRequestError('BoardGameGeek ist gerade nicht erreichbar. Bitte später noch einmal.'); }
    if (res.statusCode === 200) return toString(res.body);
    if (res.statusCode === 202 || res.statusCode === 429 || res.statusCode >= 500) { sleep(2500 * (attempt + 1)); continue; }
    if (res.statusCode === 401 || res.statusCode === 403) throw new BadRequestError(BGG_TOKEN() ? 'BGG nimmt den BGG-Schlüssel nicht an. Bitte prüf ihn unter Verwalten, Einstellungen.' : 'Für die BGG-Suche fehlt noch der BGG-Schlüssel. Du trägst ihn unter Verwalten, Einstellungen ein. Bis dahin klappt „Sammlung importieren“.');
    throw new BadRequestError('BGG antwortet nicht wie erwartet (' + res.statusCode + ').');
  }
  throw new BadRequestError('BGG ist gerade beschäftigt. Bitte später noch einmal.');
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
function decode(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => (n in ENT ? ENT[n] : m));
}
const attr = (tag, name) => { const m = tag.match(new RegExp('\\b' + name + '="([^"]*)"')); return m ? decode(m[1]) : ''; };
const valOf = (block, tag) => { const m = block.match(new RegExp('<' + tag + '\\b[^>]*\\bvalue="([^"]*)"')); return m ? decode(m[1]) : ''; };

function parseSearch(xml) {
  const out = [];
  const re = /<item\b([^>]*)>([\s\S]*?)<\/item>/g; let m;
  while ((m = re.exec(xml))) {
    const head = m[1], body = m[2];
    const nm = body.match(/<name\b[^>]*type="primary"[^>]*>/) || body.match(/<name\b[^>]*>/);
    out.push({ id: +attr(head, 'id'), type: attr(head, 'type'), name: nm ? attr(nm[0], 'value') : '', year: +valOf(body, 'yearpublished') || null });
  }
  return out;
}

const GENRE_MAP = [
  [/familygames/, 'Familie'], [/strategygames/, 'Strategie'], [/partygames/, 'Party'],
  [/Cooperative Game/i, 'Kooperativ'], [/Deduction|Murder\/Mystery|Puzzle|Escape/i, 'Rätsel & Krimi'],
  [/Card Game/i, 'Kartenspiel'], [/childrensgames|Children's Game/i, 'Familie']
];

function parseThings(xml) {
  const out = [];
  const re = /<item\b([^>]*)>([\s\S]*?)<\/item>/g; let m;
  while ((m = re.exec(xml))) {
    const head = m[1], b = m[2];
    const names = []; const nre = /<name\b[^>]*>/g; let nm;
    while ((nm = nre.exec(b))) names.push({ type: attr(nm[0], 'type'), value: attr(nm[0], 'value') });
    const primary = (names.find(n => n.type === 'primary') || names[0] || {}).value || '';
    const links = []; const lre = /<link\b[^>]*>/g; let lm;
    while ((lm = lre.exec(b))) links.push({ type: attr(lm[0], 'type'), id: +attr(lm[0], 'id'), value: attr(lm[0], 'value'), inbound: attr(lm[0], 'inbound') === 'true' });
    const ranks = []; const rre = /<rank\b[^>]*>/g; let rm;
    while ((rm = rre.exec(b))) ranks.push(attr(rm[0], 'name'));
    const img = (b.match(/<image>\s*([^<]+?)\s*<\/image>/) || [])[1] || '';
    const desc = decode((b.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '').replace(/\s+\n/g, '\n').trim();
    const weight = parseFloat(valOf(b, 'averageweight')) || 0;
    let best = null;
    const bw = b.match(/<result\b[^>]*name="bestwith"[^>]*value="([^"]*)"/);
    if (bw) { const nums = decode(bw[1]).match(/\d+/g); if (nums) best = [+nums[0], +(nums[1] || nums[0])]; }
    const hay = links.filter(l => l.type === 'boardgamecategory' || l.type === 'boardgamemechanic').map(l => l.value).join(' | ') + ' | ' + ranks.join(' ');
    const genres = [];
    GENRE_MAP.forEach(([rx, g]) => { if (rx.test(hay) && !genres.includes(g)) genres.push(g); });
    const pmin = +valOf(b, 'minplayers') || null, pmax = +valOf(b, 'maxplayers') || null;
    if (pmax === 2 && !genres.includes('Zu zweit')) genres.push('Zu zweit');
    const type = attr(head, 'type');
    out.push({
      bggId: +attr(head, 'id'), type, kind: type === 'boardgameexpansion' ? 'exp' : 'game',
      title: primary, alt: names.filter(n => n.type === 'alternate').map(n => n.value).slice(0, 40),
      year: +valOf(b, 'yearpublished') || null, pmin, pmax,
      tmin: +valOf(b, 'minplaytime') || +valOf(b, 'playingtime') || null,
      tmax: +valOf(b, 'maxplaytime') || +valOf(b, 'playingtime') || null,
      age: +valOf(b, 'minage') || null,
      diff: weight ? (weight < 1.8 ? 1 : weight < 2.6 ? 2 : 3) : null, best,
      genres, image: img.trim(), descEn: desc.slice(0, 1200),
      bases: links.filter(l => l.type === 'boardgameexpansion' && l.inbound).map(l => ({ id: l.id, title: l.value })),
      expansions: links.filter(l => l.type === 'boardgameexpansion' && !l.inbound).map(l => ({ id: l.id, title: l.value }))
    });
  }
  return out;
}

/* Cover nur von BGG-Bildservern laden (kein beliebiger Abruf fremder Adressen) */
function coverFromURL(url) {
  if (!/^https:\/\/cf\.geekdo-images\.com\//.test(url || '')) return null;
  try { return $filesystem.fileFromURL(url, 30); } catch (err) { return null; }
}

/* Felder aus BGG auf einen Eintrag übertragen, ohne Jakobs eigene Angaben zu überschreiben */
function applyThing(rec, t, overwrite) {
  const setIf = (k, v) => { if (v === null || v === undefined || v === '') return; if (overwrite || !rec.get(k)) rec.set(k, v); };
  rec.set('bggId', t.bggId);
  setIf('title', t.title);
  setIf('pmin', t.pmin); setIf('pmax', t.pmax); setIf('tmin', t.tmin); setIf('tmax', t.tmax);
  setIf('age', t.age); setIf('diff', t.diff);
  if (t.best) { setIf('bestMin', t.best[0]); setIf('bestMax', t.best[1]); }
  const g = jsonOf(rec, 'genres', []);
  if (!Array.isArray(g) || !g.length) rec.set('genres', t.genres);
  if (t.alt && t.alt.length) rec.set('alt', t.alt.join(' | ').slice(0, 2000));
}

module.exports = { BGG_TOKEN, jsonOf, MAXDAYS, EXTDAYS, ACTIVE, OPEN, today, addDays, isDate, maxOf, isAdmin, retOf, busyRanges, checkPeriod, bggGet, parseSearch, parseThings, coverFromURL, applyThing, decode };
