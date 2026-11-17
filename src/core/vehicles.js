'use strict';
// Vehicules et remorques (sauvegardes texte uniquement): lecture et modification de champs.
const NAMES = require('./vehicle-names.json');

const BRANDS = { daf: 'DAF', iveco: 'Iveco', man: 'MAN', mercedes: 'Mercedes-Benz', renault: 'Renault', scania: 'Scania', volvo: 'Volvo', ford: 'Ford', kenworth: 'Kenworth', peterbilt: 'Peterbilt', freightliner: 'Freightliner', mack: 'Mack', international: 'International', western_star: 'Western Star' };

/** Nom d'affichage d'un modele (ex. truck + volvo.fh16_2012 -> Volvo FH16 (2012)). Repli: mise en forme du code. */
function modelName(kind, token) {
  if (NAMES[kind + '/' + token]) return NAMES[kind + '/' + token];
  const [brand, ...rest] = String(token).split('.');
  const series = rest.join(' ').split('_').filter(Boolean).map(w => (w.length <= 3 && !/^\d+$/.test(w)) ? w.toUpperCase() : (/^\d{4}$/.test(w) ? '(' + w + ')' : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  return ((BRANDS[brand] || brand.charAt(0).toUpperCase() + brand.slice(1)) + ' ' + series).trim();
}

// Champs editables. type: plate | pct (0-100 affiche, 0..1 stocke) | uint | mass (kg, decimal)
const VEHICLE_FIELDS = {
  plate: { field: 'license_plate', type: 'plate' },
  fuel: { field: 'fuel_relative', type: 'pct' },
  odometer: { field: 'odometer', type: 'uint', max: 4294967295 },
  wearEngine: { field: 'engine_wear', type: 'pct' },
  wearTransmission: { field: 'transmission_wear', type: 'pct' },
  wearCabin: { field: 'cabin_wear', type: 'pct' },
  wearChassis: { field: 'chassis_wear', type: 'pct' },
};
const TRAILER_FIELDS = {
  plate: { field: 'license_plate', type: 'plate' },
  cargoMass: { field: 'cargo_mass', type: 'mass', max: 1000000 },
  cargoDamage: { field: 'cargo_damage', type: 'pct' },
  bodyWear: { field: 'trailer_body_wear', type: 'pct' },
};

/** Lit un flottant SII: decimal ou hexadecimal &3f800000. */
function parseGameFloat(s) {
  if (s === undefined || s === null) return NaN;
  s = String(s).trim();
  if (/^&[0-9a-fA-F]{8}$/.test(s)) { const b = Buffer.alloc(4); b.writeUInt32BE(parseInt(s.slice(1), 16)); return b.readFloatBE(0); }
  return Number(s);
}
const fmtFloat = x => String(Number(x.toPrecision(7)));

/** Decode les octets UTF-8 echappes (\\xc3\\xa9) que le jeu ecrit pour les caracteres non ASCII. */
function decodeSiiString(text) {
  if (!/\\x[0-9a-fA-F]{2}/.test(text)) return text;
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    const m = /^\\x([0-9a-fA-F]{2})/.exec(text.slice(i));
    if (m) { bytes.push(parseInt(m[1], 16)); i += 3; } else bytes.push(...Buffer.from(text[i], 'utf8'));
  }
  return Buffer.from(bytes).toString('utf8');
}

/** Plaque: "<balises>TEXTE</...>|pays" -> { text, country }. */
function parsePlate(raw) {
  if (raw === undefined) return null;
  let s = String(raw).trim();
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  const bar = s.lastIndexOf('|');
  const country = bar >= 0 ? s.slice(bar + 1) : '';
  const markup = bar >= 0 ? s.slice(0, bar) : s;
  let text = markup.replace(/<[^>]*>/g, '').replace(/\.$/, '').trim();
  text = decodeSiiString(text);
  return { text, country };
}

function formatPlate(text, country) {
  if (!/^[A-Za-z0-9 \-.]{1,14}$/.test(text)) throw new Error('invalid plate text');
  if (!/^[a-z_]{2,24}$/.test(country)) throw new Error('invalid plate country');
  return '"' + text + '|' + country + '"';
}

function vehicleKindOf(doc, entry) {
  // le chassis est decrit par un accessoire dont data_path = /def/vehicle/(truck|bus)/<marque>.<modele>/data.sii
  const lines = doc.fieldsIn(entry);
  for (const { name, value } of lines) {
    if (!/^accessories\[\d+\]$/.test(name)) continue;
    const acc = doc.unitById(value);
    if (!acc) continue;
    const dp = doc.getIn(acc, 'data_path');
    const m = dp && /\/def\/vehicle\/(truck|bus)\/([^/]+)\/data\.sii/.exec(dp);
    if (m) return { kind: m[1], model: m[2] };
  }
  return { kind: 'truck', model: '' };
}

function pctOf(doc, entry, field) {
  const v = parseGameFloat(doc.getIn(entry, field));
  return Number.isFinite(v) ? Math.round(v * 1000) / 10 : null;
}

function listVehicles(doc) {
  if (!doc.supportsUnits) return [];
  const active = new Set();
  const player = doc.unitsOf('player')[0];
  if (player) for (const f of ['assigned_truck', 'assigned_vehicles']) { const v = doc.getIn(player, f); if (v) active.add(v); }
  return doc.unitsOf('vehicle').map(e => {
    const k = vehicleKindOf(doc, e);
    return {
      id: e.id, kind: k.kind, model: k.model, name: modelName(k.kind, k.model), active: active.has(e.id),
      plate: parsePlate(doc.getIn(e, 'license_plate')),
      fuel: pctOf(doc, e, 'fuel_relative'),
      odometer: Number(doc.getIn(e, 'odometer')),
      wearEngine: pctOf(doc, e, 'engine_wear'), wearTransmission: pctOf(doc, e, 'transmission_wear'),
      wearCabin: pctOf(doc, e, 'cabin_wear'), wearChassis: pctOf(doc, e, 'chassis_wear'),
    };
  });
}

function listTrailers(doc) {
  if (!doc.supportsUnits) return [];
  return doc.unitsOf('trailer').map(e => ({
    id: e.id,
    plate: parsePlate(doc.getIn(e, 'license_plate')),
    cargoMass: parseGameFloat(doc.getIn(e, 'cargo_mass')),
    cargoDamage: pctOf(doc, e, 'cargo_damage'),
    bodyWear: pctOf(doc, e, 'trailer_body_wear'),
  }));
}

/** Convertit une valeur d'interface vers le texte SII. value: nombre, ou { text, country } pour une plaque. */
function toSiiValue(spec, value) {
  switch (spec.type) {
    case 'plate': return formatPlate(String(value.text).trim(), String(value.country).trim());
    case 'pct': { const n = Number(value); if (!(n >= 0 && n <= 100)) throw new Error('percentage 0..100 expected'); return fmtFloat(n / 100); }
    case 'uint': { const n = Number(value); if (!Number.isInteger(n) || n < 0 || n > spec.max) throw new Error('invalid integer'); return String(n); }
    case 'mass': { const n = Number(value); if (!(n >= 0 && n <= spec.max)) throw new Error('invalid mass'); return fmtFloat(n); }
    default: throw new Error('unknown field type');
  }
}

module.exports = { decodeSiiString, modelName, VEHICLE_FIELDS, TRAILER_FIELDS, listVehicles, listTrailers, toSiiValue, parsePlate, parseGameFloat };
