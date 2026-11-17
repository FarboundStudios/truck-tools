'use strict';
// Jeu de donnees fictif (profils + sauvegardes texte) pour les captures d'ecran et les essais.
// Aucune donnee reelle: tout est invente.
const fs = require('fs');
const path = require('path');

const hex = s => Buffer.from(s, 'utf8').toString('hex').toUpperCase();
const nid = (a, b, c) => `_nameless.${a}.${b}.${c}`;

function saveText({ trucks, buses, trailers, money, xpTruck, xpBus, skills, busSkills }) {
  const out = ['SiiNunit', '{'];
  out.push(`economy : ${nid('1a', '1000', '0001')} {`,
    ` experience_points: ${xpTruck}`, ` adr: ${skills.adr}`, ` long_dist: ${skills.long_dist}`, ` heavy: ${skills.heavy}`, ` fragile: ${skills.fragile}`,
    ` urgent: ${skills.urgent}`, ` mechanical: ${skills.mechanical}`, ` long_duty: ${busSkills[0]}`, ` tight_schedule: ${busSkills[1]}`, ` satisfaction_decrease: ${busSkills[2]}`,
    ` low_acceleration: ${busSkills[3]}`, ` satisfaction_increase: ${busSkills[4]}`, ` ecodriving: ${busSkills[5]}`, ` bus_experience_points: ${xpBus}`, '}');
  out.push(`bank : ${nid('1a', '1000', '0002')} {`, ` money_account: ${money}`, ' loan_limit: 500000', '}');
  out.push(`player : ${nid('1a', '1000', '0003')} {`, ' hq_city: lille', '}');
  const vehicles = [...trucks.map(t => ['truck', t]), ...buses.map(b => ['bus', b])];
  vehicles.forEach(([kind, v], i) => {
    out.push(`vehicle_accessory : ${nid('2b', '2000', String(i + 1).padStart(4, '0'))} {`, ` data_path: "/def/vehicle/${kind}/${v.model}/data.sii"`, '}');
    out.push(`vehicle : ${nid('2c', '3000', String(i + 1).padStart(4, '0'))} {`, ` engine_wear: ${v.wear}`, ` transmission_wear: ${v.wear}`, ` cabin_wear: ${v.wear}`, ` fuel_relative: ${v.fuel}`,
      ' accessories: 1', ` accessories[0]: ${nid('2b', '2000', String(i + 1).padStart(4, '0'))}`, ` odometer: ${v.km}`, ` license_plate: "${v.plate}|${v.country}"`, ` license_plate_type: ${kind}`, ` chassis_wear: ${v.wear}`, '}');
  });
  trailers.forEach((t, i) => out.push(`trailer : ${nid('3d', '4000', String(i + 1).padStart(4, '0'))} {`, ` cargo_mass: ${t.mass}`, ' cargo_damage: 0', ' trailer_body_wear: 0', ` license_plate: "${t.plate}|${t.country}"`, '}'));
  out.push('}', '');
  return out.join('\n');
}
const infoText = (name, time) => `SiiNunit\n{\nsave_container : ${nid('4e', '5000', '0001')} {\n name: ${name ? '"' + name + '"' : '""'}\n time: ${time}\n file_time: ${Math.floor(Date.now() / 1000)}\n version: 105\n info_version: 1\n dependencies: 0\n}\n}\n`;

function writeSave(root, profile, id, name, time, body) {
  const dir = path.join(root, profile, 'save', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'game.sii'), saveText(body));
  fs.writeFileSync(path.join(dir, 'info.sii'), infoText(name, time));
}

/** Cree un faux dossier Documents avec un profil ETS2 et un profil ATS. */
function buildDemo(docs) {
  const ets2 = path.join(docs, 'Euro Truck Simulator 2', 'profiles');
  const ats = path.join(docs, 'American Truck Simulator', 'profiles');
  const rich = {
    money: 1245800, xpTruck: 482150, xpBus: 38400, skills: { adr: 31, long_dist: 4, heavy: 5, fragile: 3, urgent: 6, mechanical: 2 }, busSkills: [1, 2, 0, 3, 1, 2],
    trucks: [
      { model: 'scania.s_2024e', plate: 'DX-482-QL', country: 'france', km: 48210, fuel: 0.82, wear: 0.03 },
      { model: 'volvo.fh16_2012', plate: 'HV 2042', country: 'germany', km: 312450, fuel: 0.45, wear: 0.12 },
      { model: 'daf.xf_euro6', plate: 'BX-91-LP', country: 'netherlands', km: 120980, fuel: 0.9, wear: 0.05 },
      { model: 'renault.etech_t', plate: 'FR-204-EV', country: 'france', km: 8120, fuel: 1, wear: 0 },
    ],
    buses: [
      { model: 'scania.touring_23', plate: 'CP-310-AB', country: 'france', km: 21870, fuel: 0.7, wear: 0.02 },
      { model: 'volvo.9700_23', plate: 'TR 9700', country: 'germany', km: 9540, fuel: 0.95, wear: 0.01 },
    ],
    trailers: [{ mass: 18400, plate: 'TR-118-AA', country: 'france' }, { mass: 0, plate: 'AB 4471', country: 'germany' }, { mass: 24100, plate: 'NL-55-XP', country: 'netherlands' }],
  };
  writeSave(ets2, hex('Demo Driver'), 'autosave', '', 120400, rich);
  writeSave(ets2, hex('Demo Driver'), 'autosave_drive_1', '', 120380, rich);
  writeSave(ets2, hex('Demo Driver'), 'quicksave', '', 119900, { ...rich, money: 1198400 });
  writeSave(ets2, hex('Demo Driver'), '1', 'Road to Calais', 99000, { ...rich, money: 540200, xpTruck: 210000 });
  writeSave(ets2, hex('Demo Driver'), '2', 'Before the convoy', 80000, { ...rich, money: 310000, xpTruck: 98000 });
  writeSave(ets2, hex('Night Hauler'), 'autosave', '', 20000, { ...rich, money: 90000, xpTruck: 12000, xpBus: 0 });
  writeSave(ats, hex('Highway Hauler'), 'autosave', '', 54000, { ...rich, trucks: [{ model: 'kenworth.w900', plate: 'ABC-1234', country: 'usa', km: 150200, fuel: 0.6, wear: 0.08 }], buses: [] });
  return docs;
}

module.exports = { buildDemo };
