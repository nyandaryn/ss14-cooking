import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/web/medicine-groups.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { medicineGroups, medicineClassification, groupMedicines } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const index = JSON.parse(readFileSync(new URL('../public/data/index.json', import.meta.url)));
test('Each named medicine has exactly one primary category and tier', () => {
  const ids = medicineGroups.flatMap(g => [...g.basic, ...g.advanced]);
  assert.equal(new Set(ids).size, ids.length);
});
for (const fork of index) {
  const { catalog } = JSON.parse(readFileSync(new URL(`../public/data/data_${fork.id}.en.${fork.hashes.en}.json`, import.meta.url)));
  const medicines = catalog.reagents.filter(r => catalog.medicine.includes(r.id));
  test(`${fork.id}: categories preserve every available medicine exactly once`, () => {
    const actual = groupMedicines(medicines).flatMap(g => [...g.basicItems, ...g.advancedItems]).map(r => r.id);
    assert.deepEqual(actual.sort(), medicines.map(r => r.id).sort());
  });
  test(`${fork.id}: cryogenic basics precede advanced medicines and filtering stays scoped`, () => {
    const groups = groupMedicines(medicines, 'cryo');
    assert.equal(groups.length, 1);
    assert.ok(groups[0].basicItems.some(r => r.id === 'Cryoxadone'));
    assert.ok(groups[0].advancedItems.some(r => r.id === 'Doxarubixadone'));
    assert.deepEqual(groupMedicines(medicines.filter(r => r.id === 'Dexalin'), 'cryo'), []);
    const air = groupMedicines(medicines, 'airloss')[0];
    assert.ok(air.basicItems.some(r => r.id === 'Dexalin'));
    assert.ok(air.advancedItems.some(r => r.id === 'DexalinPlus'));
  });
}
test('New source medicines remain discoverable', () => {
  assert.deepEqual(medicineClassification('NewMedicine'), { group: 'other', tier: 'basic' });
  assert.equal(groupMedicines([{ id: 'NewMedicine' }])[0].basicItems[0].id, 'NewMedicine');
});
test('Narcotics get their own category; all remaining chemistry remains accessible', () => {
  const grouped = groupMedicines([{ id: 'NewDrug', group: 'Narcotics' }, { id: 'Water', group: 'Elements' }]);
  assert.equal(grouped.find(g => g.id === 'narcotics').basicItems[0].id, 'NewDrug');
  assert.equal(grouped.find(g => g.id === 'other').basicItems[0].id, 'Water');
});
