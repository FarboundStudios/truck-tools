'use strict';
// Truck Tools - interface. Vues: games, profiles, saves, edit, about.
const $ = sel => document.querySelector(sel);
const state = { view: 'games', game: null, profile: null, save: null, data: null, props: {}, units: new Map(), tab: 'base', filter: 'all', search: '', info: null };

// ---------- icones (grille 24, trait) ----------
const ICON_DEFS = {
  truck: { p: ['M2 17V6h12v11', 'M14 9h4.5L22 12.5V17h-1', 'M2 17h1.5', 'M8.5 17h7'], c: [[6, 17.5, 2.2], [18, 17.5, 2.2]] },
  bus: { p: ['M4 4h16v12H4z', 'M4 11h16', 'M6 16v3M18 16v3'], c: [[8, 13.5, .7], [16, 13.5, .7]] },
  trailer: { p: ['M2 7h14v9H2z', 'M16 14h5v2', 'M16 16h6'], c: [[6, 17.5, 2], [12, 17.5, 2]] },
  user: { p: ['M20 21a8 8 0 0 0-16 0'], c: [[12, 8, 4]] },
  disk: { p: ['M4 4h13l3 3v13H4z', 'M8 4v5h7V4', 'M8 20v-6h8v6'] },
  sliders: { p: ['M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0'], c: [[16, 6, 2], [10, 12, 2], [18, 18, 2]] },
  info: { p: ['M12 11v6'], c: [[12, 12, 9], [12, 7.6, .5]] },
  coin: { p: ['M9 9.5c.5-1 1.5-1.5 3-1.5s2.5.7 2.5 1.8-1 1.6-2.5 2-2.5.9-2.5 2.1 1 1.8 2.5 1.8 2.5-.5 3-1.5', 'M12 6v2M12 16v2'], c: [[12, 12, 9]] },
  bolt: { p: ['M13 2 5 13h6l-1 9 8-11h-6z'] },
  refresh: { p: ['M20 12a8 8 0 1 1-2.5-5.8', 'M20 4v4h-4'] },
  shield: { p: ['M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z', 'm9 12 2 2 4-4'] },
  search: { p: ['m20 20-4-4'], c: [[11, 11, 7]] },
  chev: { p: ['m9 6 6 6-6 6'] },
  github: { p: ['M9 19c-4 1.5-4-2-6-2m12 4v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21'] },
  heart: { p: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z'] },
  out: { p: ['M7 17 17 7', 'M8 7h9v9'] },
  check: { p: ['m5 12 5 5 9-10'] },
  home: { p: ['M3 11 12 3l9 8', 'M5 10v10h14V10'] },
  globe: { p: ['M3 12h18', 'M12 3a14 14 0 0 1 0 18', 'M12 3a14 14 0 0 0 0 18'], c: [[12, 12, 9]] },
  download: { p: ['M12 4v11', 'm7 11 5 5 5-5', 'M5 20h14'] },
};
function icon(name) {
  const d = ICON_DEFS[name] || ICON_DEFS.info;
  const svg = svgEl('svg', { viewBox: '0 0 24 24' });
  for (const p of d.p || []) svg.append(svgEl('path', { d: p }));
  for (const [cx, cy, r] of d.c || []) svg.append(svgEl('circle', { cx, cy, r }));
  return svg;
}

const SKILL_ICONS = { distance: '🗺️', valuable: '💎', fragile: '🥚', urgent: '⏱️', eco: '🌿', adr: '☣️', longduty: '🛣️', schedule: '⏱️', premium: '⭐', comfort: '🪶', darling: '💛' };
const SKILL_KEY = { distance: 'skill.distance', valuable: 'skill.valuable', fragile: 'skill.fragile', urgent: 'skill.urgent', eco: 'skill.eco', adr: 'skill.adr', longduty: 'skill.longduty', schedule: 'skill.schedule', premium: 'skill.premium', comfort: 'skill.comfort', darling: 'skill.darling' };
const COUNTRIES = ['france', 'germany', 'netherlands', 'belgium', 'luxembourg', 'italy', 'spain', 'portugal', 'uk', 'ireland', 'switzerland', 'austria', 'poland', 'czech', 'slovakia', 'hungary', 'romania', 'bulgaria', 'greece', 'turkey', 'sweden', 'norway', 'denmark', 'finland', 'estonia', 'latvia', 'lithuania', 'russia', 'iceland', 'croatia', 'serbia', 'slovenia', 'usa'];
const COUNTRY_CODE = { france: 'F', germany: 'D', netherlands: 'NL', belgium: 'B', luxembourg: 'L', italy: 'I', spain: 'E', portugal: 'P', uk: 'GB', ireland: 'IRL', switzerland: 'CH', austria: 'A', poland: 'PL', czech: 'CZ', slovakia: 'SK', hungary: 'H', romania: 'RO', bulgaria: 'BG', greece: 'GR', turkey: 'TR', sweden: 'S', norway: 'N', denmark: 'DK', finland: 'FIN', estonia: 'EST', latvia: 'LV', lithuania: 'LT', russia: 'RUS', iceland: 'IS', croatia: 'HR', serbia: 'SRB', slovenia: 'SLO', usa: 'US' };
const ADR_VALUES = [0, 1, 3, 7, 15, 31, 63];

function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v; // CSSOM (compatible avec la CSP sans unsafe-inline)
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return e;
}
function svgEl(tag, attrs) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  return e;
}
const reveal = (node, i) => { node.classList.add('rv'); node.style.setProperty('--i', i); return node; };

