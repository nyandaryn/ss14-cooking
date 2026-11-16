import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync('src/gen/variants.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const expand = value => JSON.parse(JSON.stringify(context.exports.expandPrototypeVariants(value)));
test('zipped variants preserve false, nested sequences, graph nodes and ordinary prototypes', () => {
  const variant = values => ({ '!type': 'CreateVariants', values });
  const rows = expand({ id: variant(['Pipe', 'PipeAlt']), hide: variant([false, true]), graph: [{ entity: variant(['Entity', 'EntityAlt']) }], parent: { '!type': 'CreateVariants', sequences: [['Base', 'Pipe'], ['Base', 'PipeAlt']] } });
  assert.deepEqual(rows, [
    { id: 'Pipe', hide: false, graph: [{ entity: 'Entity' }], parent: ['Base','Pipe'] },
    { id: 'PipeAlt', hide: true, graph: [{ entity: 'EntityAlt' }], parent: ['Base','PipeAlt'] },
  ]);
  assert.deepEqual(expand({ id: 'One', amount: 0 }), [{ id: 'One', amount: 0 }]);
  assert.throws(() => expand({ a: variant([1,2]), b: variant([1]) }), /Mismatched/);
});
