/// <reference path="../pb_data/types.d.ts" />
/* Spieleschrank: Serverlogik. Jeder Handler lädt lib.js selbst (isolierte Kontexte). */

/* ---------- Was Mitglieder nicht sehen sollen ---------- */
onRecordEnrich((e) => {
  const L = require(`${__hooks}/lib.js`);
  if (!L.isAdmin(e.requestInfo ? { auth: e.requestInfo.auth, hasSuperuserAuth: () => e.requestInfo.hasSuperuserAuth() } : {})) e.record.hide('note');
  e.next();
}, 'items');
onRecordEnrich((e) => {
  const L = require(`${__hooks}/lib.js`);
  if (!L.isAdmin(e.requestInfo ? { auth: e.requestInfo.auth, hasSuperuserAuth: () => e.requestInfo.hasSuperuserAuth() } : {})) e.record.hide('showcase', 'bggToken');
  e.next();
}, 'settings');

/* ---------- Konten ---------- */
onRecordCreateRequest((e) => {
  const L = require(`${__hooks}/lib.js`);
  if (!L.isAdmin(e)) throw new ForbiddenError('Konten legt nur Jakob an.');
  e.record.set('username', String(e.record.getString('username')).trim().toLowerCase());
  if (!e.record.getString('role')) e.record.set('role', 'member');
  if (e.record.getString('role') === 'member') e.record.set('mustChange', true);
  e.next();
}, 'users');

onRecordUpdateRequest((e) => {
  const L = require(`${__hooks}/lib.js`);
  const o = e.record.original(), r = e.record;
  if (L.isAdmin(e)) {
    // Das letzte Admin-Konto darf seine Rolle nicht verlieren
    if (o.getString('role') === 'admin' && r.getString('role') !== 'admin') {
      const n = e.app.findRecordsByFilter('users', "role = 'admin'", '', 0, 0).length;
      if (n <= 1) throw new BadRequestError('Es muss immer ein Admin-Konto geben.');
    }
    if (r.getString('username')) r.set('username', r.getString('username').trim().toLowerCase());
    return e.next();
  }
  // Mitglieder dürfen an sich selbst nur Passwort, „Passwort geändert“ und den letzten Besuch ändern
  ['role', 'username', 'name', 'ort', 'phone', 'color', 'email'].forEach(k => {
    if (String(o.get(k)) !== String(r.get(k))) throw new ForbiddenError('Diese Angabe ändert Jakob.');
  });
  if (!o.getBool('mustChange') && r.getBool('mustChange')) throw new ForbiddenError('Nicht erlaubt.');
  e.next();
}, 'users');

onRecordDeleteRequest((e) => {
  const L = require(`${__hooks}/lib.js`);
  if (e.record.getString('role') === 'admin') throw new BadRequestError('Admin-Konten werden nicht gelöscht.');
  e.next();
}, 'users');

/* ---------- Ausleihen ---------- */
onRecordCreateRequest((e) => {
  const L = require(`${__hooks}/lib.js`);
  const r = e.record, admin = L.isAdmin(e);
  const item = e.app.findRecordById('items', r.getString('item'));
  if (item.getBool('archived')) throw new BadRequestError('Das gibt es nicht mehr im Regal.');
  const extras = r.getStringSlice('extras');
  extras.forEach(id => {
    const x = e.app.findRecordById('items', id);
    if (x.getString('kind') !== 'exp' || x.getString('base') !== item.id) throw new BadRequestError('Diese Erweiterung gehört nicht zu diesem Spiel.');
  });
  if (!admin) {
    if (!item.getBool('lendable')) throw new BadRequestError('Dieses Spiel spielt Jakob nur gemeinsam.');
    // Nur Felder, die Mitglieder selbst setzen dürfen
    ['handed', 'returned', 'reason', 'returnNote', 'ext', 'photoHint'].forEach(k => r.set(k, ''));
    ['notified', 'extended', 'seen', 'open'].forEach(k => r.set(k, false));
    r.set('pub', true);
    const dup = e.app.findRecordsByFilter('loans', `user = {:u} && item = {:i} && (status = 'angefragt' || status = 'vorgemerkt' || status = 'reserviert' || status = 'verliehen')`, '', 1, 0, { u: r.getString('user'), i: item.id });
    if (dup.length) throw new BadRequestError('Du hast dieses Spiel schon angefragt oder vorgemerkt.');
    if (r.getString('status') === 'vorgemerkt') { r.set('start', ''); r.set('ret', []); }
  }
  if (r.getString('status') === 'angefragt' || (admin && ['reserviert', 'verliehen'].includes(r.getString('status')) && !r.getBool('open'))) {
    L.checkPeriod(e.app, { start: r.getString('start'), ret: L.retOf(r), items: [item.id].concat(extras), exceptId: '', member: !admin });
  }
  if (admin && r.getBool('open')) r.set('ret', []);
  e.next();
}, 'loans');