let toastTimer = null;
function toast(msg, bad) {
  const box = $('#toast');
  box.replaceChildren(el('span', {}, msg)); box.className = (bad ? 'bad ' : '') + 'in';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.className = ''; }, bad ? 9000 : 5200);
}
function errText(raw) {
  if (raw === 'GAME_RUNNING' || raw === 'UNITS_UNSUPPORTED') return t('err.' + raw);
  if (raw.startsWith('VERIFY_FAILED:')) return t('err.VERIFY_FAILED', { path: raw.split(':').slice(2).join(':') });
  return raw;
}
async function call(p) {
  const r = await p;
  if (!r.ok) { toast(errText(r.error), true); return null; }
  return r.data;
}

const fmtDate = ms => new Date(ms).toLocaleString(currentLang, { dateStyle: 'medium', timeStyle: 'short' });
const fmtSize = b => (b / 1048576).toFixed(1) + ' MB';
const pendingCount = () => Object.keys(state.props).length + [...state.units.values()].reduce((n, u) => n + Object.keys(u.values).length, 0);
const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

// ---------- coque ----------
function renderRail() {
  const rail = $('#rail'); rail.replaceChildren();
  const logo = el('div', { class: 'logo' }); logo.append(icon('truck')); rail.append(logo);
  const items = [['games', 'home', 'nav.game', true], ['profiles', 'user', 'nav.profile', !!state.game], ['saves', 'disk', 'nav.save', !!state.profile], ['edit', 'sliders', 'step.edit', !!state.save]];
  for (const [view, ic, key, enabled] of items) {
    const b = el('button', { class: 'rbtn' + (state.view === view ? ' on' : ''), disabled: enabled ? undefined : 'disabled', onclick: () => go(view), 'aria-label': t(key) }, el('span', { class: 'tip' }, key === 'step.edit' ? t('step.edit').replace(/^\d+\.\s*/, '') : t(key)));
    b.prepend(icon(ic)); rail.append(b);
  }
  rail.append(el('div', { class: 'sp' }));
  const fb = el('button', { class: 'rbtn fb', onclick: () => window.tt.link('https://farboundstudios.com/'), 'aria-label': 'Farbound Studios' }, el('img', { src: 'assets/farbound-mark.svg', alt: 'Farbound Studios' }), el('span', { class: 'tip' }, t('made.by')));
  rail.append(fb);
  const about = el('button', { class: 'rbtn' + (state.view === 'about' ? ' on' : ''), onclick: () => go('about'), 'aria-label': t('nav.about') }, el('span', { class: 'tip' }, t('nav.about')));
  about.prepend(icon('info')); rail.append(about);
}
function renderCtx() {
  const c = $('#ctx'); c.replaceChildren();
  const chip = (label, value, view, enabled) => el('button', { class: 'chip2' + (enabled ? '' : ' empty'), onclick: enabled ? () => go(view) : undefined }, label + ' ', el('b', {}, value || '—'));
  c.append(chip(t('nav.game'), state.game && state.game.name, 'games', true), el('span', { class: 'sep' }, '/'),
    chip(t('nav.profile'), state.profile && state.profile.name, 'profiles', !!state.game), el('span', { class: 'sep' }, '/'),
    chip(t('nav.save'), state.save && saveTitle(state.save), 'saves', !!state.profile));
}
function setView(...nodes) {
  const v = $('#view'); v.replaceChildren(...nodes); v.scrollTop = 0;
  nodes.forEach((n, i) => { if (n && n.classList && !n.classList.contains('rv')) reveal(n, i); });
}
function go(view) {
  state.view = view; hideDock();
  renderRail(); renderCtx();
  ({ games: showGames, profiles: showProfiles, saves: showSaves, edit: showEditor, about: showAbout })[view]();
}
function pageHead(eyebrow, title, lead) {
  return el('div', {}, el('div', { class: 'eyebrow' }, eyebrow), el('h1', {}, title), lead ? el('p', { class: 'lead' }, lead) : null);
}

// ---------- jeux ----------
async function showGames() {
  Object.assign(state, { game: null, profile: null, save: null, data: null }); renderRail(); renderCtx();
  const games = await call(window.tt.games()); if (!games) return;
  const grid = el('div', { class: 'grid' });
  for (const g of games) {
    const count = g.found ? await call(window.tt.profiles(g.id)) : null;
    const art = svgEl('svg', { viewBox: '0 0 24 24', class: 'art' });
    for (const p of ICON_DEFS.truck.p) art.append(svgEl('path', { d: p }));
    for (const [cx, cy, r] of ICON_DEFS.truck.c) art.append(svgEl('circle', { cx, cy, r }));
    const tile = el('button', { class: 'tile press game ' + g.id + (g.found ? '' : ' off'), 'data-tilt': '', onclick: g.found ? () => { state.game = g; go('profiles'); } : undefined },
      art, el('div', { class: 'code' }, g.id.toUpperCase()), el('h3', {}, g.name),
      el('div', { class: 'cnt' }, g.found && count ? count.filter(p => p.hasSaves).length + ' ' + t('nav.profile').toLowerCase() + (count.filter(p => p.hasSaves).length > 1 ? 's' : '') : t('games.missing')),
      el('div', { class: 'path' }, g.dir));
    grid.append(tile);
  }
  setView(pageHead(t('step.game'), t('games.title'), t('games.sub')), grid);
  [...grid.children].forEach((n, i) => reveal(n, i + 2));
}

