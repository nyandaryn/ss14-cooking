import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const index = JSON.parse(readFileSync('public/data/index.json'));
for (const fork of index) {
  const { catalog: c, entities } = JSON.parse(readFileSync(`public/data/data_${fork.id}.en.${fork.hashes.en}.json`));
  test(`${fork.id}: machines have sprite atlas coordinates`, () => {
    for (const id of ['VendingMachineSeeds', 'Autolathe', 'MedicalTechFab']) {
      const entity = entities.find(e => e.id === id);
      assert.ok(entity && entity.sprite.length === 2, id);
    }
  });
  test(`${fork.id}: muffin mold uses standard autolathe and inherited printing time`, () => {
    const r = c.manufacturing.find(r => r.id === 'FoodPlateMuffinTin');
    assert.equal(r.time, 0.4);
    assert.ok(r.materials.some(m => m.material.id === 'Steel' && m.amount === 50));
    assert.ok(r.machines.some(m => m.machine.id === 'Autolathe' && m.access === 'static'));
    assert.ok(r.machines.some(m => m.machine.id === 'AutolatheHyperConvection' && m.materialMultiplier === 0.5));
  });
  test(`${fork.id}: hacked and research recipes retain machine conditions`, () => {
    assert.ok(c.manufacturing.some(r => r.machines.some(m => m.access === 'emag')));
    if (fork.id === 'lust') assert.ok(c.manufacturing.some(r => r.machines.some(m => m.machine.id === 'MedicalTechFab' && m.access === 'emagResearch')));
    else assert.ok(!c.manufacturing.some(r => r.machines.some(m => m.machine.id === 'MedicalTechFab' && m.access.startsWith('emag'))));
    assert.ok(c.manufacturing.some(r => r.technologies.length && r.machines.some(m => m.access === 'research')));
    assert.ok(c.manufacturing.some(r => r.reagentResults.length));
    for (const r of c.manufacturing) {
      assert.ok(r.entityResult || r.reagentResults.length);
      assert.ok(r.time >= 0);
      assert.ok(r.materials.every(m => m.amount > 0));
    }
  });
  test(`${fork.id}: poppy seeds have standard vending stock; hidden inventories retained`, () => {
    const v = c.vending.find(v => v.machine.id === 'VendingMachineSeeds');
    assert.ok(v.items.some(i => i.entity.id === 'PoppySeeds' && i.amount === 3 && i.access === 'startingInventory'));
    assert.ok(v.items.some(i => i.access === 'contrabandInventory'));
    assert.ok(c.vending.some(v => v.items.some(i => i.access === 'emaggedInventory')));
  });
  test(`${fork.id}: proteins extract from meat and mice`, () => {
    const sources = c.extractions.filter(e => e.reagent.id === 'UncookedAnimalProteins' && e.method === 'grind');
    assert.ok(sources.some(e => e.entity.id === 'FoodMeat' && e.amount === 20));
    assert.ok(sources.some(e => e.entity.id === 'MobMouse' && e.amount > 0));
  });
}