onRecordUpdateRequest((e) => {
  const L = require(`${__hooks}/lib.js`);
  const o = e.record.original(), r = e.record;
  const changed = k => o.getString(k) !== r.getString(k);
  const FIELDS = ['item', 'user', 'status', 'extras', 'start', 'ret', 'open', 'handed', 'returned', 'pub', 'msg', 'reason', 'seen', 'notified', 'ext', 'extended', 'photoHint', 'returnNote'];
  const diff = FIELDS.filter(changed);
  if (L.isAdmin(e)) {
    // Bei neuen Tagen für eine Reservierung prüfen, ob der Zeitraum frei ist
    const st = r.getString('status');
    if (['reserviert', 'verliehen'].includes(st) && !r.getBool('open') && (changed('start') || changed('ret') || changed('status') || changed('extras')) && !changed('handed')) {
      const ret = L.retOf(r);
      if (ret.length) L.checkPeriod(e.app, { start: r.getString('start') || L.today(), ret, items: [r.getString('item')].concat(r.getStringSlice('extras')), exceptId: r.id, member: false, limit: false });
    }
    if (r.getBool('open')) r.set('ret', []);
    return e.next();
  }
  if (r.getString('user') !== o.getString('user') || changed('item')) throw new ForbiddenError('Nicht erlaubt.');
  const only = list => diff.every(k => list.includes(k));
  const st0 = o.getString('status'), st1 = r.getString('status');
  // 1) Zurückziehen bzw. Reservierung absagen
  if (st1 === 'zurückgezogen' && ['angefragt', 'vorgemerkt', 'reserviert'].includes(st0) && only(['status'])) { r.set('prevStatus', st0); return e.next(); }
  // Rückgängig: innerhalb von drei Minuten zurück zum vorigen Stand
  if (st0 === 'zurückgezogen' && o.getString('prevStatus') && st1 === o.getString('prevStatus') && only(['status'])) {
    const upd = new Date(o.getString('updated').replace(' ', 'T'));
    if (Date.now() - upd.getTime() < 180000) { r.set('prevStatus', ''); return e.next(); }
  }
  // 2) Nach „Bescheid geben“: Zeitraum wählen, daraus wird eine Anfrage
  if (st0 === 'vorgemerkt' && o.getBool('notified') && st1 === 'angefragt' && only(['status', 'start', 'ret', 'extras', 'msg'])) {
    L.checkPeriod(e.app, { start: r.getString('start'), ret: L.retOf(r), items: [r.getString('item')].concat(r.getStringSlice('extras')), exceptId: r.id, member: true });
    return e.next();
  }
  // 3) Verlängerung anfragen: einmal, nur bei befristeten Ausleihen
  if (st0 === 'verliehen' && st1 === 'verliehen' && only(['ext']) && r.getString('ext') === 'angefragt' && !o.getString('ext') && !o.getBool('extended') && !o.getBool('open')) return e.next();
  // Verlängerungsanfrage zurücknehmen
  if (st0 === 'verliehen' && only(['ext']) && o.getString('ext') === 'angefragt' && !r.getString('ext')) return e.next();
  // 4) Ablehnung gesehen
  if (st0 === 'abgelehnt' && only(['seen'])) return e.next();
  // 5) Foto-Hinweis gesehen oder weggetippt
  if (only(['photoHint'])) return e.next();
  if (!diff.length) return e.next();
  throw new ForbiddenError('Diese Änderung macht Jakob.');
}, 'loans');