// ---------- profils ----------
async function showProfiles() {
  Object.assign(state, { profile: null, save: null, data: null }); renderRail(); renderCtx();
  const profs = await call(window.tt.profiles(state.game.id)); if (!profs) return;
  const grid = el('div', { class: 'grid' });
  profs.filter(p => p.hasSaves).forEach((p, i) => {
    const h = hue(p.name);
    const av = el('div', { class: 'avatar', style: `--h1:hsl(${h} 90% 62%);--h2:hsl(${(h + 50) % 360} 90% 58%)` }, el('span', {}, (p.name.match(/[\p{L}\p{N}]/u) || ['?'])[0].toUpperCase()));
    const tile = el('button', { class: 'tile press prof', 'data-tilt': '', onclick: () => { state.profile = p; go('saves'); } }, av,
      el('div', {}, el('h3', {}, p.name), el('div', { class: 'meta' }, el('span', { class: 'pill' + (p.source === 'steam_profiles' ? ' cloud' : '') }, p.source === 'steam_profiles' ? t('profiles.cloud') : t('profiles.local')),
        el('span', {}, t('profiles.saves', { n: p.saveCount })), el('span', {}, fmtDate(p.mtime)))));
    grid.append(reveal(tile, i + 2));
  });
  setView(pageHead(t('step.profile'), t('profiles.title'), t('step.profile.text')), grid);
  [...grid.children].forEach((n, i) => reveal(n, i + 2));
}

// ---------- sauvegardes ----------

// Nom lisible d'une sauvegarde: nom donne par le joueur (info.sii), sinon libelle selon le type de dossier.
function saveTitle(s) {
  let raw = (s.name || '').trim();
  if (/^@@noname/.test(raw)) raw = '';
  if (raw) return raw;
  const id = s.id;
  if (/^autosave_drive/.test(id)) return t('saves.k.drive');
  if (/^autosave_job/.test(id)) return t('saves.k.job');
  if (/^autosave/.test(id)) return t('saves.k.auto');
  if (id === 'quicksave') return t('saves.k.quick');
  if (/^multiplayer_backup/.test(id)) return t('saves.k.backup');
  if (/^\d+$/.test(id)) return t('saves.k.slot', { n: id });
  return id;
}
function inGameClock(s) {
  if (s.gameTime === null || s.gameTime === undefined) return '';
  const d = Math.floor(s.gameTime / 1440), m = s.gameTime % 1440;
  return t('saves.ingame', { d, hh: String(Math.floor(m / 60)).padStart(2, '0'), mm: String(m % 60).padStart(2, '0') });
}
const saveKind = id => /^multiplayer_backup/.test(id) ? 'backup' : /^autosave/.test(id) ? 'auto' : 'manual';
const saveIcon = k => ({ backup: 'shield', auto: 'refresh', manual: 'disk' })[k];

function segControl(items, current, onPick) {
  const seg = el('div', { class: 'seg' });
  const ind = el('i', { class: 'ind' }); seg.append(ind);
  const btns = items.map(([id, label]) => { const b = el('button', { class: id === current ? 'on' : '', 'data-id': id, type: 'button', onclick: () => { onPick(id); place(id); } }, label); seg.append(b); return b; });
  function place(id) {
    btns.forEach(b => b.classList.toggle('on', b.dataset.id === id));
    const b = btns.find(x => x.dataset.id === id);
    if (b) { ind.style.width = b.offsetWidth + 'px'; ind.style.transform = `translateX(${b.offsetLeft - 4}px)`; }
  }
  requestAnimationFrame(() => place(current)); setTimeout(() => place(current), 80);
  return seg;
}

async function showSaves() {
  Object.assign(state, { save: null, data: null }); renderRail(); renderCtx();
  const saves = await call(window.tt.saves(state.profile.dir)); if (!saves) return;
  const rows = el('div', { class: 'rows' });
  const draw = () => {
    rows.replaceChildren();
    const q = state.search.trim().toLowerCase();
    const list = saves.filter(s => (state.filter === 'all' || saveKind(s.id) === state.filter) && (!q || (s.id + ' ' + saveTitle(s)).toLowerCase().includes(q)));
    list.forEach((s, i) => {
      const k = saveKind(s.id);
      const ico = el('div', { class: 'ico' }); ico.append(icon(s.id === 'quicksave' ? 'bolt' : saveIcon(k)));
      const chev = el('span', { class: 'go' }); chev.append(icon('chev')); chev.firstChild.setAttribute('width', 20); chev.firstChild.setAttribute('height', 20);
      chev.firstChild.style.cssText = 'stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round';
      const row = el('button', { class: 'tile press row ' + (k === 'auto' ? 'auto' : k === 'backup' ? 'bk' : ''), 'data-glow': '', onclick: () => { state.save = s; state.tab = 'base'; go('edit'); } },
        ico, el('div', { class: 'tt' }, el('b', {}, saveTitle(s)), el('div', { class: 'sub2' }, [s.id !== saveTitle(s) ? s.id : null, inGameClock(s)].filter(Boolean).join(' · '))), el('div', { class: 'm' }, el('div', {}, fmtDate(s.fileTime || s.mtime)), el('div', {}, fmtSize(s.size)), chev));
      row.style.setProperty('--i', Math.min(i, 14)); row.classList.add('rv'); rows.append(row);
    });
  };
  const search = el('div', { class: 'search' }); search.append(icon('search'));
  const input = el('input', { type: 'text', placeholder: t('saves.search'), value: state.search });
  input.addEventListener('input', () => { state.search = input.value; draw(); });
  search.append(input);
  const seg = segControl([['all', t('saves.all')], ['auto', t('saves.auto')], ['manual', t('saves.manual')], ['backup', t('saves.backup')]], state.filter, id => { state.filter = id; draw(); });
  draw();
  setView(pageHead(t('step.save'), t('saves.title'), t('step.save.text')), el('div', { class: 'toolbar' }, search, seg), rows);
}

