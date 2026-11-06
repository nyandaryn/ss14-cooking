import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/web/effect-description.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { describeEffect } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('Healing and harm preserve amounts, conditions, and probability', () => {
  const result = describeEffect({ '!type': 'HealthChange', damage: { types: { Piercing: -4, Blunt: 1 } }, conditions: [{ '!type': 'ReagentCondition', reagent: 'Drug', min: 20 }], probability: 0.2 }, true, () => 'Препарат');
  for (const part of ['Лечит 4', 'Наносит 1', 'Препарат: ≥ 20 u', '20%']) assert.ok(result.includes(part), result);
});
test('Group healing is a total, and cryogenic conditions are body temperature', () => {
  const result = describeEffect({ '!type': 'EvenHealthChange', damage: { Brute: -6 }, conditions: [{ '!type': 'TemperatureCondition', max: 273.15 }] }, true);
  assert.match(result, /Лечит 6/);
  assert.match(result, /суммарно по группе/);
  assert.match(result, /температура тела ≤ 273.15 K/);
});
test('Temperature effects are energy, not kelvin', () => {
  assert.match(describeEffect({ '!type': 'AdjustTemperature', amount: 80000 }, false), /80000 J/);
});
const index = JSON.parse(readFileSync(new URL('../public/data/index.json', import.meta.url)));
for (const fork of index) test(`${fork.id}: generated medicine effects retain source types and thresholds`, () => {
  const { catalog } = JSON.parse(readFileSync(new URL(`../public/data/data_${fork.id}.en.${fork.hashes.en}.json`, import.meta.url)));
  const effects = id => catalog.reagents.find(r => r.id === id).metabolisms.flatMap(m => m.effects);
  assert.ok(effects('Bicaridine').some(e => e['!type'] === 'EvenHealthChange' && e.damage.Brute === -1.5));
  assert.ok(effects('Dylovene').some(e => e.conditions?.some(c => c['!type'] === 'ReagentCondition' && c.min === 20)));
  assert.ok(effects('Cryoxadone').some(e => e.conditions?.some(c => c['!type'] === 'TemperatureCondition' && c.max === 273.15)));
  for (const r of catalog.reagents.filter(r => r.group === 'Medicine')) for (const m of r.metabolisms) for (const e of m.effects) {
    assert.ok(e['!type'], `${r.id}: lost YAML type tag`);
    const description = describeEffect(e, true);
    assert.ok(description && !description.includes('NaN') && !description.includes('[object Object]'), `${r.id}: ${description}`);
  }
});
test('Status defaults follow the game: update for two seconds', () => {
  assert.match(describeEffect({ '!type': 'ModifyStatusEffect', effectProto: 'StatusEffectDrowsiness' }, true), /Сонливость; Обновить, 2 с/);
  assert.ok(!describeEffect({ '!type': 'HealthChange', damage: { types: { Radiation: 0, Piercing: -2.5 } } }, true).includes('Радиация'));
});
