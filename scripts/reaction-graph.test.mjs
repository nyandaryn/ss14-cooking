import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/web/reaction-graph.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { buildReactionGraph, reactionMadeWith, reactionUsedIn } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const index = JSON.parse(readFileSync(new URL('../public/data/index.json', import.meta.url)));
for (const fork of index) {
  const { catalog } = JSON.parse(readFileSync(new URL(`../public/data/data_${fork.id}.en.${fork.hashes.en}.json`, import.meta.url)));
  const graph = buildReactionGraph(catalog.reactions);
  test(`${fork.id}: drink ingredients link to their own recipes`, () => {
    const irishCoffee = reactionMadeWith(graph, 'IrishCoffee');
    assert.ok(irishCoffee.includes('IrishCream'), 'Irish cream is mixed from cream and whiskey');
    assert.deepEqual(irishCoffee.filter(id => id !== 'IrishCream'), graph.makers.get('Coffee') ?? [], 'coffee is brewed in Lust Station, dispensed in WizDen');
    assert.deepEqual(reactionMadeWith(graph, 'ScrewdriverCocktail'), ['Vodka']);
    assert.ok(reactionUsedIn(graph, 'IrishCream').includes('IrishCoffee'));
    assert.deepEqual(graph.makers.get('Vodka'), ['Vodka']);
  });
  test(`${fork.id}: breakdowns never count as a way to make an ingredient`, () => {
    assert.equal(graph.makers.get('Water'), undefined, 'water only comes out of breakdowns');
    for (const reaction of catalog.reactions) {
      const made = reactionMadeWith(graph, reaction.id);
      assert.ok(!made.includes(reaction.id), reaction.id);
      assert.equal(new Set(made).size, made.length, reaction.id);
      const used = reactionUsedIn(graph, reaction.id);
      assert.ok(!used.includes(reaction.id), reaction.id);
      assert.equal(new Set(used).size, used.length, reaction.id);
    }
  });
}
