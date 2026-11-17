'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { compareVersions, parseRelease } = require('../electron/updater.cjs');

test('comparaison de versions', () => {
  assert.equal(compareVersions('0.4.0', '0.3.1'), 1);
  assert.equal(compareVersions('v1.0.0', '0.9.9'), 1);
  assert.equal(compareVersions('0.3.1', '0.3.1'), 0);
  assert.equal(compareVersions('0.3.0', '0.3.1'), -1);
  assert.equal(compareVersions('0.10.0', '0.9.0'), 1);
});

const REL = {
  tag_name: 'v0.4.0', draft: false, prerelease: false, body: 'Notes',
  html_url: 'https://github.com/FarboundStudios/truck-tools/releases/tag/v0.4.0',
  assets: [
    { name: 'notes.txt', size: 1, browser_download_url: 'https://github.com/x', digest: null },
    { name: 'TruckTools-0.4.0-portable.exe', size: 1234, browser_download_url: 'https://github.com/FarboundStudios/truck-tools/releases/download/v0.4.0/TruckTools-0.4.0-portable.exe', digest: 'sha256:' + 'a'.repeat(64) },
  ],
};

test('release plus recente: asset portable et empreinte', () => {
  const r = parseRelease(REL, '0.3.1');
  assert.equal(r.available, true);
  assert.equal(r.latest, '0.4.0');
  assert.equal(r.asset.name, 'TruckTools-0.4.0-portable.exe');
  assert.equal(r.asset.sha256, 'a'.repeat(64));
});

test('deja a jour, brouillon ou prerelease: pas de mise a jour', () => {
  assert.equal(parseRelease(REL, '0.4.0').available, false);
  assert.equal(parseRelease({ ...REL, draft: true }, '0.1.0').available, false);
  assert.equal(parseRelease({ ...REL, prerelease: true }, '0.1.0').available, false);
});

test('sans empreinte: asset sans sha256 (installation automatique refusee plus tard)', () => {
  const r = parseRelease({ ...REL, assets: [{ ...REL.assets[1], digest: null }] }, '0.3.1');
  assert.equal(r.asset.sha256, null);
});

test('un asset au nom inattendu est ignore', () => {
  const r = parseRelease({ ...REL, assets: [{ name: 'evil.exe', size: 1, browser_download_url: 'https://github.com/x', digest: 'sha256:' + 'b'.repeat(64) }] }, '0.3.1');
  assert.equal(r.asset, null);
});

test('lien de page de release hors depot: repli sur la page des releases', () => {
  const r = parseRelease({ ...REL, html_url: 'https://evil.example/x' }, '0.3.1');
  assert.equal(r.pageUrl, 'https://github.com/FarboundStudios/truck-tools/releases');
});