/* ---------- Fotos, Wünsche, Kenn-ich-schon, Zugangsanfragen ---------- */
onRecordCreateRequest((e) => {
  const L = require(`${__hooks}/lib.js`);
  const r = e.record;
  if (!L.isAdmin(e) && r.getString('loan')) {
    const l = e.app.findRecordById('loans', r.getString('loan'));
    if (l.getString('user') !== r.getString('user') || l.getString('item') !== r.getString('item')) throw new ForbiddenError('Nicht erlaubt.');
  }
  r.set('liked', false);
  e.next();
}, 'photos');

onRecordCreateRequest((e) => {
  const item = e.app.findRecordById('items', e.record.getString('item'));
  if (!item.getBool('gift') || item.getBool('archived')) throw new BadRequestError('Dieses Spiel ist nicht zu verschenken.');
  e.next();
}, 'wishes');

onRecordCreateRequest((e) => {
  const item = e.app.findRecordById('items', e.record.getString('item'));
  if (!item.getString('once')) throw new BadRequestError('Das gibt es nur bei Einmalspielen.');
  e.next();
}, 'known');

onRecordCreateRequest((e) => {
  // Falle für automatische Formulare: ein unsichtbares Feld, das Menschen leer lassen
  if (e.record.getString('website')) return e.json(204, null);
  e.record.set('status', 'neu');
  e.next();
}, 'access_requests');

/* ---------- Neue Einträge: Datum für „Neu“ ---------- */
onRecordCreateRequest((e) => {
  const L = require(`${__hooks}/lib.js`);
  const b = e.requestInfo().body || {};
  if (b['added'] === undefined) e.record.set('added', L.today());
  e.next();
}, 'items');

/* ---------- Schaufenster ohne Login ---------- */
routerAdd('GET', '/api/showcase/{token}', (e) => {
  const token = e.request.pathValue('token');
  const st = e.app.findFirstRecordByFilter('settings', "id != ''");
  if (!token || token.length < 6 || token !== st.getString('showcase')) throw new NotFoundError('Diesen Link gibt es nicht mehr.');
  const recs = e.app.findRecordsByFilter('items', 'archived = false', 'title', 0, 0);
  const keep = ['id', 'collectionId', 'kind', 'title', 'base', 'standalone', 'pmin', 'pmax', 'bestMin', 'bestMax', 'tmin', 'tmax', 'age', 'diff', 'genres', 'lang', 'desc', 'cover', 'pal', 'pat', 'pieces', 'brand', 'w', 'h', 'motif', 'once'];
  const items = recs.map(r => { const o = {}; keep.forEach(k => { o[k] = k === 'id' ? r.id : k === 'collectionId' ? r.collection().id : r.get(k); }); return o; });
  return e.json(200, { title: st.getString('title'), owner: st.getString('owner'), items });
});

/* ---------- BoardGameGeek (nur Jakob) ---------- */
routerAdd('GET', '/api/bgg/search', (e) => {
  const L = require(`${__hooks}/lib.js`);
  if (!L.isAdmin(e)) throw new ForbiddenError('Nur für Jakob.');
  const q = String(e.request.url.query().get('q') || '').trim();
  if (q.length < 2) return e.json(200, { items: [] });
  const xml = L.bggGet('/search?type=boardgame,boardgameexpansion&query=' + encodeURIComponent(q));
  const found = L.parseSearch(xml).slice(0, 30);
  const owned = {};
  if (found.length) {
    e.app.findRecordsByFilter('items', 'bggId > 0', '', 0, 0).forEach(r => { owned[r.getInt('bggId')] = r.id; });
  }
  return e.json(200, { items: found.map(f => ({ ...f, owned: owned[f.id] || null })) });
}, $apis.requireAuth('users'));

