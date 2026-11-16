import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/web/borg-tree.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { borgModuleSources, buildBorgBranches, layoutBorgTree, SharedBranchId, BorgColumns } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const index = JSON.parse(readFileSync(new URL('../public/data/index.json', import.meta.url)));
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
for (const fork of index) {
  const { catalog } = JSON.parse(readFileSync(new URL(`../public/data/data_${fork.id}.en.${fork.hashes.en}.json`, import.meta.url)));
  const borgs = catalog.borgs;
  const sources = borgModuleSources(borgs, catalog.manufacturing);
  const branches = buildBorgBranches(borgs, sources, new Intl.Collator('en'));
  test(`${fork.id}: every module sits in the tree, generic ones only once`, () => {
    assert.equal(branches[0].id, SharedBranchId);
    assert.ok(branches.some(b => b.id === 'generic' && b.chassis), 'the generic chassis keeps its own branch');
    assert.equal(new Set(branches.map(b => b.id)).size, branches.length);
    const placed = new Set(branches.flatMap(b => BorgColumns.flatMap(c => b.columns[c])));
    for (const m of borgs.modules) assert.ok(placed.has(m.id), m.id);
    for (const b of branches.slice(1)) {
      const extra = BorgColumns.filter(c => c !== 'default').flatMap(c => b.columns[c]);
      assert.ok(extra.every(id => !borgs.modules.find(m => m.id === id).tags.includes('BorgModuleGeneric')), b.id);
      assert.deepEqual(b.columns.default, [...new Set(b.chassis.defaultModules)].filter(id => borgs.modules.some(m => m.id === id)));
    }
  });
  test(`${fork.id}: research modules sit in their technology tier`, () => {
    const engineering = branches.find(b => b.id === 'engineering');
    const advanced = sources.get('BorgModuleAdvancedTool');
    assert.equal(advanced.technologies[0].tier, 2);
    assert.ok(['tier2', 'default'].some(c => engineering.columns[c].includes('BorgModuleAdvancedTool')));
    for (const [id, s] of sources) {
      if (s.column.startsWith('tier')) assert.ok(s.technologies.length, id);
      if (s.column === 'fabricator') assert.ok(s.recipes.some(r => r.machines.some(m => m.access === 'static')), id);
    }
  });
  test(`${fork.id}: layout keeps nodes apart and collapses branches`, () => {
    const layout = layoutBorgTree(branches);
    for (let i = 0; i < layout.nodes.length; i++) {
      const a = layout.nodes[i];
      assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.width <= layout.width && a.y + a.height <= layout.height, a.key);
      for (let j = i + 1; j < layout.nodes.length; j++) assert.ok(!overlaps(a, layout.nodes[j]), `${a.key} / ${layout.nodes[j].key}`);
    }
    const collapsed = layoutBorgTree(branches, new Set(['engineering']));
    assert.ok(!collapsed.nodes.some(n => n.kind === 'module' && n.branch === 'engineering'));
    assert.ok(collapsed.nodes.some(n => n.kind === 'branch' && n.id === 'engineering'));
    assert.ok(collapsed.height < layout.height);
  });
}
