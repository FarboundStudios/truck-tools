'use strict';
// Rend les visuels de partage (docs/social/*.html) en PNG x2:
//   node node_modules/electron/cli.js test/social-main.cjs
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const JOBS = [
  { html: 'share-landscape.html', out: 'truck-tools-share-landscape-1200x630.png', w: 1200, h: 630, z: 2 },
  { html: 'share-square.html', out: 'truck-tools-share-square-1080x1080.png', w: 1080, h: 1080, z: 1.25 },
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dir = path.join(__dirname, '..', 'docs', 'social');

app.on('window-all-closed', () => {}); // ne pas quitter entre deux rendus
app.whenReady().then(async () => {
  for (const j of JOBS) {
    let done = false;
    for (let attempt = 0; attempt < 3 && !done; attempt++) {
      try {
        const win = new BrowserWindow({ show: false, useContentSize: true, width: Math.round(j.w * j.z), height: Math.round(j.h * j.z) });
        await win.loadFile(path.join(dir, j.html));
        win.webContents.setZoomFactor(j.z);
        await sleep(1500);
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(dir, j.out), img.toPNG());
        const sz = img.getSize();
        console.log('OK', j.out, sz.width + 'x' + sz.height);
        win.destroy(); done = true;
      } catch (e) { console.log('retry', j.out, e.message); await sleep(800); }
    }
  }
  app.quit();
});
