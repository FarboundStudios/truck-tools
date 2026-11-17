'use strict';
// Niveaux d'experience. Tables lues dans def/economy_data_xp.sii et def/bus_economy_data_xp.sii du jeu (30 premiers niveaux).
// Au-dela de la table, on suppose que chaque niveau coute autant que le dernier (estimation).
const data = require('./xp-data.json');

const MAX_LEVEL = { truck: 150, bus: 100 };

function table(mode) { return data[mode].levelXp; }

/** XP total necessaire pour atteindre `level` (niveau 0 = 0 XP). */
function levelToXp(mode, level) {
  const t = table(mode);
  let xp = 0;
  for (let i = 0; i < level; i++) xp += i < t.length ? t[i] : t[t.length - 1];
  return xp;
}

/** Niveau correspondant a un total d'XP. */
function xpToLevel(mode, xp) {
  const t = table(mode);
  let level = 0, rest = Number(xp);
  while (level < MAX_LEVEL[mode]) {
    const step = level < t.length ? t[level] : t[t.length - 1];
    if (rest < step) break;
    rest -= step; level++;
  }
  return level;
}

/** Donnees a transmettre a l'interface. */
function describe() {
  return {
    truck: { levelXp: table('truck'), maxLevel: MAX_LEVEL.truck, knownLevels: table('truck').length },
    bus: { levelXp: table('bus'), maxLevel: MAX_LEVEL.bus, knownLevels: table('bus').length },
  };
}

module.exports = { levelToXp, xpToLevel, describe, MAX_LEVEL };
