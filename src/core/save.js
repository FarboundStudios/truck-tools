'use strict';
// SaveDoc: lecture/modification de champs d'une sauvegarde (game.sii), quel que soit son format.
const { readSiiFile, writeFileAtomic } = require('./container');
const { scanBsii, patchScalar } = require('./bsii');

// Unites utiles pour le mode binaire (parcours arrete des qu'elles sont trouvees)
const BSII_UNITS = ['economy', 'bank'];

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

class TextSave {
  constructor(file, doc) {
    this.file = file;
    this.text = doc.text;
    this.wrapper = doc.wrapper;
    this.format = doc.wrapper === 'scsc' ? 'ScsC (texte)' : 'texte';
    this.dirty = false;
    this.ranges = new Map();
  }

  range(unit) {
    if (this.ranges.has(unit)) return this.ranges.get(unit);
    const m = new RegExp('^' + escapeRe(unit) + ' : [^\\n{]*\\{[ \\t]*\\r?$', 'm').exec(this.text);
    if (!m) { this.ranges.set(unit, null); return null; }
    const start = m.index + m[0].length;
    const end = this.text.indexOf('\n}', start);
    const r = [start, end < 0 ? this.text.length : end];
    this.ranges.set(unit, r);
    return r;
  }

  fieldRe(field) { return new RegExp('^( ' + escapeRe(field) + ': )(.*?)(\\r?)$', 'm'); }

  get(unit, field) {
    const r = this.range(unit);
    if (!r) return undefined;
    const m = this.fieldRe(field).exec(this.text.slice(r[0], r[1]));
    return m ? m[2] : undefined;
  }

  set(unit, field, value) {
    const r = this.range(unit);
    if (!r) throw new Error('unite absente: ' + unit);
    const body = this.text.slice(r[0], r[1]);
    const re = this.fieldRe(field);
    if (!re.test(body)) throw new Error('champ absent: ' + unit + '.' + field);
    const nb = body.replace(re, (_, a, _b, cr) => a + String(value) + cr);
    this.text = this.text.slice(0, r[0]) + nb + this.text.slice(r[1]);
    this.ranges.clear();
    this.dirty = true;
  }

  // ---- acces par identifiant d'unite (vehicules, remorques...) ----
  get supportsUnits() { return true; }

  index() {
    if (this.idx) return this.idx;
    const list = [];
    const byId = new Map();
    const re = /^([A-Za-z_][A-Za-z0-9_]*) : ([^\s{]+) \{[ \t]*\r?$/gm;
    let m;
    while ((m = re.exec(this.text))) {
      const start = m.index + m[0].length;
      const e = { type: m[1], id: m[2], start, end: 0 };
      list.push(e);
      byId.set(e.id, e);
    }
    for (const e of list) { const end = this.text.indexOf('\n}', e.start); e.end = end < 0 ? this.text.length : end; }
    this.idx = { list, byId };
    return this.idx;
  }

  unitsOf(type) { return this.index().list.filter(e => e.type === type); }
  unitById(id) { return this.index().byId.get(id); }

  getIn(entry, field) {
    const m = this.fieldRe(field).exec(this.text.slice(entry.start, entry.end));
    return m ? m[2] : undefined;
  }

  fieldsIn(entry) {
    const out = [];
    const re = /^ ([A-Za-z0-9_]+(?:\[\d+\])?): (.*?)\r?$/gm;
    const body = this.text.slice(entry.start, entry.end);
    let m;
    while ((m = re.exec(body))) out.push({ name: m[1], value: m[2] });
    return out;
  }

  setIn(entry, field, value) {
    const body = this.text.slice(entry.start, entry.end);
    const re = this.fieldRe(field);
    if (!re.test(body)) throw new Error('champ absent: ' + entry.type + '.' + field);
    const nb = body.replace(re, (_, a, _b, cr) => a + String(value) + cr);
    this.text = this.text.slice(0, entry.start) + nb + this.text.slice(entry.end);
    this.idx = null; this.ranges.clear();
    this.dirty = true;
  }

  /** Champs d'une unite (pour l'editeur avance). */
  fieldsOf(unit) {
    const r = this.range(unit);
    if (!r) return [];
    const out = [];
    for (const line of this.text.slice(r[0], r[1]).split('\n')) {
      const m = /^ ([A-Za-z0-9_]+(?:\[\d+\])?): (.*?)\r?$/.exec(line);
      if (m) out.push({ name: m[1], value: m[2] });
    }
    return out;
  }

  save() { writeFileAtomic(this.file, this.text); this.dirty = false; }
}

class BinSave {
  constructor(file, doc) {
    this.file = file;
    this.buf = Buffer.from(doc.buffer);
    this.wrapper = doc.wrapper;
    this.format = doc.wrapper === 'scsc' ? 'ScsC (binaire BSII)' : 'binaire BSII';
    this.dirty = false;
    this.units = new Map();
    for (const u of scanBsii(this.buf, BSII_UNITS, { stopWhenFound: true })) this.units.set(u.type, u);
  }

  get supportsUnits() { return false; } // vehicules/remorques: zone non decodee de facon sure en binaire

  field(unit, name) { const u = this.units.get(unit); return u && u.fields.get(name); }

  get(unit, name) {
    const f = this.field(unit, name);
    if (!f) return undefined;
    if (f.isArray) return '[' + f.count + ' elements]';
    return f.value === null ? '<complexe>' : String(f.value);
  }

  set(unit, name, value) {
    const f = this.field(unit, name);
    if (!f) throw new Error('champ absent: ' + unit + '.' + name);
    patchScalar(this.buf, f, value);
    this.dirty = true;
  }

  fieldsOf(unit) {
    const u = this.units.get(unit);
    if (!u) return [];
    return [...u.fields.entries()].filter(([, f]) => !f.isArray && f.value !== null).map(([name, f]) => ({ name, value: String(f.value) }));
  }

  // Ecrit en BSII non chiffre (le jeu le lit); hors champs modifies, le contenu reste identique octet pour octet.
  save() { writeFileAtomic(this.file, this.buf); this.dirty = false; }
}

function openSave(file) {
  const doc = readSiiFile(file);
  return doc.kind === 'text' ? new TextSave(file, doc) : new BinSave(file, doc);
}

module.exports = { openSave };
