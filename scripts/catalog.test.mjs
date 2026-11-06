import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Run after build + gen:recipes: checks the data actually shipped to the UI.
const index = JSON.parse(readFileSync(new URL('../public/data/index.json', import.meta.url)));
const fork = index.find(f => f.id === 'lust');
assert.ok(fork, 'Generate Lust Station data before running these tests');
const read = lang => JSON.parse(readFileSync(new URL(`../public/data/data_lust.${lang}.${fork.hashes[lang]}.json`, import.meta.url)));
for (const lang of ['en', 'ru']) {
  const data = read(lang);
  const c = data.catalog;
  test(`${lang}: department catalogs and every reference resolve`, () => {
    assert.ok(c.plants.length > 50);
    assert.ok(c.medicine.length > 40);
    assert.ok(c.botanical.length > 5);
    const plants = new Set(c.plants.map(p => p.id));
    const reagents = new Set(c.reagents.map(r => r.id));
    for (const p of c.plants) {
      for (const m of p.mutations) assert.ok(plants.has(m.id), `${p.id} -> ${m.id}`);
      for (const chemical of p.chemicals) assert.ok(reagents.has(chemical.reagent.id));
      for (const product of p.products) assert.ok(product.name && product.name !== '(unknown name)');
    }
    for (const r of c.reactions) for (const item of [...r.reactants, ...r.products]) {
      assert.ok(reagents.has(item.reagent.id), `${r.id} -> ${item.reagent.id}`);
      assert.ok(item.amount > 0);
    }
  });
  test(`${lang}: plant harvest defaults, special tools and mutation graph`, () => {
    const wheat = c.plants.find(p => p.id === 'WheatPlants');
    assert.equal(wheat.harvest, 'NoRepeat');
    assert.equal(wheat.yield, 3);
    assert.equal(wheat.potency, 5);
    assert.ok(wheat.mutations.some(p => p.id === 'MeatWheatPlants'));
    const banana = c.plants.find(p => p.id === 'BananaPlants');
    assert.equal(banana.harvest, 'Repeat');
    assert.equal(banana.potency, 1); // inherited component with omitted field
    assert.ok(banana.mutations.some(p => p.id === 'ExplosiveBananaPlants'));
    assert.equal(c.plants.find(p => p.id === 'TowercapPlants').tool, 'Sawing');
    assert.equal(wheat.chemicals.find(v => v.reagent.id === 'Flour').amount, 5.25);
  });
  test(`${lang}: prerequisite chemistry, multi-output reactions, catalysts and heating survive`, () => {
    const bicaridine = c.reactions.find(r => r.id === 'Bicaridine');
    assert.ok(bicaridine.reactants.some(v => v.reagent.id === 'Inaprovaline'));
    assert.ok(c.reactions.some(r => r.products.some(p => p.reagent.id === 'Inaprovaline')));
    assert.ok(c.reactions.some(r => r.products.length > 1));
    assert.ok(c.reactions.some(r => r.reactants.some(p => p.catalyst)));
    assert.ok(c.reactions.some(r => r.minTemp > 0));
    assert.ok(data.recipes.some(r => r.method === 'microwave' && [r.subtype].flat().includes('MedicalAssembler')));
  });
}
test('Russian names are localized independently of English', () => {
  assert.notEqual(read('en').catalog.plants.find(p => p.id === 'WheatPlants').name, read('ru').catalog.plants.find(p => p.id === 'WheatPlants').name);
  assert.notEqual(read('en').catalog.reagents.find(r => r.id === 'Bicaridine').name, read('ru').catalog.reagents.find(r => r.id === 'Bicaridine').name);
});

test('Build selector has independent Lust Station and WizDen catalogs', () => {
  const wizden = index.find(f => f.id === 'wizden');
  assert.ok(wizden);
  assert.equal(index.filter(f => f.default).length, 1);
  assert.equal(fork.default, true);
  assert.equal(wizden.meta.repo, 'space-wizards/space-station-14');
  const vanilla = JSON.parse(readFileSync(new URL(`../public/data/data_wizden.en.${wizden.hashes.en}.json`, import.meta.url)));
  assert.ok(vanilla.recipes.length > 200);
  assert.ok(vanilla.catalog.plants.length > 40);
  assert.ok(vanilla.catalog.medicine.length > 20);
  assert.notEqual(vanilla.spriteSheet, read('en').spriteSheet);
  assert.ok(read('en').catalog.plants.some(p => p.id === 'ExplosiveBananaPlants'));
  assert.ok(!vanilla.catalog.plants.some(p => p.id === 'ExplosiveBananaPlants'));
  assert.ok(!vanilla.microwaveRecipeTypes?.MedicalAssembler);
  const plants = new Set(vanilla.catalog.plants.map(p => p.id));
  for (const plant of vanilla.catalog.plants) for (const mutation of plant.mutations) {
    assert.ok(plants.has(mutation.id), `${plant.id} -> ${mutation.id}`);
  }
});

for (const build of index) {
  for (const [language, hash] of Object.entries(build.hashes)) {
    test(`${build.id}/${language}: inherited drink groups, cocktail recipes and extraction links`, () => {
      const data = JSON.parse(readFileSync(new URL(`../public/data/data_${build.id}.${language}.${hash}.json`, import.meta.url)));
      const c = data.catalog;
      assert.ok(c.drinks.length > 100, 'Inherited categories must include cocktails, not just explicitly grouped bases');
      for (const id of ['Martini', 'Margarita', 'JuiceTomato', 'Coffee']) assert.ok(c.drinks.includes(id), id);
      assert.ok(!c.drinks.includes('BaseDrink') && !c.drinks.includes('BaseAlcohol'));
      const martini = c.reactions.find(r => r.products.some(p => p.reagent.id === 'Martini'));
      assert.ok(martini && martini.reactants.length >= 2);
      const reagentIds = new Set(c.reagents.map(r => r.id));
      for (const e of c.extractions) {
        assert.ok(reagentIds.has(e.reagent.id), e.reagent.id);
        assert.ok(e.entity.name && e.amount > 0);
        assert.ok(['juice', 'grind'].includes(e.method));
      }
      assert.ok(c.extractions.some(e => e.reagent.id === 'JuiceTomato' && e.method === 'juice'));
      for (const r of c.reactions) for (const v of [...r.products, ...r.reactants]) assert.ok(reagentIds.has(v.reagent.id), `${r.id}: ${v.reagent.id}`);
    });
  }
}
for (const build of index) test(`${build.id}: banana juice has distinct grinding and juicing outputs`, () => {
  const { catalog } = JSON.parse(readFileSync(new URL(`../public/data/data_${build.id}.en.${build.hashes.en}.json`, import.meta.url)));
  const banana = catalog.extractions.filter(e => e.entity.id === 'FoodBanana' && e.reagent.id === 'JuiceBanana');
  assert.deepEqual(Object.fromEntries(banana.map(e => [e.method, e.amount])), { grind: 5, juice: 10 });
});
