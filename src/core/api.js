'use strict';
// Facade utilisee par l'interface (Electron) et les tests.
const fs = require('fs');
const path = require('path');
const { openSave } = require('./save');
const { PROPS, validate } = require('./props');
const vehicles = require('./vehicles');
const xp = require('./xp');
const games = require('./games');

function backupFile(file) {
  const saveDir = path.dirname(file);
  const profileDir = path.dirname(path.dirname(saveDir));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(profileDir, '_trucktools_backups', path.basename(saveDir) + '_' + stamp);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(file, path.join(dir, path.basename(file)));
  return dir;
}

/** Charge une sauvegarde: proprietes, vehicules, remorques et tables d'XP. */
function loadSave(file, gameId) {
  const doc = openSave(file);
  const coach = gameId !== 'ats'; // les autocars n'existent que dans ETS2
  const props = PROPS.filter(p => coach || p.dlc !== 'coach').map(p => {
    const v = doc.get(p.unit, p.field);
    return { ...p, value: v === undefined ? null : v };
  });
  return {
    file,
    format: doc.format,
    coachSupported: coach,
    props,
    xp: xp.describe(),
    unitsSupported: doc.supportsUnits,
    vehicles: vehicles.listVehicles(doc).filter(v => coach || v.kind !== 'bus'),
    trailers: vehicles.listTrailers(doc),
  };
}

/**
 * Applique des modifications apres un backup. Refuse si le jeu tourne.
 *   changes = { props: { propId: valeur }, units: [ { unit: 'vehicle'|'trailer', id, values: { cle: valeur } } ] }
 */
function applyChanges(file, changes, opts = {}) {
  const { gameId, allowRunning = false } = opts;
  if (gameId && !allowRunning && games.isGameRunning(gameId)) throw new Error('GAME_RUNNING');
  const doc = openSave(file);
  const propEdits = [];
  const unitEdits = [];

  for (const [id, raw] of Object.entries(changes.props || {})) {
    const p = PROPS.find(x => x.id === id);
    if (!p) throw new Error('unknown property: ' + id);
    const v = validate(p, raw);
    if (doc.get(p.unit, p.field) === undefined) throw new Error('field missing in this save: ' + id);
    propEdits.push([p, v]);
  }
  if ((changes.units || []).length && !doc.supportsUnits) throw new Error('UNITS_UNSUPPORTED');
  for (const u of changes.units || []) {
    const table = u.unit === 'vehicle' ? vehicles.VEHICLE_FIELDS : u.unit === 'trailer' ? vehicles.TRAILER_FIELDS : null;
    if (!table) throw new Error('unknown unit type: ' + u.unit);
    const entry = doc.unitById(u.id);
    if (!entry || entry.type !== u.unit) throw new Error('unit not found: ' + u.id);
    for (const [key, value] of Object.entries(u.values || {})) {
      const spec = table[key];
      if (!spec) throw new Error('unknown field: ' + key);
      if (doc.getIn(entry, spec.field) === undefined) throw new Error('field missing: ' + spec.field);
      unitEdits.push({ type: u.unit, id: u.id, spec, sii: vehicles.toSiiValue(spec, value) });
    }
  }
  if (!propEdits.length && !unitEdits.length) return { changed: 0 };

  const backup = backupFile(file);
  for (const [p, v] of propEdits) doc.set(p.unit, p.field, v);
  for (const e of unitEdits) doc.setIn(doc.unitById(e.id), e.spec.field, e.sii);
  doc.save();

  const check = openSave(file); // relecture de controle
  for (const [p, v] of propEdits) {
    if (String(check.get(p.unit, p.field)) !== String(v)) throw new Error('VERIFY_FAILED:' + p.id + ':' + backup);
  }
  for (const e of unitEdits) {
    if (check.getIn(check.unitById(e.id), e.spec.field) !== e.sii) throw new Error('VERIFY_FAILED:' + e.spec.field + ':' + backup);
  }
  return { changed: propEdits.length + unitEdits.length, backup };
}

function rawFields(file, unit) { return openSave(file).fieldsOf(unit); }

module.exports = { ...games, loadSave, applyChanges, rawFields, backupFile, PROPS, xp };
