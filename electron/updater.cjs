'use strict';
// Mise a jour automatique via les "releases" GitHub de FarboundStudios/truck-tools.
//  - check: interroge l'API GitHub (aucune donnee personnelle envoyee) et compare les versions.
//  - download: telecharge l'exe portable et verifie son SHA-256 (champ "digest" de l'API GitHub).
//  - install: copie le nouvel exe a cote de l'ancien, relance, supprime l'ancien (version portable).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const REPO = 'FarboundStudios/truck-tools';
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const ASSET_RE = /^TruckTools-\d+\.\d+\.\d+[\w.-]*-portable\.exe$/i;
const ALLOWED_HOSTS = new Set(['github.com', 'api.github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com']);

/** Compare deux versions "x.y.z" (prefixe v accepte): -1, 0 ou 1. */
function compareVersions(a, b) {
  const pa = String(a).replace(/^v/i, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/i, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** Transforme la reponse de l'API GitHub en { available, latest, notes, pageUrl, asset }. */
function parseRelease(json, currentVersion) {
  if (!json || json.draft || json.prerelease || typeof json.tag_name !== 'string') return { available: false };
  const latest = json.tag_name.replace(/^v/i, '');
  const asset = (json.assets || []).find(a => ASSET_RE.test(a.name || ''));
  const digest = asset && typeof asset.digest === 'string' && /^sha256:[0-9a-f]{64}$/i.test(asset.digest) ? asset.digest.slice(7).toLowerCase() : null;
  return {
    available: compareVersions(latest, currentVersion) > 0,
    latest,
    notes: String(json.body || '').slice(0, 1500),
    pageUrl: typeof json.html_url === 'string' && json.html_url.startsWith(`https://github.com/${REPO}/`) ? json.html_url : `https://github.com/${REPO}/releases`,
    asset: asset ? { name: asset.name, size: asset.size, url: asset.browser_download_url, sha256: digest } : null,
  };
}

function checkUrlAllowed(u) {
  const url = new URL(u);
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) throw new Error('URL non autorisee: ' + url.hostname);
}

async function checkForUpdate(currentVersion) {
  const { net } = require('electron');
  const res = await net.fetch(API_URL, { headers: { 'User-Agent': 'TruckTools/' + currentVersion, Accept: 'application/vnd.github+json' } });
  if (res.status === 404) return { available: false, none: true }; // aucune release publiee
  if (!res.ok) throw new Error('GitHub: HTTP ' + res.status);
  return parseRelease(await res.json(), currentVersion);
}

/** Telecharge l'asset; onProgress(0..1). Renvoie le chemin du fichier verifie. */
async function downloadUpdate(asset, onProgress) {
  if (!asset || !ASSET_RE.test(asset.name)) throw new Error('NO_ASSET');
  if (!asset.sha256) throw new Error('NO_DIGEST'); // pas d'empreinte: on n'installe pas automatiquement
  checkUrlAllowed(asset.url);
  const { net } = require('electron');
  const res = await net.fetch(asset.url, { headers: { 'User-Agent': 'TruckTools' }, redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error('Telechargement: HTTP ' + res.status);
  checkUrlAllowed(res.url || asset.url);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trucktools-update-'));
  const file = path.join(dir, path.basename(asset.name));
  const out = fs.createWriteStream(file);
  const hash = crypto.createHash('sha256');
  const total = Number(res.headers.get('content-length')) || asset.size || 0;
  let got = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    hash.update(value); got += value.length;
    if (!out.write(value)) await new Promise(r => out.once('drain', r));
    if (total && onProgress) onProgress(Math.min(1, got / total));
  }
  await new Promise((r, j) => { out.end(); out.on('finish', r); out.on('error', j); });
  if (hash.digest('hex') !== asset.sha256) { fs.rmSync(dir, { recursive: true, force: true }); throw new Error('CHECKSUM'); }
  return file;
}

/**
 * Installe la mise a jour. Version portable: copie a cote de l'exe actuel puis relance.
 * Sinon (lancement en developpement): renvoie le chemin du fichier telecharge.
 */
function installUpdate(file, app) {
  const current = process.env.PORTABLE_EXECUTABLE_FILE;
  if (!current) return { mode: 'manual', path: file };
  const target = path.join(path.dirname(current), path.basename(file));
  if (target !== current) fs.copyFileSync(file, target);
  const removeOld = target !== current && ASSET_RE.test(path.basename(current));
  const script = [
    '@echo off',
    ':w', `tasklist /FI "PID eq ${process.pid}" 2>nul | find "${process.pid}" >nul && (timeout /t 1 >nul & goto w)`,
    ...(removeOld ? ['set n=0', ':d', `del /f /q "${current}" 2>nul`, `if exist "${current}" (set /a n+=1 & if %n% lss 15 (timeout /t 1 >nul & goto d))`] : []),
    `start "" "${target}"`,
    'del "%~f0"',
  ].join('\r\n');
  const cmdFile = path.join(os.tmpdir(), 'trucktools-update.cmd');
  fs.writeFileSync(cmdFile, script);
  spawn('cmd.exe', ['/c', cmdFile], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  app.quit();
  return { mode: 'restart' };
}

module.exports = { compareVersions, parseRelease, checkForUpdate, downloadUpdate, installUpdate, REPO };