// ---------- edition: composants ----------
function numberInput(value, onChange, disabled) {
  const input = el('input', { type: 'text', class: 'in', inputmode: 'numeric', value: value === null || value === undefined ? '' : String(value), disabled: disabled ? 'disabled' : undefined });
  input.addEventListener('input', () => { input.classList.add('changed'); onChange(input.value.trim(), input); });
  return input;
}
function frow(label, input, hint) { return el('div', { class: 'f' }, el('label', {}, label), input, hint ? el('span', { class: 'hint' }, hint) : el('span', {})); }
function panel(title, ...kids) { return el('section', { class: 'tile panel', 'data-glow': '' }, el('h2', {}, title), ...kids); }

function skillCard(p) {
  const ranks = p.ranks;
  const toRank = v => p.kind === 'adr' ? Math.max(0, ADR_VALUES.indexOf(Number(v))) : Number(v);
  const toValue = r => p.kind === 'adr' ? ADR_VALUES[r] : r;
  const current = toRank(p.value);
  let shown = state.props[p.id] !== undefined ? toRank(state.props[p.id]) : current;
  const cells = el('div', { class: 'cells' });
  const card = el('div', { class: 'tile sk' + (p.value === null ? ' off' : ''), 'data-tilt': '' });
  const render = (poppedIdx) => {
    cells.replaceChildren();
    for (let i = 1; i <= ranks; i++) {
      const c = el('button', { type: 'button', class: 'cell' + (i <= shown ? ' on' : '') + (i === poppedIdx ? ' pop' : ''), onclick: () => {
        shown = (shown === i) ? i - 1 : i;
        if (shown === current) delete state.props[p.id]; else state.props[p.id] = String(toValue(shown));
        render(shown || 0); card.classList.toggle('lit', shown > 0); updateDock();
      } });
      cells.append(c);
    }
  };
  p.setShown = r => { shown = r; if (shown === current) delete state.props[p.id]; else state.props[p.id] = String(toValue(shown)); render(r); card.classList.toggle('lit', shown > 0); };
  render(); card.classList.toggle('lit', shown > 0);
  card.append(el('div', { class: 'hex' }, el('span', {}, SKILL_ICONS[p.icon])), cells, el('div', { class: 'nm' }, t(SKILL_KEY[p.icon])));
  return card;
}

function gaugeBlock(p) {
  const info = state.data.xp[p.mode];
  const per = info.levelXp, last = per[per.length - 1];
  const levelToXp = lv => { let x = 0; for (let i = 0; i < lv; i++) x += i < per.length ? per[i] : last; return x; };
  const xpToLevel = xp => { let lv = 0, rest = xp; while (lv < info.maxLevel) { const st = lv < per.length ? per[lv] : last; if (rest < st) break; rest -= st; lv++; } return lv; };
  const startXp = p.value === null ? null : Number(p.value);
  const dis = p.value === null;
  const levelIn = numberInput(dis ? '' : xpToLevel(startXp), () => {}, dis);
  const xpIn = numberInput(dis ? '' : startXp, () => {}, dis);
  levelIn.classList.remove('changed'); xpIn.classList.remove('changed');

  // jauge 270 degres
  const svg = svgEl('svg', { viewBox: '0 0 200 200' });
  const defs = svgEl('defs'); const lg = svgEl('linearGradient', { id: 'gg_' + p.id, x1: 0, y1: 0, x2: 1, y2: 1 });
  lg.append(svgEl('stop', { offset: 0, 'stop-color': '#ffb224' }), svgEl('stop', { offset: 1, 'stop-color': '#ff5d2a' })); defs.append(lg); svg.append(defs);
  const C = 2 * Math.PI * 80, ARC = C * .75;
  const trk = svgEl('circle', { class: 'trk', cx: 100, cy: 100, r: 80, transform: 'rotate(135 100 100)', 'stroke-dasharray': ARC + ' ' + C });
  const fil = svgEl('circle', { class: 'fil', cx: 100, cy: 100, r: 80, transform: 'rotate(135 100 100)', 'stroke-dasharray': ARC + ' ' + C, 'stroke-dashoffset': ARC, stroke: 'url(#gg_' + p.id + ')' });
  svg.append(trk, fil);
  for (let i = 0; i <= 27; i++) {
    const a = (135 + (270 / 27) * i) * Math.PI / 180, r1 = i % 3 === 0 ? 92 : 94, r2 = 99;
    svg.append(svgEl('line', { class: 'tick' + (i % 3 === 0 ? ' mj' : ''), x1: 100 + Math.cos(a) * r1, y1: 100 + Math.sin(a) * r1, x2: 100 + Math.cos(a) * r2, y2: 100 + Math.sin(a) * r2 }));
  }
  const needle = svgEl('g', { class: 'needle' }); needle.style.transform = 'rotate(-135deg)';
  needle.append(svgEl('line', { x1: 100, y1: 100, x2: 100, y2: 40 })); svg.append(needle, svgEl('circle', { class: 'hub', cx: 100, cy: 100, r: 6 }));
  const lvB = el('b', {}, dis ? '—' : '0');
  const gauge = el('div', { class: 'gauge' }, svg, el('div', { class: 'lv' }, lvB, el('small', {}, t('xp.level').toUpperCase())));
  const setGauge = lv => {
    const k = Math.min(1, lv / info.maxLevel);
    fil.style.strokeDashoffset = ARC * (1 - k); needle.style.transform = `rotate(${-135 + 270 * k}deg)`;
    FX.countUp(lvB, lv, 700);
  };
  if (!dis) setTimeout(() => setGauge(xpToLevel(startXp)), 350);

  const apply = xp => {
    if (!/^\d+$/.test(String(xp)) || Number(xp) > 4294967295) return;
    if (String(xp) === String(p.value)) delete state.props[p.id]; else state.props[p.id] = String(xp);
    const ch = state.props[p.id] !== undefined; xpIn.classList.toggle('changed', ch); levelIn.classList.toggle('changed', ch); updateDock();
  };
  levelIn.addEventListener('input', () => { const lv = Math.max(0, Math.min(info.maxLevel, parseInt(levelIn.value, 10) || 0)); xpIn.value = levelToXp(lv); apply(xpIn.value); setGauge(lv); });
  xpIn.addEventListener('input', () => { if (/^\d+$/.test(xpIn.value)) { const lv = xpToLevel(Number(xpIn.value)); levelIn.value = lv; apply(xpIn.value); setGauge(lv); } });
  const chips = el('div', { class: 'chips' });
  for (const lv of [10, 25, 50, 100, info.maxLevel].filter((v, i, a) => v <= info.maxLevel && a.indexOf(v) === i)) {
    chips.append(el('button', { class: 'chip', type: 'button', disabled: dis ? 'disabled' : undefined, onclick: () => { levelIn.value = lv; levelIn.dispatchEvent(new Event('input')); } }, lv === info.maxLevel ? t('xp.max') + ' · ' + lv : t('xp.level') + ' ' + lv));
  }
  return panel(t('prop.' + p.id), el('div', { class: 'xp' }, gauge, el('div', {},
    frow(t('xp.level'), levelIn), frow(t('xp.points'), xpIn, dis ? t('absent') : t('xp.current', { level: xpToLevel(startXp), xp: FX.fmt(startXp) })), chips,
    el('p', { class: 'hint', style: 'margin:14px 0 0' }, t('xp.estimated', { n: info.knownLevels })))));
}

