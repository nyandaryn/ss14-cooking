import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/web/related-resources.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { findRelatedResources, hasRelatedResources, uniqueVendors } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const index = JSON.parse(readFileSync(new URL('../public/data/index.json', import.meta.url)));
for (const fork of index) {
  const raw = JSON.parse(readFileSync(new URL(`../public/data/data_${fork.id}.en.${fork.hashes.en}.json`, import.meta.url)));
  const data = { ...raw, recipeList: raw.recipes, entityMap: new Map(raw.entities.map(e => [e.id, e])), foodSequenceStartPoints: new Map(Object.entries(raw.foodSequenceStartPoints)) };
  test(`${fork.id}: do not offer a recipe as its own source or show empty panels`, () => {
    for (const recipeId of ['RecipeMuffin', 'RecipeGrilledCheeseSandwichCotton']) {
      const recipe = raw.recipes.find(r => r.id === recipeId);
      assert.ok(recipe, recipeId);
      const related = findRelatedResources(data, recipe.solidResult, 'entity', recipeId);
      assert.ok(!related.sources.some(r => r.id === recipeId));
      assert.ok(!hasRelatedResources(related), recipeId);
      assert.ok(findRelatedResources(data, recipe.solidResult, 'entity').sources.some(r => r.id === recipeId), 'Standalone ingredient page still shows how to make it');
    }
  });
  test(`${fork.id}: preserve useful plant, extraction and other recipe links`, () => {
    const tomato = findRelatedResources(data, 'FoodTomato', 'entity');
    assert.ok(tomato.plants.length && tomato.uses.length && tomato.extractions.length);
    assert.ok(hasRelatedResources(tomato));
    const cheese = findRelatedResources(data, 'FoodChevreSlice', 'entity', 'butcher!FoodChevre:FoodChevreSlice');
    assert.ok(cheese.uses.length);
    assert.ok(!cheese.sources.some(r => r.id === 'butcher!FoodChevre:FoodChevreSlice'));
  });
  test(`${fork.id}: onion slices come from slicing produce even with Clothing`, () => {
    const recipe = raw.recipes.find(r => r.solidResult === 'FoodOnionSlice' && r.solids.FoodOnion === 1);
    assert.ok(recipe, 'Missing onion slicing recipe');
    assert.equal(recipe.resultQty, 5);
    assert.ok(recipe.steps.some(s => s.type === 'cut'));
    assert.ok(findRelatedResources(data, 'FoodOnionSlice', 'entity').sources.some(r => r.id === recipe.id));
    for (const product of ['FoodOnionRedSlice', 'FoodPineappleSlice']) {
      assert.ok(raw.recipes.some(r => r.solidResult === product && r.method === 'construct' && r.steps.some(s => s.type === 'cut')), product);
    }
  });
  test(`${fork.id}: protein electrolysis consumes proteins and produces elements`, () => {
    const related = findRelatedResources(data, 'UncookedAnimalProteins', 'reagent');
    const reaction = related.reactions.find(r => r.id === 'UncookedAnimalProteinBreakdown');
    assert.ok(reaction);
    assert.ok(reaction.reactants.some(v => v.reagent.id === 'UncookedAnimalProteins' && v.amount === 10));
    assert.deepEqual(Object.fromEntries(reaction.products.map(v => [v.reagent.id, v.amount])), { Carbon: 2, Hydrogen: 4, Phosphorus: 3, Oxygen: 1 });
    assert.ok(reaction.mixers.includes('Electrolysis'));
    assert.ok(!related.sources.some(r => r.id.includes('UncookedAnimalProteinBreakdown')));
    assert.ok(!findRelatedResources(data, 'Carbon', 'reagent').reactions.some(r => r.id === reaction.id));
  });
  test(`${fork.id}: soda popup can use full reaction data absent from cooking recipes`, () => {
    const soda = raw.catalog.reactions.find(r => r.products.some(p => p.reagent.id === 'SodaWater'));
    assert.ok(soda);
    assert.ok(soda.reactants.some(v => v.reagent.id === 'Water' && v.amount === 5));
    assert.ok(soda.reactants.some(v => v.reagent.id === 'CarbonDioxide' && v.amount === 1));
    assert.ok(soda.mixers.includes('Shake'));
  });
}

test('deduplicate cosmetic vending variants but retain different stock and access', () => {
  const item = { entity: { id: 'Raisins', name: 'Raisins' }, amount: 3, access: 'startingInventory' };
  const vendor = (id, items = [item], name = 'Snack vendor') => ({ machine: { id, name }, items });
  const result = uniqueVendors([
    vendor('A'), vendor('B'), vendor('C', [{ ...item, amount: 5 }]),
    vendor('D', [{ ...item, access: 'contrabandInventory' }]), vendor('E', [item], 'Other vendor'),
  ]);
  assert.deepEqual(result.map(v => v.machine.id), ['A', 'C', 'D', 'E']);
  assert.equal(uniqueVendors([vendor('A', [item, { ...item, amount: 2 }]), vendor('B', [{ ...item, amount: 2 }, item])]).length, 1);
});
