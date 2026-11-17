'use strict';
// BSII (sauvegardes binaires SCS, version 3): lecture partielle + modification sur place de champs scalaires.
//
// On ne reconstruit PAS tout le fichier en texte (certains types lointains, ex. les vehicules, ne sont pas
// decodes de facon sure). On parcourt les blocs dans l'ordre jusqu'aux unites demandees (economy, bank...),
// qui sont decodees correctement, puis on patche les octets des champs voulus sans toucher au reste.

const TOKEN_CHARS = '\0' + '0123456789abcdefghijklmnopqrstuvwxyz_';
function tokenToString(v) {
  let s = '';
  while (v > 0n) { const c = Number(v % 38n); s += TOKEN_CHARS[c] || '?'; v /= 38n; }
  return s;
}

// type -> [genre, taille fixe] ; les types pairs (scalaire + 1) sont des tableaux (u32 nombre + elements).
const SCALAR = {
  0x01: ['string', 0], 0x03: ['token', 8], 0x05: ['f32', 4], 0x07: ['f32x2', 8], 0x09: ['f32x3', 12], 0x0b: ['f32x4', 16],
  0x11: ['s32x3', 12], 0x13: ['s32x4', 16], 0x17: ['f32x3', 12], 0x19: ['placement', 32],
  0x25: ['s32', 4], 0x27: ['u32', 4], 0x29: ['s16', 2], 0x2b: ['u16', 2], 0x2d: ['s8', 1], 0x2f: ['s32', 4],
  0x31: ['s64', 8], 0x33: ['u64', 8], 0x35: ['bool', 1], 0x37: ['enum', 4], 0x39: ['id', 0], 0x3b: ['id', 0], 0x3d: ['id', 0],
};

class Reader {
  constructor(buf) { this.buf = buf; this.p = 8; }
  u8() { return this.buf[this.p++]; }
  u32() { const v = this.buf.readUInt32LE(this.p); this.p += 4; return v; }
  str() { const n = this.u32(); const s = this.buf.toString('utf8', this.p, this.p + n); this.p += n; return s; }
}

function skipId(r) {
  const n = r.u8();
  if (n === 0) return;
  if (n === 0xff) { r.p += 8; return; }
  r.p += n * 8;
}

// Lit une valeur scalaire; les genres complexes renvoient null.
function readScalar(r, kind, enumNames) {
  const b = r.buf, p = r.p;
  switch (kind) {
    case 'string': { const n = b.readUInt32LE(p); const s = b.toString('utf8', p + 4, p + 4 + n); r.p += 4 + n; return s; }
    case 'token': r.p += 8; return tokenToString(b.readBigUInt64LE(p));
    case 'f32': r.p += 4; return b.readFloatLE(p);
    case 'u32': r.p += 4; return b.readUInt32LE(p);
    case 's32': r.p += 4; return b.readInt32LE(p);
    case 'u16': r.p += 2; return b.readUInt16LE(p);
    case 's16': r.p += 2; return b.readInt16LE(p);
    case 's8': r.p += 1; return b.readInt8(p);
    case 's64': r.p += 8; return b.readBigInt64LE(p);
    case 'u64': r.p += 8; return b.readBigUInt64LE(p);
    case 'bool': r.p += 1; return b[p] !== 0;
    case 'enum': { r.p += 4; const v = b.readUInt32LE(p); return (enumNames && enumNames.get(v)) || v; }
    case 'id': skipId(r); return null;
    case 'f32x2': r.p += 8; return null;
    case 'f32x3': case 's32x3': r.p += 12; return null;
    case 'f32x4': case 's32x4': r.p += 16; return null;
    case 'placement': r.p += 32; return null;
    default: throw new Error('genre BSII inconnu ' + kind);
  }
}

/**
 * Parcourt le fichier et renvoie les unites des types demandes.
 * unit = { type, fields: Map(name -> { kind, offset, size, value, isArray, count }) }
 * Avec opts.stopWhenFound, s'arrete des que tous les types demandes ont ete trouves (evite les zones mal decodees).
 */
function scanBsii(buf, wantedTypes, opts = {}) {
  if (buf.subarray(0, 4).toString('latin1') !== 'BSII') throw new Error('pas un BSII');
  const version = buf.readUInt32LE(4);
  if (version !== 3) throw new Error('version BSII non geree: ' + version);
  const r = new Reader(buf);
  const structs = new Map();
  const found = [];
  const want = new Set(wantedTypes);
  const remaining = new Set(wantedTypes);
  while (r.p < buf.length) {
    const blockType = r.u32();
    if (blockType === 0) {
      if (!r.u8()) break;
      const id = r.u32(), name = r.str(), fields = [];
      for (;;) {
        const t = r.u32(); if (t === 0) break;
        const fname = r.str(); let enumNames = null;
        if (t === 0x37 || t === 0x38) { const n = r.u32(); enumNames = new Map(); for (let i = 0; i < n; i++) { const v = r.u32(); enumNames.set(v, r.str()); } }
        fields.push({ t, name: fname, enumNames });
      }
      structs.set(id, { name, fields });
      continue;
    }
    const st = structs.get(blockType);
    if (!st) throw new Error('bloc BSII inconnu a l\'offset ' + (r.p - 4));
    const isWanted = want.has(st.name);
    skipId(r);
    const unit = { type: st.name, fields: new Map() };
    for (const f of st.fields) {
      const arr = f.t % 2 === 0;
      const def = SCALAR[arr ? f.t - 1 : f.t];
      if (!def) throw new Error('type BSII 0x' + f.t.toString(16) + ' (champ ' + st.name + '.' + f.name + ') non gere');
      const off = r.p;
      if (!arr) {
        const value = readScalar(r, def[0], f.enumNames);
        if (isWanted) unit.fields.set(f.name, { kind: def[0], offset: off, size: r.p - off, value, isArray: false });
      } else {
        const n = r.u32();
        const vals = isWanted ? [] : null;
        for (let i = 0; i < n; i++) { const v = readScalar(r, def[0], f.enumNames); if (vals && vals.length < 5000) vals.push(v); }
        if (isWanted) unit.fields.set(f.name, { kind: def[0], offset: off, size: r.p - off, value: vals, isArray: true, count: n });
      }
    }
    if (isWanted) { found.push(unit); remaining.delete(st.name); if (opts.stopWhenFound && remaining.size === 0) break; }
  }
  return found;
}

/** Ecrit une valeur dans un champ scalaire (meme taille d'octets). */
function patchScalar(buf, field, value) {
  if (field.isArray) throw new Error('modification de tableau non geree');
  const o = field.offset;
  switch (field.kind) {
    case 'u32': buf.writeUInt32LE(Number(value) >>> 0, o); break;
    case 's32': buf.writeInt32LE(Number(value) | 0, o); break;
    case 'u16': buf.writeUInt16LE(Number(value) & 0xffff, o); break;
    case 's16': buf.writeInt16LE(Number(value), o); break;
    case 's8': buf.writeInt8(Number(value), o); break;
    case 's64': buf.writeBigInt64LE(BigInt(value), o); break;
    case 'u64': buf.writeBigUInt64LE(BigInt(value), o); break;
    case 'f32': buf.writeFloatLE(Number(value), o); break;
    case 'bool': buf[o] = (value === true || value === 'true' || value === 1 || value === '1') ? 1 : 0; break;
    default: throw new Error('champ ' + field.kind + ' non modifiable');
  }
  field.value = (field.kind === 's64' || field.kind === 'u64') ? BigInt(value) : (field.kind === 'bool' ? !!buf[o] : Number(value));
}

module.exports = { scanBsii, patchScalar, tokenToString };
