'use strict';
// Genere build/icon.png (512x512) avec Electron: node node_modules/electron/cli.js build/make-icon.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb020"/><stop offset="1" stop-color="#ff7a00"/></linearGradient>
<radialGradient id="b" cx=".7" cy="0" r="1"><stop offset="0" stop-color="#16294a"/><stop offset="1" stop-color="#070b12"/></radialGradient></defs>
<rect width="512" height="512" rx="104" fill="url(#b)"/><rect x="10" y="10" width="492" height="492" rx="96" fill="none" stroke="#27e6ff" stroke-opacity=".35" stroke-width="4"/>
<g transform="translate(0 2)"><g fill="none" stroke="url(#g)" stroke-width="22" stroke-linejoin="round" stroke-linecap="round">
<path d="M70 330V170h190v160M260 330h20M260 205h95l55 70v55h-30"/><path d="M290 215h50l35 45h-85z" fill="#ffb020" fill-opacity=".3"/><path d="M70 330h25M150 330h110M360 330h20"/></g>
<g fill="#070b12" stroke="url(#g)" stroke-width="22"><circle cx="120" cy="340" r="32"/><circle cx="215" cy="340" r="32"/><circle cx="345" cy="340" r="32"/></g>
<path d="M410 270L500 235V330Z" fill="#27e6ff" opacity=".35"/></g>
</svg>`;
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 512, height: 512, useContentSize: true, webPreferences: { offscreen: false } });
  await win.loadURL('data:text/html,' + encodeURIComponent('<body style="margin:0;background:transparent">' + svg + '</body>'));
  await new Promise(r => setTimeout(r, 500));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  fs.writeFileSync(path.join(__dirname, 'icon.png'), img.toPNG());
  app.quit();
});
