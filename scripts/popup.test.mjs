import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync('src/web/popup.tsx', 'utf8');
const controller = source.slice(source.indexOf('let currentPopup:'), source.indexOf('/**\n * Places a popup'));
function setup() {
  let now = 0, counter = 0;
  const timers = new Map();
  class Element { parentElement = null; }
  const context = vm.createContext({ Element, window: {
    setTimeout(fn, delay) { const id = ++counter; timers.set(id, { at: now + delay, fn }); return id; },
    clearTimeout(id) { timers.delete(id); }, addEventListener() {}, removeEventListener() {},
  }, performance: { now: () => now } });
  vm.runInContext(ts.transpileModule(controller + '\nglobalThis.api = { register, unregister, mouseMove, closeAll, idsByElement };', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const api = context.api;
  function add(id, parents = []) {
    const el = new Element();
    const inst = { id, trigger: el, stack: [...parents, id], open: false, intentTimeout: 500, closeDelay: 600, setOpen(value) { inst.open = value; } };
    api.register(inst); api.idsByElement.set(el, id);
    return inst;
  }
  function tick(ms) {
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    now = end;
  }
  return { add, tick, move: inst => api.mouseMove({ target: inst?.trigger ?? new Element() }), api };
}
test('passing over consecutive triggers never opens them immediately', () => {
  const { add, tick, move } = setup(); const a = add('a'), b = add('b');
  move(a); tick(100); move(b); tick(100); move(); tick(1000);
  assert.equal(a.open, false); assert.equal(b.open, false);
  move(b); tick(499); assert.equal(b.open, false); tick(1); assert.equal(b.open, true);
});
test('new and nested tooltips always wait; an existing parent remains open', () => {
  const { add, tick, move } = setup(); const a = add('a'), child = add('child', ['a']);
  move(a); tick(500); assert.equal(a.open, true);
  move(child); tick(499); assert.equal(child.open, false); assert.equal(a.open, true);
  tick(1); assert.equal(child.open, true);
  move(); tick(250); move(child); tick(700); assert.equal(child.open, true);
});
test('closing or unmounting cancels pending opens', () => {
  const { add, tick, move, api } = setup(); const a = add('a');
  move(a); tick(100); api.closeAll(); tick(600); assert.equal(a.open, false);
  move(a); tick(100); api.unregister(a); tick(600); assert.equal(a.open, false);
});