routerAdd('GET', '/api/bgg/thing/{id}', (e) => {
  const L = require(`${__hooks}/lib.js`);
  if (!L.isAdmin(e)) throw new ForbiddenError('Nur für Jakob.');
  const id = parseInt(e.request.pathValue('id'), 10);
  if (!id) throw new BadRequestError('Ungültige BGG-Nummer.');
  const t = L.parseThings(L.bggGet('/thing?stats=1&id=' + id))[0];
  if (!t) throw new NotFoundError('Bei BGG nicht gefunden.');
  // Basisspiel schon im Regal?
  t.baseItem = null;
  for (const b of t.bases) {
    try { const r = e.app.findFirstRecordByFilter('items', 'bggId = {:id}', { id: b.id }); t.baseItem = r.id; break; } catch (err) { }
  }
  return e.json(200, t);
}, $apis.requireAuth('users'));

/* Cover eines Eintrags von BGG holen (nach dem Anlegen über die BGG-Suche) */
routerAdd('POST', '/api/bgg/cover/{itemId}', (e) => {
  const L = require(`${__hooks}/lib.js`);
  if (!L.isAdmin(e)) throw new ForbiddenError('Nur für Jakob.');
  const rec = e.app.findRecordById('items', e.request.pathValue('itemId'));
  const id = rec.getInt('bggId');
  if (!id) throw new BadRequestError('Kein BGG-Eintrag verknüpft.');
  const t = L.parseThings(L.bggGet('/thing?id=' + id))[0];
  const f = t && L.coverFromURL(t.image);
  if (!f) return e.json(200, { cover: '' });   // ohne Cover geht es auch
  rec.set('cover', f);
  e.app.save(rec);
  return e.json(200, { cover: rec.getString('cover') });
}, $apis.requireAuth('users'));

/* Sammlung importieren: Zeilen aus dem BGG-Export anlegen, Ergänzung von BGG läuft danach im Hintergrund */
routerAdd('POST', '/api/bgg/import', (e) => {
  const L = require(`${__hooks}/lib.js`);
  if (!L.isAdmin(e)) throw new ForbiddenError('Nur für Jakob.');
  const body = e.requestInfo().body || {};
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, 2000) : [];
  const enrich = !!body.enrich && !!L.BGG_TOKEN();
  const itemsCol = e.app.findCollectionByNameOrId('items'), jobsCol = e.app.findCollectionByNameOrId('bgg_jobs');
  const owned = {};
  e.app.findRecordsByFilter('items', 'bggId > 0', '', 0, 0).forEach(r => { owned[r.getInt('bggId')] = true; });
  let created = 0, skipped = 0;
  e.app.runInTransaction((tx) => {
    rows.forEach((row, i) => {
      const id = parseInt(row.bggId, 10);
      if (!id || owned[id]) { skipped++; return; }
      owned[id] = true;
      const r = new Record(itemsCol);
      r.set('kind', row.kind === 'exp' ? 'exp' : 'game');
      r.set('title', String(row.title || 'Ohne Titel').slice(0, 200));
      r.set('bggId', id);
      ['pmin', 'pmax', 'tmin', 'tmax', 'age'].forEach(k => { const v = parseInt(row[k], 10); if (v > 0) r.set(k, v); });
      const w = parseFloat(row.weight);
      if (w > 0) r.set('diff', w < 1.8 ? 1 : w < 2.6 ? 2 : 3);
      r.set('genres', []);
      r.set('lendable', true);
      r.set('lang', 'de');
      r.set('pal', id % 12);
      r.set('added', '');   // Bestand: nicht „neu“
      tx.save(r);
      created++;
      if (enrich) {
        const j = new Record(jobsCol);
        j.set('bggId', id); j.set('title', r.getString('title')); j.set('status', 'wartet'); j.set('item', r.id);
        tx.save(j);
      }
    });
  });
  return e.json(200, { created, skipped, enrich });
}, $apis.requireAuth('users'));

