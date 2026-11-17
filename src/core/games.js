'use strict';
// Decouverte des jeux, profils et sauvegardes (ETS2 / ATS).
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { readSiiFile } = require('./container');
const { decodeSiiString } = require('./vehicles');

const GAMES = [
  { id: 'ets2', name: 'Euro Truck Simulator 2', docs: 'Euro Truck Simulator 2', exe: 'eurotrucks2.exe' },
  { id: 'ats', name: 'American Truck Simulator', docs: 'American Truck Simulator', exe: 'amtrucks.exe' },
];

function documentsDir() {
  return process.env.TRUCKTOOLS_DOCS || path.join(process.env.USERPROFILE || os.homedir(), 'Documents');
}

function gameDir(gameId, docs = documentsDir()) {
  const g = GAMES.find(x => x.id === gameId);
  if (!g) throw new Error('jeu inconnu: ' + gameId);
  return path.join(docs, g.docs);
}

function listGames(docs = documentsDir()) {
  return GAMES.map(g => ({ id: g.id, name: g.name, dir: path.join(docs, g.docs), found: fs.existsSync(path.join(docs, g.docs)) }));
}

function decodeProfileName(folder) {
  if (/^([0-9A-Fa-f]{2})+$/.test(folder)) {
    try { return Buffer.from(folder, 'hex').toString('utf8'); } catch (e) { /* nom brut */ }
  }
  return folder;
}

function listProfiles(gameId, docs = documentsDir()) {
  const base = gameDir(gameId, docs);
  const out = [];
  for (const src of ['profiles', 'steam_profiles']) {
    const dir = path.join(base, src);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (!fs.statSync(p).isDirectory()) continue;
      const saveDir = path.join(p, 'save');
      let saveCount = 0;
      if (fs.existsSync(saveDir)) { try { saveCount = fs.readdirSync(saveDir).length; } catch (e) { /* ignore */ } }
      out.push({ id: src + '/' + f, name: decodeProfileName(f), dir: p, source: src, mtime: fs.statSync(p).mtimeMs, hasSaves: saveCount > 0, saveCount });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

/** Nom donne par le joueur, date reelle et horloge du jeu, lus dans info.sii (vide si illisible). */
function readSaveInfo(file) {
  try {
    const doc = readSiiFile(file);
    if (doc.kind !== 'text') return {};
    const name = /^ name: (.*)$/m.exec(doc.text);
    const time = /^ time: (\d+)/m.exec(doc.text);
    const ft = /^ file_time: (\d+)/m.exec(doc.text);
    let label = name ? name[1].trim() : '';
    if (label.startsWith('"') && label.endsWith('"')) label = label.slice(1, -1);
    return { name: decodeSiiString(label), gameTime: time ? Number(time[1]) : null, fileTime: ft ? Number(ft[1]) * 1000 : null };
  } catch (e) { return {}; }
}

function listSaves(profileDir) {
  const dir = path.join(profileDir, 'save');
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    const file = path.join(dir, f, 'game.sii');
    if (!fs.existsSync(file)) continue;
    const st = fs.statSync(file);
    out.push({ id: f, file, mtime: st.mtimeMs, size: st.size, ...readSaveInfo(path.join(dir, f, 'info.sii')) });
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

function isGameRunning(gameId) {
  const g = GAMES.find(x => x.id === gameId);
  if (!g) return false;
  try {
    const out = execFileSync('tasklist', ['/FI', 'IMAGENAME eq ' + g.exe, '/NH'], { encoding: 'utf8', windowsHide: true });
    return out.toLowerCase().includes(g.exe);
  } catch (e) { return false; }
}

module.exports = { GAMES, listGames, listProfiles, listSaves, isGameRunning, decodeProfileName, documentsDir, gameDir };
