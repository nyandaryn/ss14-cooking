import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync('src/web/popup.tsx', 'utf8');
const controller = source.slice(source.indexOf('let currentPopup:'), source.indexOf('/** Keep the trigger'));
function setup() {
  let now = 0, counter = 0;
  const timers = new Map();
  class Element {
    parentElement = null;
    panel = false;
    closest() { return this.panel ? this : this.parentElement?.closest() ?? null; }
  }
  const context = vm.createContext({ Element, window: {
    setTimeout(fn, delay) { const id = ++counter; timers.set(id, { at: now + delay, fn }); return id; },
    clearTimeout(id) { timers.delete(id); }, addEventListener() {}, removeEventListener() {},
  }, performance: { now: () => now } });
  vm.runInContext(ts.transpileModule(controller + '\nglobalThis.api = { register, unregister, mouseMove, focus, scroll, closeAll, idsByElement };', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
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
  let x = 0;
  return { add, tick, move: (inst, point = { x: x += 20, y: 100 }) => api.mouseMove({ target: inst?.trigger ?? new Element(), clientX: point.x, clientY: point.y }), api, Element };
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

test('a new panel under the cursor cannot start a nested preview from mouse jitter', () => {
  const { add, tick, move } = setup();
  const parent = add('parent'), child = add('child', ['parent']);
  move(parent, { x: 100, y: 100 }); tick(500);
  move(child, { x: 102, y: 101 }); tick(1000);
  assert.equal(parent.open, true); assert.equal(child.open, false);
  move(child, { x: 120, y: 105 }); tick(499);
  assert.equal(child.open, false); tick(1); assert.equal(child.open, true);
});
test('scrolling a panel cancels pending child previews and requires fresh hover intent', () => {
  const { add, tick, move, api, Element } = setup();
  const parent = add('parent'), child = add('child', ['parent']);
  const panel = new Element(); panel.panel = true; api.idsByElement.set(panel, 'parent');
  move(parent); tick(500); move(child); tick(200);
  api.scroll({ target: panel }); tick(600);
  assert.equal(parent.open, true); assert.equal(child.open, false);
  move(child, { x: 41, y: 100 }); tick(600); assert.equal(child.open, false);
  move(child, { x: 60, y: 100 }); tick(500); assert.equal(child.open, true);
});
test('keyboard focus can open nested links without pointer movement', () => {
  const { add, tick, api } = setup(); const parent = add('parent'), child = add('child', ['parent']);
  api.focus({ target: parent.trigger }); tick(500);
  api.focus({ target: child.trigger }); tick(500);
  assert.equal(parent.open, true); assert.equal(child.open, true);
});

const positioning = source.slice(source.indexOf('/** Keep the trigger'), source.indexOf('let root:'));
function layout(viewport, trigger, popup, interactive = true, parentPanel) {
  const context = vm.createContext({ window: { innerWidth: viewport[0], innerHeight: viewport[1] } });
  vm.runInContext(ts.transpileModule(positioning + '\nglobalThis.place = placePopup;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.place('below', rect(...trigger), rect(0, 0, ...popup), interactive, parentPanel && rect(...parentPanel));
}
function rect(x, y, width, height) { return { x, y, left: x, top: y, right: x + width, bottom: y + height, width, height }; }
function assertClear(viewport, trigger, popup, result) {
  const t = rect(...trigger), p = rect(result.x, result.y, popup[0], Math.min(popup[1], result.maxHeight));
  assert.ok(p.right <= t.left || p.left >= t.right || p.bottom <= t.top || p.top >= t.bottom, 'preview must not cover its trigger');
  assert.ok(p.left >= 8 && p.top >= 8 && p.right <= viewport[0] - 8 && p.bottom <= viewport[1] - 8, 'preview must fit viewport');
}
test('large previews beside the link keep the pointer and source list clear', () => {
  const viewport = [1280, 800], trigger = [80, 280, 100, 24], popup = [400, 1000];
  const result = layout(viewport, trigger, popup);
  assert.equal(result.x, 188); assertClear(viewport, trigger, popup, result);
});
test('nested previews use the outer edge of the parent panel', () => {
  const result = layout([1600, 900], [250, 300, 100, 24], [400, 500], true, [200, 200, 400, 600]);
  assert.equal(result.x, 608);
});
test('previews flip left at the right edge and remain outside the trigger', () => {
  const viewport = [1280, 800], trigger = [1100, 700, 100, 24], popup = [400, 1000];
  const result = layout(viewport, trigger, popup);
  assert.equal(result.x, 692); assertClear(viewport, trigger, popup, result);
});
test('narrow viewports constrain tall lists above or below, never over the link', () => {
  for (const y of [10, 250, 500, 760]) {
    const viewport = [390, 800], trigger = [50, y, 130, 24], popup = [374, 1000];
    const result = layout(viewport, trigger, popup);
    assertClear(viewport, trigger, popup, result);
    // Re-measuring after applying the height limit must not make it jump sides.
    const next = layout(viewport, trigger, [popup[0], result.maxHeight]);
    assert.equal(next.y, result.y);
  }
});
