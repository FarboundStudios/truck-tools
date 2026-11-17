'use strict';
// Captures d'ecran de l'interface sur des donnees FICTIVES (aucune donnee personnelle):
//   node node_modules/electron/cli.js test/shot-main.cjs <dossier-de-sortie> [langue]
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { buildDemo } = require('./demo-data');

// Faux dossier Documents (doit etre defini avant le chargement du noyau)
const docs = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-demo-'));
buildDemo(docs);
process.env.TRUCKTOOLS_DOCS = docs;
const api = require('../src/core/api');

const handle = (ch, fn) => ipcMain.handle(ch, async (_e, ...a) => { try { return { ok: true, data: await fn(...a) }; } catch (e) { return { ok: false, error: e.message }; } });
handle('games:list', () => api.listGames());
handle('profiles:list', g => api.listProfiles(g));
handle('saves:list', d => api.listSaves(d));
handle('save:load', (f, g) => api.loadSave(f, g));
handle('save:apply', () => ({ changed: 1, backup: 'backup' }));
handle('game:running', () => false);
handle('shell:open', () => null);
handle('app:info', () => ({ name: 'Truck Tools', version: require('../package.json').version, electron: process.versions.electron }));
handle('link:open', () => null);
handle('settings:get', () => ({ autoUpdate: true }));
handle('settings:set', () => ({ autoUpdate: true }));
handle('update:check', () => ({ available: false }));

const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const errors = [];
  try {
    const out = path.resolve(process.argv[2] || 'shots');
    const lang = process.argv[3] || 'en';
    fs.mkdirSync(out, { recursive: true });
    const win = new BrowserWindow({ show: false, width: 1360, height: 860, webPreferences: { preload: path.join(__dirname, '..', 'electron', 'preload.cjs'), contextIsolation: true, sandbox: true } });
    win.webContents.on('console-message', (_e, level, msg) => { if (level >= 3) errors.push(msg); });
    await win.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
    const run = c => win.webContents.executeJavaScript(c);
    await run(`localStorage.setItem('tt.lang','${lang}')`); await win.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
    const shot = async name => { await sleep(2600); fs.writeFileSync(path.join(out, name + '.png'), (await win.webContents.capturePage()).toPNG()); };
    await sleep(3500); await shot('1-games');
    await run("document.querySelector('.game').click()"); await sleep(1500); await shot('2-profiles');
    await run("[...document.querySelectorAll('.prof')].find(e=>e.textContent.includes('Demo Driver')).click()"); await sleep(1500); await shot('3-saves');
    await run("[...document.querySelectorAll('.row')].find(r=>r.querySelector('.sub2').textContent.startsWith('autosave ')).click()"); await sleep(3500); await shot('4-editor');
    await run("document.querySelector('.skills').scrollIntoView({block:'center'})"); await shot('5-skills');
    await run("document.querySelector('.seg button[data-id=coach]').click()"); await sleep(900);
    await run("document.querySelector('#view').scrollTop=0"); await shot('6-coaches');
    await run("const v=document.querySelector('.veh'); v.open=true; v.scrollIntoView({block:'start'})"); await shot('7-vehicles');
    await run("document.querySelector('.rbtn:last-child').click()"); await sleep(1500); await shot('8-about');
  } catch (e) { console.log('ECHEC', e.message); }
  console.log('ERREURS:', errors.length ? errors.join(' ; ') : 'aucune');
  fs.rmSync(docs, { recursive: true, force: true });
  app.quit();
});