/* Bestehende Einträge mit BGG ergänzen (Cover, Eckdaten, andere Titel) */
routerAdd('POST', '/api/bgg/enrich', (e) => {
  const L = require(`${__hooks}/lib.js`);
  if (!L.isAdmin(e)) throw new ForbiddenError('Nur für Jakob.');
  if (!L.BGG_TOKEN()) throw new BadRequestError('Der BGG-Schlüssel fehlt noch. Du trägst ihn unter Einstellungen ein.');
  const jobsCol = e.app.findCollectionByNameOrId('bgg_jobs');
  const waiting = {};
  e.app.findRecordsByFilter('bgg_jobs', "status = 'wartet'", '', 0, 0).forEach(j => { waiting[j.getString('item')] = true; });
  let n = 0;
  e.app.findRecordsByFilter('items', "bggId > 0 && archived = false && cover = ''", '', 0, 0).forEach(r => {
    if (waiting[r.id]) return;
    const j = new Record(jobsCol);
    j.set('bggId', r.getInt('bggId')); j.set('title', r.getString('title')); j.set('status', 'wartet'); j.set('item', r.id);
    e.app.save(j); n++;
  });
  return e.json(200, { queued: n });
}, $apis.requireAuth('users'));

routerAdd('GET', '/api/bgg/status', (e) => {
  const L = require(`${__hooks}/lib.js`);
  if (!L.isAdmin(e)) throw new ForbiddenError('Nur für Jakob.');
  const c = s => e.app.findRecordsByFilter('bgg_jobs', 'status = {:s}', '', 0, 0, { s }).length;
  return e.json(200, { token: !!L.BGG_TOKEN(), waiting: c('wartet'), done: c('fertig'), failed: c('fehler') });
}, $apis.requireAuth('users'));

/* Hintergrund: jede Minute bis zu 20 Einträge in einer einzigen BGG-Anfrage ergänzen */
cronAdd('bgg-enrich', '* * * * *', () => {
  const L = require(`${__hooks}/lib.js`);
  if (!L.BGG_TOKEN() && !$os.getenv('BGG_BASE')) return;
  const jobs = $app.findRecordsByFilter('bgg_jobs', "status = 'wartet'", 'created', 20, 0);
  if (!jobs.length) return;
  let things = [];
  try { things = L.parseThings(L.bggGet('/thing?stats=1&id=' + jobs.map(j => j.getInt('bggId')).join(','))); }
  catch (err) { console.log('BGG-Ergänzung verschoben:', err); return; }
  const byId = {}; things.forEach(t => { byId[t.bggId] = t; });
  jobs.forEach(j => {
    const t = byId[j.getInt('bggId')];
    try {
      if (!t) throw new Error('Bei BGG nicht gefunden');
      const rec = $app.findRecordById('items', j.getString('item'));
      L.applyThing(rec, t, false);
      if (!rec.getString('cover')) { const f = L.coverFromURL(t.image); if (f) rec.set('cover', f); }
      // Erweiterung: Basisspiel zuordnen, wenn es schon im Regal steht
      if (rec.getString('kind') === 'exp' && !rec.getString('base')) {
        for (const b of t.bases) { try { rec.set('base', $app.findFirstRecordByFilter('items', 'bggId = {:id}', { id: b.id }).id); break; } catch (err) { } }
      }
      $app.save(rec);
      j.set('status', 'fertig');
    } catch (err) { j.set('status', 'fehler'); j.set('error', String(err).slice(0, 480)); }
    $app.save(j);
  });
});
