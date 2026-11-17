'use strict';
// Catalogue des proprietes editables.
//  dlc  : 'base' (jeu initial) ou 'coach' (DLC Coaches / mode autocar)
//  kind : 'int' (nombre libre), 'skill' (rang 0..max, affiche en pastilles), 'adr' (masque de bits, 0..6 classes), 'xp' (niveau <-> points)
//  Les libelles sont traduits dans l'interface (cle "prop.<id>").
const PROPS = [
  // --- Jeu initial ---
  { id: 'money', dlc: 'base', section: 'economy', kind: 'int', unit: 'bank', field: 'money_account', min: 0, max: 9007199254740991 },
  { id: 'loan_limit', dlc: 'base', section: 'economy', kind: 'int', unit: 'bank', field: 'loan_limit', min: 0, max: 2147483647 },
  { id: 'xp_truck', dlc: 'base', section: 'xp', kind: 'xp', mode: 'truck', unit: 'economy', field: 'experience_points', min: 0, max: 4294967295 },
  { id: 'skill_adr', dlc: 'base', section: 'skills', kind: 'adr', unit: 'economy', field: 'adr', min: 0, max: 63, ranks: 6, icon: 'adr' },
  { id: 'skill_long_dist', dlc: 'base', section: 'skills', kind: 'skill', unit: 'economy', field: 'long_dist', min: 0, max: 6, ranks: 6, icon: 'distance' },
  { id: 'skill_heavy', dlc: 'base', section: 'skills', kind: 'skill', unit: 'economy', field: 'heavy', min: 0, max: 6, ranks: 6, icon: 'valuable' },
  { id: 'skill_fragile', dlc: 'base', section: 'skills', kind: 'skill', unit: 'economy', field: 'fragile', min: 0, max: 6, ranks: 6, icon: 'fragile' },
  { id: 'skill_urgent', dlc: 'base', section: 'skills', kind: 'skill', unit: 'economy', field: 'urgent', min: 0, max: 6, ranks: 6, icon: 'urgent' },
  { id: 'skill_mechanical', dlc: 'base', section: 'skills', kind: 'skill', unit: 'economy', field: 'mechanical', min: 0, max: 6, ranks: 6, icon: 'eco' },
  // --- DLC Coaches (mode autocar) ---
  { id: 'xp_bus', dlc: 'coach', section: 'xp', kind: 'xp', mode: 'bus', unit: 'economy', field: 'bus_experience_points', min: 0, max: 4294967295 },
  { id: 'bus_long_duty', dlc: 'coach', section: 'skills', kind: 'skill', unit: 'economy', field: 'long_duty', min: 0, max: 3, ranks: 3, icon: 'longduty' },
  { id: 'bus_tight_schedule', dlc: 'coach', section: 'skills', kind: 'skill', unit: 'economy', field: 'tight_schedule', min: 0, max: 3, ranks: 3, icon: 'schedule' },
  { id: 'bus_premium', dlc: 'coach', section: 'skills', kind: 'skill', unit: 'economy', field: 'satisfaction_decrease', min: 0, max: 3, ranks: 3, icon: 'premium' },
  { id: 'bus_comfort', dlc: 'coach', section: 'skills', kind: 'skill', unit: 'economy', field: 'low_acceleration', min: 0, max: 3, ranks: 3, icon: 'comfort' },
  { id: 'bus_darling', dlc: 'coach', section: 'skills', kind: 'skill', unit: 'economy', field: 'satisfaction_increase', min: 0, max: 3, ranks: 3, icon: 'darling' },
  { id: 'bus_eco', dlc: 'coach', section: 'skills', kind: 'skill', unit: 'economy', field: 'ecodriving', min: 0, max: 3, ranks: 3, icon: 'eco' },
];

const ADR_VALUES = [0, 1, 3, 7, 15, 31, 63];

function validate(prop, value) {
  const s = String(value).trim();
  if (!/^-?\d+$/.test(s)) throw new Error('integer expected: ' + prop.id);
  const n = BigInt(s);
  if (n < BigInt(prop.min) || n > BigInt(prop.max)) throw new Error('out of range (' + prop.min + '..' + prop.max + '): ' + prop.id);
  if (prop.kind === 'adr' && !ADR_VALUES.includes(Number(n))) throw new Error('invalid ADR mask: ' + s);
  return s;
}

module.exports = { PROPS, ADR_VALUES, validate };
