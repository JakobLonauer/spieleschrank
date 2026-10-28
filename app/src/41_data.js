
/* ---------- Beispieldaten ---------- */
const GENRES = ['Familie', 'Strategie', 'Party', 'Kooperativ', 'Rätsel & Krimi', 'Zu zweit', 'Kartenspiel'];
const MOTIFS = ['Landschaft', 'Städte', 'Tiere', 'Kunst', 'Wimmelbild', 'Karten'];
const DIFF = { 1: 'leicht', 2: 'mittel', 3: 'anspruchsvoll' };
const AVC = ['#CFE6D8', '#F6D5BC', '#CADDF6', '#F3CFDB', '#E3D7F5', '#F5E3A8', '#D3E9C4', '#F2D9C9'];
const MAXDAYS = 21;      /* Höchstdauer: drei Wochen ab dem Abholtag */
const EXTDAYS = 14;      /* Verlängerung: einmal um zwei Wochen */
const FDEF = () => ({ players: null, time: null, avail: false, genres: [], diff: null, age: null, exp: false, gift: false });
const PFDEF = () => ({ pieces: null, avail: false, motifs: [], brands: [] });

/* Zustand der Oberfläche. Die Daten kommen nach dem Anmelden vom Server (siehe 47_api.js). */
const S = {
  user: null, view: 'app', tab: 'regal', mode: 'games', variant: 'switch', sort: 'mine', q: '',
  f: FDEF(), pf: PFDEF(), ort: null, expOpen: false,
  sheetView: null, form: {}, declining: null, popAnchor: null, undo: null,
  bgg: { q: '', loading: false, results: null, error: null },
  cat: { games: true, exps: true, puzzles: true, sort: 'az' },
  settings: { newWeeks: 3, link: '', owner: 'Jakob', title: 'Spieleschrank' },
  users: [], games: [], loans: [], gifts: [], photos: [], lists: {}, access: [], stats: {}, knownIds: {},
  ready: false, fileToken: ''
};
const L = (gameId, userId, status, o = {}) => ({ id: newId(), gameId, userId, status, extras: [], created: new Date(), start: null, ret: [], open: false, handed: null, returned: null, pub: true, msg: '', reason: '', seen: false, notified: false, ext: null, extended: false, photoHint: null, returnNote: '', ...o });