function unitEdit(unit, id, key, value) {
  if (!state.units.has(id)) state.units.set(id, { unit, id, values: {} });
  const u = state.units.get(id);
  if (value === undefined) { delete u.values[key]; if (!Object.keys(u.values).length) state.units.delete(id); } else u.values[key] = value;
  updateDock();
}
function plateFields(unit, id, plate) {
  const text = el('input', { type: 'text', class: 'in', value: plate ? plate.text : '', maxlength: '14' });
  const country = el('input', { type: 'text', class: 'in', value: plate ? plate.country : '', list: 'countries', maxlength: '24' });
  const upd = () => {
    const changed = plate && (text.value.trim() !== plate.text || country.value.trim() !== plate.country);
    text.classList.toggle('changed', !!changed); country.classList.toggle('changed', !!changed);
    unitEdit(unit, id, 'plate', changed ? { text: text.value.trim(), country: country.value.trim().toLowerCase() } : undefined);
  };
  text.addEventListener('input', upd); country.addEventListener('input', upd);
  return [frow(t('v.plate'), text), frow(t('v.country'), country)];
}
function valueField(unit, id, key, label, current) {
  return frow(label, numberInput(current, (v, input) => { const same = v === String(current) || v === ''; input.classList.toggle('changed', !same); unitEdit(unit, id, key, same ? undefined : v); }));
}
function plateBadge(plate) {
  const code = plate && COUNTRY_CODE[plate.country] ? COUNTRY_CODE[plate.country] : '★';
  return el('span', { class: 'plate' }, el('i', {}, code), el('span', {}, plate ? plate.text : '—'));
}
function vehicleCard(kind, name, sub, plate, fieldRows, idx) {
  const vi = el('div', { class: 'vi' }); vi.append(icon(kind));
  const chev = el('span', { class: 'chev' }); const cv = icon('chev'); cv.style.cssText = 'width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round'; chev.append(cv);
  const d = el('details', { class: 'tile veh', 'data-glow': '' }, el('summary', {}, vi, el('div', {}, el('b', {}, name), el('div', { class: 'vm' }, sub)), el('div', { style: 'display:flex;gap:12px;align-items:center' }, plateBadge(plate), chev)),
    el('div', { class: 'body' }, el('div', { class: 'in-body' }, fieldRows)));
  d.style.setProperty('--i', Math.min(idx, 10)); d.classList.add('rv');
  return d;
}

