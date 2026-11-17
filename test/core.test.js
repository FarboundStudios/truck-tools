'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const api = require('../src/core/api');
const xp = require('../src/core/xp');
const { openSave } = require('../src/core/save');

function tmpProfile(text) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-'));
  const dir = path.join(root, 'profiles', '4D41', 'save', 'quicksave');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'game.sii');
  fs.writeFileSync(file, text);
  return { root, file };
}

const SAMPLE = [
  'SiiNunit', '{',
  'economy : _nameless.1.2.3 {', ' experience_points: 100', ' bus_experience_points: 5', ' adr: 1', ' long_duty: 0', ' ecodriving: 1', '}',
  'bank : _nameless.1.2.4 {', ' money_account: 500', ' loan_limit: 10', '}',
  'player : _nameless.1.2.5 {', ' assigned_truck: _nameless.9.9.1', '}',
  'vehicle_accessory : _nameless.8.8.1 {', ' data_path: "/def/vehicle/bus/scania.touring_23/data.sii"', '}',
  'vehicle : _nameless.9.9.1 {', ' fuel_relative: &3f000000', ' accessories: 1', ' accessories[0]: _nameless.8.8.1', ' odometer: 818',
  ' license_plate: "AB-123.<offset hshift=5><img src=/x.mat>|france"', ' license_plate_type: bus', '}',
  'trailer : _nameless.7.7.1 {', ' cargo_mass: 0', ' license_plate: "XY 99|germany"', '}',
  '}', '',
].join('\n');

test('lecture des proprietes et des vehicules', () => {
  const { file } = tmpProfile(SAMPLE);
  const r = api.loadSave(file);
  assert.equal(r.props.find(p => p.id === 'money').value, '500');
  assert.equal(r.props.find(p => p.id === 'bus_long_duty').value, '0');
  assert.equal(r.vehicles.length, 1);
  assert.equal(r.vehicles[0].kind, 'bus');
  assert.equal(r.vehicles[0].name, 'Scania Touring (2023)');
  assert.equal(r.vehicles[0].active, true);
  assert.equal(r.vehicles[0].plate.text, 'AB-123');
  assert.equal(r.vehicles[0].fuel, 50);
  assert.equal(r.trailers[0].plate.country, 'germany');
});

test('modification des proprietes + sauvegarde de secours', () => {
  const { file } = tmpProfile(SAMPLE);
  const res = api.applyChanges(file, { props: { xp_bus: '575700', money: '999', bus_eco: '3' } });
  assert.equal(res.changed, 3);
  assert.ok(fs.existsSync(res.backup));
  const doc = openSave(file);
  assert.equal(doc.get('economy', 'bus_experience_points'), '575700');
  assert.equal(doc.get('economy', 'ecodriving'), '3');
  assert.equal(doc.get('economy', 'experience_points'), '100');
});

test('modification plaque, carburant, masse de cargaison', () => {
  const { file } = tmpProfile(SAMPLE);
  api.applyChanges(file, { units: [
    { unit: 'vehicle', id: '_nameless.9.9.1', values: { plate: { text: 'HEAVY-01', country: 'france' }, fuel: 100, odometer: 5 } },
    { unit: 'trailer', id: '_nameless.7.7.1', values: { cargoMass: 24000 } },
  ] });
  const r = api.loadSave(file);
  assert.equal(r.vehicles[0].plate.text, 'HEAVY-01');
  assert.equal(r.vehicles[0].fuel, 100);
  assert.equal(r.vehicles[0].odometer, 5);
  assert.equal(r.trailers[0].cargoMass, 24000);
});

test('noms de modeles', () => {
  const { modelName } = require('../src/core/vehicles');
  assert.equal(modelName('truck', 'volvo.fh16_2012'), 'Volvo FH16 (2012)');
  assert.equal(modelName('truck', 'scania.s_2024e'), 'Scania S Electric (2024)');
  assert.equal(modelName('truck', 'daf.nouveau_2030'), 'DAF Nouveau (2030)');
});

test('validation', () => {
  const { file } = tmpProfile(SAMPLE);
  assert.throws(() => api.applyChanges(file, { props: { skill_heavy: '9' } }), /out of range|field missing/);
  assert.throws(() => api.applyChanges(file, { props: { money: 'abc' } }), /integer/);
  assert.throws(() => api.applyChanges(file, { props: { skill_adr: '2' } }), /ADR/);
  assert.throws(() => api.applyChanges(file, { units: [{ unit: 'vehicle', id: '_nameless.9.9.1', values: { plate: { text: '<b>', country: 'france' } } }] }), /plate/);
});

test('niveaux d XP', () => {
  assert.equal(xp.levelToXp('bus', 50), 235700);
  assert.equal(xp.levelToXp('bus', 100), 575700);
  assert.equal(xp.xpToLevel('bus', 575700), 100);
  assert.equal(xp.xpToLevel('truck', 0), 0);
  assert.equal(xp.xpToLevel('truck', 200), 1);
});

test('nom de profil decode depuis l hexadecimal', () => {
  assert.equal(api.decodeProfileName('4D554C54494A4F55455552'), 'MULTIJOUEUR');
});
