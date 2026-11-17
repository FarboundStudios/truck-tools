'use strict';
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const api = require('../src/core/api');
const updater = require('./updater.cjs');

let win = null;

// ---------- reglages (fichier JSON dans userData) ----------
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
function readSettings() {
  try { return { autoUpdate: true, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; } catch (e) { return { autoUpdate: true }; }
}
function writeSettings(s) {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: '#06080c',
    title: 'Truck Tools',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
}

// Chaque appel renvoie { ok, data } ou { ok:false, error } pour afficher les erreurs proprement dans l'interface.
function handle(channel, fn) {
  ipcMain.handle(channel, async (_e, ...args) => {
    try { return { ok: true, data: await fn(...args) }; }
    catch (err) { return { ok: false, error: err && err.message ? err.message : String(err) }; }
  });
}

handle('games:list', () => api.listGames());
handle('profiles:list', gameId => api.listProfiles(gameId));
handle('saves:list', profileDir => api.listSaves(profileDir));
handle('save:load', (file, gameId) => api.loadSave(file, gameId));
handle('save:apply', (file, changes, gameId) => api.applyChanges(file, changes, { gameId }));
handle('game:running', gameId => api.isGameRunning(gameId));
handle('shell:open', dir => shell.openPath(dir));
handle('app:info', () => ({ name: app.getName(), version: app.getVersion(), electron: process.versions.electron, portable: !!process.env.PORTABLE_EXECUTABLE_FILE }));

// Seuls ces liens peuvent etre ouverts dans le navigateur.
const ALLOWED_LINKS = new Set([
  'https://github.com/FarboundStudios/truck-tools',
  'https://farboundstudios.com/',
  'https://buymeacoffee.com/farboundstudios',
]);
const linkAllowed = url => ALLOWED_LINKS.has(url) || url.startsWith('https://github.com/FarboundStudios/truck-tools/releases');
handle('link:open', async url => {
  if (!linkAllowed(String(url))) throw new Error('lien non autorise');
  await shell.openExternal(url);
});

// ---------- mises a jour (releases GitHub) ----------
let lastCheck = null;
let downloaded = null;
async function runCheck() {
  lastCheck = await updater.checkForUpdate(app.getVersion());
  return lastCheck;
}
handle('update:check', () => runCheck());
handle('update:download', async () => {
  if (!lastCheck || !lastCheck.asset) throw new Error('NO_ASSET');
  downloaded = await updater.downloadUpdate(lastCheck.asset, p => { if (win && !win.isDestroyed()) win.webContents.send('update:progress', p); });
  return { file: downloaded };
});
handle('update:install', () => {
  if (!downloaded) throw new Error('NO_DOWNLOAD');
  return updater.installUpdate(downloaded, app);
});
handle('settings:get', () => readSettings());
handle('settings:set', (key, value) => {
  if (key !== 'autoUpdate' || typeof value !== 'boolean') throw new Error('reglage non autorise');
  const s = { ...readSettings(), [key]: value };
  writeSettings(s);
  return s;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  // verification silencieuse au demarrage (desactivable dans A propos)
  if (readSettings().autoUpdate) {
    setTimeout(async () => {
      try {
        const r = await runCheck();
        if (r.available && win && !win.isDestroyed()) win.webContents.send('update:available', r);
      } catch (e) { /* hors ligne: on ignore */ }
    }, 6000);
  }
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