function renderTab(which) {
  const d = state.data, box = el('div', {});
  const props = d.props.filter(p => p.dlc === which), sec = n => props.filter(p => p.section === n);
  let i = 0;
  const add = n => { box.append(reveal(n, i++)); };
  if (sec('economy').length) {
    add(panel(t('sec.economy'), ...sec('economy').map(p => frow(t('prop.' + p.id), numberInput(p.value, (v, input) => {
      const same = v === String(p.value) || v === ''; input.classList.toggle('changed', !same); if (same) delete state.props[p.id]; else state.props[p.id] = v; updateDock();
    }, p.value === null), p.value === null ? t('absent') : t('cur', { v: FX.fmt(p.value) })))));
  }
  for (const p of sec('xp')) add(gaugeBlock(p));
  if (sec('skills').length) {
    const skills = sec('skills');
    const head = el('div', { class: 'sk-head' }, el('h2', {}, t('sec.skills')),
      el('button', { class: 'chip', onclick: () => { skills.forEach(p => p.setShown && p.value !== null && p.setShown(p.ranks)); updateDock(); } }, t('skills.max')),
      el('button', { class: 'chip', onclick: () => { skills.forEach(p => p.setShown && p.value !== null && p.setShown(0)); updateDock(); } }, t('skills.reset')));
    const grid = el('div', { class: 'skills' });
    skills.forEach((p, k) => { const c = skillCard(p); c.classList.add('rv'); c.style.setProperty('--i', k); grid.append(c); });
    add(el('div', {}, head, grid));
  }
  const wantKind = which === 'coach' ? 'bus' : 'truck';
  const vs = d.vehicles.filter(v => v.kind === wantKind);
  const vwrap = el('div', {});
  vwrap.append(el('div', { class: 'sk-head' }, el('h2', { style: 'font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--amber);margin:0' }, t('sec.vehicles'))));
  if (!d.unitsSupported) vwrap.append(el('div', { class: 'warn' }, t('v.unsupported')));
  else if (!vs.length) vwrap.append(el('p', { class: 'hint' }, t('v.none')));
  else { vwrap.append(el('p', { class: 'note' }, t('v.note.plate'))); vs.forEach((v, k) => vwrap.append(vehicleCard(v.kind === 'bus' ? 'bus' : 'truck', v.name || v.model || '?', FX.fmt(v.odometer) + ' km', v.plate, [
    ...plateFields('vehicle', v.id, v.plate), valueField('vehicle', v.id, 'fuel', t('v.fuel'), v.fuel), valueField('vehicle', v.id, 'odometer', t('v.odometer'), v.odometer),
    valueField('vehicle', v.id, 'wearEngine', t('v.wearEngine'), v.wearEngine), valueField('vehicle', v.id, 'wearTransmission', t('v.wearTransmission'), v.wearTransmission),
    valueField('vehicle', v.id, 'wearCabin', t('v.wearCabin'), v.wearCabin), valueField('vehicle', v.id, 'wearChassis', t('v.wearChassis'), v.wearChassis)], k))); }
  add(vwrap);
  if (which === 'base' && d.unitsSupported) {
    const twrap = el('div', {}, el('div', { class: 'sk-head', style: 'margin-top:26px' }, el('h2', { style: 'font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--amber);margin:0' }, t('sec.trailers'))));
    if (!d.trailers.length) twrap.append(el('p', { class: 'hint' }, t('v.none')));
    d.trailers.forEach((tr, k) => twrap.append(vehicleCard('trailer', t('t.trailer') + ' ' + (k + 1), tr.cargoMass ? FX.fmt(Math.round(tr.cargoMass)) + ' kg' : '—', tr.plate, [
      ...plateFields('trailer', tr.id, tr.plate), valueField('trailer', tr.id, 'cargoMass', t('t.cargoMass'), tr.cargoMass), valueField('trailer', tr.id, 'cargoDamage', t('t.cargoDamage'), tr.cargoDamage), valueField('trailer', tr.id, 'bodyWear', t('t.bodyWear'), tr.bodyWear)], k)));
    add(twrap);
  }
  return box;
}

// ---------- dock d'enregistrement ----------
let dock = null, dockN = null, dockBtn = null;
function hideDock() { if (dock) { dock.remove(); dock = null; } }
function updateDock() {
  if (!dock) return;
  const n = pendingCount();
  dock.classList.toggle('show', n > 0);
  dockN.textContent = n;
}

