'use strict';
// Lecture/ecriture des fichiers .sii d'ETS2/ATS: texte, ScsC (chiffre + zlib), BSII (binaire).
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

// Cle AES-256 publique des fichiers ScsC (utilisee par tous les outils de sauvegarde SCS).
const SCSC_KEY = Buffer.from('2a5fcb1791d22fb60245b3d8369ed0b2c27371563fbf1f3c9edf6b11825a5d0a', 'hex');

function decryptScsc(buf) {
  const iv = buf.subarray(36, 52);
  const expected = buf.readUInt32LE(52);
  const d = crypto.createDecipheriv('aes-256-cbc', SCSC_KEY, iv);
  d.setAutoPadding(false);
  const raw = Buffer.concat([d.update(buf.subarray(56)), d.final()]);
  const out = zlib.inflateSync(raw);
  if (out.length !== expected) throw new Error('taille decompressee inattendue');
  return out;
}

/** Lit un .sii. Renvoie { kind: 'text'|'bsii', wrapper: 'plain'|'scsc', buffer, text? }. */
function readSiiFile(file) {
  let buf = fs.readFileSync(file);
  let wrapper = 'plain';
  if (buf.subarray(0, 4).toString('latin1') === 'ScsC') { buf = decryptScsc(buf); wrapper = 'scsc'; }
  if (buf.subarray(0, 4).toString('latin1') === 'BSII') return { kind: 'bsii', wrapper, buffer: buf };
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (!text.includes('SiiNunit')) throw new Error('fichier .sii non reconnu: ' + file);
  return { kind: 'text', wrapper, buffer: buf, text };
}

/** Ecriture atomique (fichier temporaire puis renommage). */
function writeFileAtomic(file, data) {
  const tmp = file + '.trucktools.tmp';
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

module.exports = { readSiiFile, writeFileAtomic, decryptScsc };
