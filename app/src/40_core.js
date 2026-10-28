(() => {
'use strict';

/* ---------- Werkzeuge ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');
const normAE = s => String(s ?? '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
/* „fluegel“ findet „Flügel“, „flugel“ auch */
const textMatch = (text, q) => norm(text).includes(norm(q)) || normAE(text).includes(normAE(q));
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => matchMedia('(max-width: 759.98px)').matches;

/* ---------- Datum (lokale Kalendertage, sommerzeitfest) ---------- */
const DAY = 864e5;
const T0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const day = n => addDays(T0, n);
const dnum = d => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - T0) / DAY);
const same = (a, b) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const maxD = arr => arr.reduce((m, d) => (!m || d > m ? d : m), null);
const sortDates = arr => arr.slice().sort((a, b) => a - b);
const DF = new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'short' });
const DFW = new Intl.DateTimeFormat('de-AT', { weekday: 'short', day: 'numeric', month: 'short' });
const DFL = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long' });
const DFY = new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'long', year: 'numeric' });
const MF = new Intl.DateTimeFormat('de-AT', { month: 'long', year: 'numeric' });
const fd = d => DF.format(d), fdw = d => DFW.format(d), fdl = d => DFL.format(d);
const tidy = s => String(s).replace(/\.\.(?=[\s“",)<]|$)/g, '.');
const ago = d => { const n = -dnum(d); return n <= 0 ? 'heute' : n === 1 ? 'gestern' : `vor ${n} Tagen`; };
const isoD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = v => { if (!v) return null; const [y, m, dd] = v.split('-').map(Number); return (y && m && dd) ? new Date(y, m - 1, dd) : null; };
/* „4., 11. oder 18. Dez.“ bzw. „18. Dez., 25. Dez. oder 1. Jän.“ */
function listDates(arr) {
  const ds = sortDates(arr);
  if (!ds.length) return '';
  const one = ds.every(d => d.getMonth() === ds[0].getMonth() && d.getFullYear() === ds[0].getFullYear());
  const parts = one ? ds.map((d, i) => (i === ds.length - 1 ? fd(d) : `${d.getDate()}.`)) : ds.map(fd);
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} oder ${parts[parts.length - 1]}`;
}
function rangeText(a, b) {
  if (!b) return `seit ${fd(a)}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()}.–${fd(b)}`;
  return `${fd(a)} – ${fd(b)}`;
}
const daysWord = n => (n === 1 ? '1 Tag' : `${n} Tage`);

/* ---------- Symbole ---------- */
const ICONS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  meeple: '<path fill="currentColor" stroke="none" d="M12 2.75c1.79 0 3.25 1.46 3.25 3.25 0 .98-.44 1.86-1.13 2.46 3.4.38 6.88 1.43 6.88 3.29 0 1.07-1.67 1.53-3.66 1.66l2.42 6.03c.26.66-.22 1.36-.92 1.36h-3.43L12 17.1l-3.41 3.7H5.16c-.7 0-1.18-.7-.92-1.36l2.42-6.03C4.67 13.28 3 12.82 3 11.75c0-1.86 3.48-2.91 6.88-3.29A3.24 3.24 0 0 1 8.75 6 3.25 3.25 0 0 1 12 2.75z"/>',
  glass: '<path d="M7 3.5h10M7 20.5h10M8 3.5c0 4.5 4 5 4 8.5s-4 4-4 8.5M16 3.5c0 4.5-4 5-4 8.5s4 4 4 8.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  shelf: '<path d="M3 20.5h18M3 11.5h18"/><rect x="5" y="4" width="4" height="7.5" rx="1"/><rect x="10.5" y="6" width="3.5" height="5.5" rx="1"/><rect x="15.5" y="3.5" width="3.5" height="8" rx="1"/><rect x="5" y="14.5" width="5" height="6" rx="1"/><rect x="12" y="13" width="3.5" height="7.5" rx="1"/>',
  box: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>',
  inbox: '<path d="M4 13.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7.5"/><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.6c.46-.07.93-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.6 6.7C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.5 4.6-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  cal: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  calplus: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M12 12.5v5M9.5 15h5"/>',
  chat: '<path d="M20.5 12a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.2-4.1A8.5 8.5 0 1 1 20.5 12z"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20.5a7 7 0 0 1 14 0"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 17 3.5-5"/>',
  logout: '<path d="M14.5 4.5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3.5"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
  userplus: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20.5a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
  puzzle: '<path d="M9.5 4.5a2 2 0 0 1 4 0V6H18v4.5h-1.5a2 2 0 0 0 0 4H18V19h-4.5v-1.5a2 2 0 0 0-4 0V19H5v-4.5h1.5a2 2 0 0 0 0-4H5V6h4.5z"/>',
  hand: '<path d="M7 11.5V6a1.5 1.5 0 0 1 3 0v4.5M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9a1.5 1.5 0 0 1 3 0v4.5a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L4 15a1.6 1.6 0 0 1 2.3-2.2L7 13.5"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
  bookmark: '<path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z"/>',
  camera: '<path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4.5" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8v12M12 8S10.5 3.6 8 4.5 9 8 12 8zM12 8s1.5-4.4 4-3.5S15 8 12 8z"/>',
  doc: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5M9 13h6M9 16.5h4"/>',
  ruler: '<path d="M3.5 15.5 15.5 3.5l5 5-12 12z"/><path d="m7 12 2 2M10 9l1.5 1.5M13 6l2 2"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>',
  layers: '<path d="m12 3.5 8.5 4.5L12 12.5 3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>',
  print: '<path d="M7 9V3.5h10V9M7 17H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 17h-2"/><rect x="7" y="14" width="10" height="6.5" rx="1"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6v.2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>'
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[n]}</svg>`;
const BRAND = '<svg viewBox="0 0 28 28" aria-hidden="true" focusable="false"><rect x="3" y="10" width="7.5" height="12" rx="1.6" fill="var(--accent)"/><rect x="11.5" y="5" width="6.5" height="17" rx="1.6" fill="var(--sticker)"/><rect x="19" y="12.5" width="6" height="9.5" rx="1.6" fill="var(--brand-3)"/><rect x="1.5" y="22.5" width="25" height="2.5" rx="1.25" fill="currentColor"/></svg>';

/* ---------- Generative Platzhalter-Cover (im echten Betrieb: BGG-Cover bzw. eigenes Foto) ---------- */
const PALETTES = [
  ['#264653', '#2A9D8F', '#E9C46A', '#F4A261'],
  ['#3D5A80', '#98C1D9', '#E0FBFC', '#EE6C4D'],
  ['#5F0F40', '#9A031E', '#FB8B24', '#E36414'],
  ['#0B3954', '#BFD7EA', '#FF6663', '#FFD166'],
  ['#2B2D42', '#8D99AE', '#EDF2F4', '#EF233C'],
  ['#283618', '#606C38', '#FEFAE0', '#DDA15E'],
  ['#1D3557', '#457B9D', '#A8DADC', '#F1FAEE'],
  ['#6D597A', '#B56576', '#E56B6F', '#EAAC8B'],
  ['#003049', '#D62828', '#F77F00', '#FCBF49'],
  ['#14213D', '#FCA311', '#E5E5E5', '#FFFFFF'],
  ['#386641', '#6A994E', '#A7C957', '#F2E8CF'],
  ['#22223B', '#4A4E69', '#9A8C98', '#F2E9E4']
];
const PATTERNS = ['rings', 'tiles', 'stripes', 'dots', 'hills', 'arcs', 'sun', 'blocks'];
const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rngOf = seed => { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const f1 = n => Math.round(n * 10) / 10;
const coverCache = new Map();
const palOf = g => PALETTES[(g.pal ?? hash(g.title)) % PALETTES.length];
const tintOf = g => palOf(g)[0];
function coverSVG(g) {
  const key = (g.id || g.title) + '|' + g.title;
  if (coverCache.has(key)) return coverCache.get(key);
  const r = rngOf(hash(key));
  const P = palOf(g);
  const c = i => P[i % 4];
  const pick = () => P[1 + Math.floor(r() * 3)];
  const pat = g.pat || PATTERNS[hash(g.title) % PATTERNS.length];
  let s = '';
  if (pat === 'rings') {
    const cx = f1(18 + r() * 64), cy = f1(18 + r() * 64);
    [82, 66, 50, 34, 18].forEach((rad, i) => { s += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${c(1 + (i % 3))}"/>`; });
  } else if (pat === 'tiles') {
    const n = 4, sz = 20, gap = 3.5, off = (100 - (n * sz + (n - 1) * gap)) / 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (r() < .16) continue;
      s += `<rect x="${f1(off + x * (sz + gap))}" y="${f1(off + y * (sz + gap))}" width="${sz}" height="${sz}" rx="3.5" fill="${pick()}"/>`;
    }
  } else if (pat === 'stripes') {
    s += '<g transform="rotate(-32 50 50)">';
    for (let i = -3; i < 9; i++) s += `<rect x="-50" y="${i * 14}" width="200" height="${f1(6 + r() * 5)}" fill="${c(1 + ((i + 9) % 3))}"/>`;
    s += '</g>';
  } else if (pat === 'dots') {
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) s += `<circle cx="${10 + x * 20}" cy="${10 + y * 20}" r="${f1(2.5 + r() * 6.5)}" fill="${pick()}"/>`;
  } else if (pat === 'hills') {
    s += `<circle cx="${f1(22 + r() * 56)}" cy="${f1(22 + r() * 10)}" r="11" fill="${c(3)}"/>`;
    [[66, 1], [80, 2], [94, 1]].forEach(([y, ci]) => { s += `<ellipse cx="${f1(r() * 100)}" cy="${y}" rx="${f1(68 + r() * 22)}" ry="${f1(20 + r() * 9)}" fill="${c(ci)}"/>`; });
    s += `<ellipse cx="${f1(30 + r() * 40)}" cy="104" rx="80" ry="18" fill="${c(3)}" opacity=".55"/>`;
  } else if (pat === 'arcs') {
    const sz = 25;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const X = x * sz, Y = y * sz, k = Math.floor(r() * 4), fill = pick();
      const d = k === 0 ? `M${X} ${Y}H${X + sz}A${sz} ${sz} 0 0 1 ${X} ${Y + sz}Z`
        : k === 1 ? `M${X + sz} ${Y}V${Y + sz}A${sz} ${sz} 0 0 1 ${X} ${Y}Z`
        : k === 2 ? `M${X + sz} ${Y + sz}H${X}A${sz} ${sz} 0 0 1 ${X + sz} ${Y}Z`
        : `M${X} ${Y + sz}V${Y}A${sz} ${sz} 0 0 1 ${X + sz} ${Y + sz}Z`;
      s += `<path d="${d}" fill="${fill}"/>`;
    }
  } else if (pat === 'sun') {
    s += `<circle cx="50" cy="60" r="31" fill="${c(3)}"/>`;
    for (let i = 0; i < 5; i++) s += `<rect x="0" y="${63 + i * 7.5}" width="100" height="${f1(2 + i * .7)}" fill="${c(0)}"/>`;
    s += `<rect x="0" y="91" width="100" height="9" fill="${c(1)}"/><circle cx="${f1(14 + r() * 20)}" cy="${f1(14 + r() * 12)}" r="${f1(4 + r() * 4)}" fill="${c(2)}"/>`;
  } else {
    s += `<rect x="${f1(r() * 26)}" y="${f1(r() * 26)}" width="${f1(42 + r() * 26)}" height="${f1(42 + r() * 26)}" fill="${c(1)}"/>`;
    s += `<circle cx="${f1(42 + r() * 36)}" cy="${f1(42 + r() * 36)}" r="${f1(16 + r() * 13)}" fill="${c(2)}"/>`;
    s += `<path d="M${f1(r() * 36)} 100L100 ${f1(34 + r() * 46)}V100Z" fill="${c(3)}"/>`;
    s += `<rect x="${f1(64 + r() * 22)}" y="${f1(6 + r() * 16)}" width="9" height="${f1(28 + r() * 30)}" fill="${c(3)}"/>`;
  }
  const svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="100" height="100" fill="${c(0)}"/>${s}</svg>`;
  coverCache.set(key, svg);
  return svg;
}
/* Feine Puzzle-Schnittlinien über dem Motiv; jede Kachel bekommt eine eigene Muster-ID */
let svgUid = 0;
function jigsaw() {
  const id = 'jp' + (++svgUid);
  return `<defs><pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0V7C24.5 5.8 24.5 14.2 20 13V20M0 20H7C5.8 24.5 14.2 24.5 13 20H20" fill="none" stroke="rgba(0,0,0,.3)" stroke-width=".7"/><path d="M20.7 0V7.4M0 20.7H7.4" fill="none" stroke="rgba(255,255,255,.18)" stroke-width=".6"/></pattern></defs><rect width="100" height="100" fill="url(#${id})"/>`;
}
function coverEl(g, extra = '') {
  const pz = g.kind === 'puzzle';
  const inner = g.img ? `<img src="${esc(g.img)}" alt="">` : pz ? coverSVG(g).replace('</svg>', jigsaw() + '</svg>') : coverSVG(g);
  return `<span class="cover${pz ? ' puzzle' : ''}" style="--tint:${tintOf(g)}">${inner}${extra}</span>`;
}
/* Beispielfotos vom Spieleabend: weiches Licht, ein Tisch, eine Schachtel */
function photoURI(seed) {
  const r = rngOf(hash('foto' + seed)), P = PALETTES[seed % PALETTES.length];
  let c = '';
  for (let i = 0; i < 9; i++) c += `<circle cx="${f1(r() * 160)}" cy="${f1(r() * 80)}" r="${f1(8 + r() * 20)}" fill="${P[1 + Math.floor(r() * 3)]}" opacity="${f1(.35 + r() * .4)}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><defs><filter id="b"><feGaussianBlur stdDeviation="6"/></filter><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f2420"/><stop offset="1" stop-color="#6e4b33"/></linearGradient></defs><rect width="160" height="120" fill="url(#t)"/><g filter="url(#b)">${c}</g><rect y="80" width="160" height="40" fill="#5b3a26"/><rect x="${f1(34 + r() * 40)}" y="74" width="58" height="28" rx="3" fill="${P[0]}" transform="rotate(${f1(-8 + r() * 16)} 80 88)"/><rect x="${f1(14 + r() * 20)}" y="96" width="14" height="10" rx="2" fill="${P[2]}"/><rect x="${f1(118 + r() * 16)}" y="94" width="12" height="12" rx="2" fill="${P[3]}"/></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