async function showEditor() {
  renderRail(); renderCtx();
  state.props = {}; state.units = new Map();
  setView(el('p', { class: 'lead' }, t('edit.loading')));
  const data = await call(window.tt.load(state.save.file, state.game.id));
  if (!data) { setView(el('div', { class: 'warn bad' }, t('edit.failed')), el('button', { class: 'btn ghost', onclick: () => go('saves') }, t('btn.back'))); return; }
  state.data = data;
  const running = await call(window.tt.running(state.game.id));
  if (!data.coachSupported && state.tab === 'coach') state.tab = 'base';

  // synthese
  const money = data.props.find(p => p.id === 'money'), xpT = data.props.find(p => p.id === 'xp_truck'), xpB = data.props.find(p => p.id === 'xp_bus');
  const lvl = (p, mode) => { if (!p || p.value === null) return null; const per = data.xp[mode].levelXp; let lv = 0, rest = Number(p.value); while (lv < data.xp[mode].maxLevel) { const st = lv < per.length ? per[lv] : per[per.length - 1]; if (rest < st) break; rest -= st; lv++; } return lv; };
  const stat = (ic, label, value, unit) => { const v = el('div', { class: 'val' }, '0'); const s = el('div', { class: 'tile stat', 'data-glow': '' }, el('div', { class: 'lbl' }, label), v);
    s.firstChild.prepend(icon(ic)); if (typeof value === 'number') { FX.countUp(v, value, 1100); if (unit) v.after(); } else v.textContent = value; return s; };
  const hud = el('div', { class: 'hud' });
  if (money && money.value !== null) hud.append(stat('coin', t('hud.money'), Number(money.value)));
  if (lvl(xpT, 'truck') !== null) hud.append(stat('truck', t('hud.truck'), lvl(xpT, 'truck')));
  if (data.coachSupported && lvl(xpB, 'bus') !== null) hud.append(stat('bus', t('hud.coach'), lvl(xpB, 'bus')));
  if (data.unitsSupported) hud.append(stat('trailer', t('hud.vehicles'), data.vehicles.length + data.trailers.length));
  [...hud.children].forEach((n, k) => reveal(n, k + 1));

  const body = el('div', { id: 'tabbody' });
  const show = which => { state.tab = which; body.replaceChildren(renderTab(which)); };
  const tabs = el('div', { class: 'tabs' });
  const items = [['base', t('tab.base')]]; if (data.coachSupported) items.push(['coach', t('tab.coach')]);
  tabs.append(segControl(items, state.tab, show));

  const nodes = [pageHead(t('step.edit').replace(/^\d+\.\s*/, ''), t('edit.title', { name: saveTitle(state.save) }), t('edit.format', { format: data.format }))];
  if (running) nodes.push(el('div', { class: 'warn' }, '⚠ ' + t('warn.running', { game: state.game.name })));
  if (!data.coachSupported) nodes.push(el('p', { class: 'note' }, t('ats.note')));
  nodes.push(hud, tabs, body, el('datalist', { id: 'countries' }, COUNTRIES.map(c => el('option', { value: c }))));

  dockN = el('span', { class: 'n' }, '0');
  dockBtn = el('button', { class: 'btn primary', onclick: doSave }, t('btn.save'));
  dock = el('div', { class: 'dock' }, el('div', {}, dockN, el('div', { class: 't' }, t('hint.pending'))), dockBtn,
    el('button', { class: 'btn ghost', onclick: () => window.tt.open(state.profile.dir) }, t('btn.openFolder')));
  document.body.append(dock);
  setView(...nodes);
  show(state.tab);
}
async function doSave() {
  dockBtn.classList.add('busy'); dockBtn.replaceChildren(el('i', { class: 'spin' }), t('edit.saving'));
  const changes = { props: { ...state.props }, units: [...state.units.values()] };
  const res = await call(window.tt.apply(state.save.file, changes, state.game.id));
  if (res) {
    dockBtn.classList.remove('busy'); dockBtn.classList.add('done'); dockBtn.replaceChildren(icon('check'), ' ' + t('edit.saved'));
    dockBtn.firstChild.style.cssText = 'width:16px;height:16px;stroke:#04120b;fill:none;stroke-width:3;vertical-align:-3px;stroke-linecap:round;stroke-linejoin:round';
    toast(t('toast.saved', { n: res.changed, path: res.backup }));
    setTimeout(() => { dock.remove(); dock = null; go('edit'); }, 1000);
  } else { dockBtn.classList.remove('busy'); dockBtn.replaceChildren(t('btn.save')); }
}

// ---------- a propos ----------
const LINKS = { github: 'https://github.com/FarboundStudios/truck-tools', web: 'https://farboundstudios.com/', donate: 'https://buymeacoffee.com/farboundstudios' };
function linkCard(kind, ic, title, text) {
  const li = el('div', { class: 'li' }); li.append(icon(ic));
  const arrow = el('span', { class: 'arrow' }); const a = icon('out'); a.style.cssText = 'width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round'; arrow.append(a);
  return el('button', { class: 'tile press link ' + kind, 'data-glow': '', onclick: () => window.tt.link(LINKS[kind]), 'aria-label': title }, li, el('div', {}, el('h3', {}, title), el('p', {}, text)), arrow);
}
async function showAbout() {
  renderRail(); renderCtx();
  if (!state.info) state.info = await call(window.tt.info());
  const big = svgEl('svg', { viewBox: '0 0 24 24', class: 'big' });
  for (const p of ICON_DEFS.truck.p) big.append(svgEl('path', { d: p }));
  for (const [cx, cy, r] of ICON_DEFS.truck.c) big.append(svgEl('circle', { cx, cy, r }));
  const hero = el('div', { class: 'tile hero', 'data-glow': '' }, big, el('h3', {}, 'Truck Tools'), el('p', { class: 'lead', style: 'margin:0' }, t('about.tagline')),
    el('div', { class: 'kv' }, el('span', {}, t('about.version')), el('b', {}, state.info ? state.info.version : '—'), el('span', {}, t('about.author')), el('b', {}, 'Farbound Studios'), el('span', {}, 'Electron'), el('b', {}, state.info ? state.info.electron : '—')),
    el('p', { class: 'note', style: 'margin-top:22px' }, t('about.safe')),
    el('button', { class: 'madeby press', onclick: () => window.tt.link(LINKS.web), 'aria-label': t('made.by') }, el('span', {}, t('made.by')), el('img', { src: 'assets/farbound-lockup.png', alt: 'Farbound Studios' })));
  const side = el('div', {}, linkCard('github', 'github', t('about.github'), t('about.github.text')), linkCard('web', 'globe', t('about.web'), t('about.web.text')), linkCard('donate', 'heart', t('about.donate'), t('about.donate.text')), el('p', { class: 'legal' }, t('about.disclaimer')));
  setView(pageHead(t('nav.about'), t('about.title')), el('div', { class: 'about' }, hero, side), await updatePanel());
}


// ---------- mises a jour ----------
const upd = { info: null, busy: false, progress: 0, message: '', kind: '', ready: false };
let updRefs = null;

function renderBanner() {
  const b = $('#upd');
  if (!upd.info || !upd.info.available) { b.hidden = true; return; }
  b.hidden = false; b.replaceChildren(icon('download'), upd.busy ? t('upd.downloading', { p: Math.round(upd.progress * 100) }) : t('upd.banner', { v: upd.info.latest }));
  b.firstChild.style.cssText = 'width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round';
}
function paintUpdatePanel() {
  if (!updRefs || !updRefs.status.isConnected) return;
  const { status, notes, prog, bar, install, page, check } = updRefs;
  status.textContent = upd.message; status.className = 'upd-status ' + upd.kind;
  const info = upd.info, canInstall = info && info.available && info.asset && info.asset.sha256;
  notes.hidden = !(info && info.available && info.notes); notes.textContent = info && info.notes ? info.notes : '';
  prog.hidden = !upd.busy || !upd.progress; bar.style.width = Math.round(upd.progress * 100) + '%';
  install.hidden = !(canInstall && !upd.ready); install.disabled = upd.busy;
  page.hidden = !(info && info.available); check.disabled = upd.busy;
}
function setUpd(message, kind) { upd.message = message; upd.kind = kind || ''; paintUpdatePanel(); renderBanner(); }
async function doCheck() {
  if (upd.busy) return;
  upd.busy = true; upd.progress = 0; setUpd(t('upd.checking'));
  const r = await window.tt.update.check();
  upd.busy = false;
  if (!r.ok) { setUpd(t('upd.failed', { e: r.error }), 'bad'); return; }
  upd.info = r.data;
  if (r.data.none) setUpd(t('upd.none'));
  else if (!r.data.available) setUpd(t('upd.uptodate'), 'ok');
  else if (!r.data.asset) setUpd(t('upd.available', { v: r.data.latest }) + ' ' + t('upd.noasset'), 'new');
  else if (!r.data.asset.sha256) setUpd(t('upd.available', { v: r.data.latest }) + ' ' + t('upd.nodigest'), 'new');
  else setUpd(t('upd.available', { v: r.data.latest }), 'new');
}
async function doInstall() {
  if (upd.busy || !upd.info || !upd.info.asset) return;
  upd.busy = true; upd.progress = 0; setUpd(t('upd.downloading', { p: 0 }), 'new');
  const d = await window.tt.update.download();
  upd.busy = false;
  if (!d.ok) { setUpd(d.error === 'CHECKSUM' ? t('upd.checksum') : d.error === 'NO_DIGEST' ? t('upd.nodigest') : t('upd.failed', { e: d.error }), 'bad'); return; }
  const i = await window.tt.update.install();
  if (!i.ok) { setUpd(t('upd.failed', { e: i.error }), 'bad'); return; }
  upd.ready = true;
  if (i.data.mode === 'manual') setUpd(t('upd.manual', { path: i.data.path }), 'ok'); else setUpd(t('upd.restarting'), 'ok');
}
async function updatePanel() {
  const s = await call(window.tt.settings());
  const status = el('div', { class: 'upd-status' });
  const notes = el('pre', { class: 'upd-notes', hidden: 'hidden' });
  const bar = el('i'); const prog = el('div', { class: 'prog', hidden: 'hidden' }, bar);
  const check = el('button', { class: 'btn ghost', onclick: doCheck }, t('upd.check'));
  const install = el('button', { class: 'btn primary', hidden: 'hidden', onclick: doInstall }, t('upd.install'));
  const page = el('button', { class: 'btn ghost', hidden: 'hidden', onclick: () => window.tt.link(upd.info.pageUrl) }, t('upd.page'));
  const cb = el('input', { type: 'checkbox' }); cb.checked = !s || s.autoUpdate !== false;
  cb.addEventListener('change', () => window.tt.setSetting('autoUpdate', cb.checked));
  const auto = el('label', { class: 'sw' }, cb, el('i'), t('upd.auto'));
  updRefs = { status, notes, prog, bar, install, page, check };
  const panelNode = el('section', { class: 'tile upd-panel', 'data-glow': '' }, el('h3', {}, t('upd.title')),
    el('div', { class: 'hint' }, t('upd.current', { v: state.info ? state.info.version : '—' })), status, notes, prog, el('div', { class: 'row-btns' }, install, check, page, auto));
  panelNode.classList.add('rv'); panelNode.style.setProperty('--i', 3);
  paintUpdatePanel(); if (upd.message) status.textContent = upd.message;
  return panelNode;
}
function initUpdates() {
  window.tt.update.onAvailable(info => { upd.info = info; setUpd(t('upd.available', { v: info.latest }), 'new'); });
  window.tt.update.onProgress(p => { upd.progress = p; setUpd(t('upd.downloading', { p: Math.round(p * 100) }), 'new'); });
  $('#upd').addEventListener('click', () => { if (state.view !== 'about') go('about'); else doInstall(); });
}

// ---------- langue / demarrage ----------
function initLang() {
  const sel = $('#lang');
  for (const [code, name] of Object.entries(LANGS)) sel.append(el('option', { value: code }, name));
  sel.value = currentLang;
  sel.addEventListener('change', () => { setLang(sel.value); const keep = { p: state.props, u: state.units }; go(state.view); if (state.view === 'edit') setTimeout(() => { state.props = keep.p; state.units = keep.u; updateDock(); }, 900); });
}

FX.init();
initLang();
initUpdates();
renderRail(); renderCtx();
FX.boot().then(() => showGames());
