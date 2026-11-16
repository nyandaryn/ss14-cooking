import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { globSync } from 'glob';
import { parse } from 'yaml';
const index = JSON.parse(readFileSync('public/data/index.json'));
for (const build of index) for (const [lang, hash] of Object.entries(build.hashes)) {
  const data = JSON.parse(readFileSync(`public/data/data_${build.id}.${lang}.${hash}.json`));
  const c = data.catalog.encyclopedia;
  test(`${build.id}/${lang}: complete reference sections and requested monsters`, () => {
    assert.ok(c.creatures.length > 100);
    assert.ok(c.items.length > 1000);
    for (const id of ['MobRatKing', 'MobShark', 'MobMouse']) assert.ok(c.creatures.some(e => e.id === id), id);
    assert.ok(c.creatures.find(e => e.id === 'MobShark').description.length > 10);
    assert.ok(!c.creatures.some(e => e.id === 'BaseMobCarp'));
    for (const category of ['armor','weapon','tool','clothing','food','other']) assert.ok(c.items.some(e => e.categories.includes(category)), category);
    assert.ok(!c.items.find(e => e.id === 'Crowbar').categories.includes('clothing'));
    assert.ok(c.items.find(e => e.id === 'Crowbar').stats.some(s => s.label === 'tools'));
    assert.ok(c.creatures.find(e => e.id === 'MobRatKing').description.length > 10);
  });
  test(`${build.id}/${lang}: menu crafting preserves inherited recipes and ordered requirements`, () => {
    assert.ok(c.crafting.length > 100);
    assert.ok(c.crafting.some(e => e.id === 'GasPipeStraight'));
    assert.ok(!c.crafting.some(e => e.id === 'GasPipeStraightAlt1'));
    const spear = c.crafting.find(e => e.result?.id === 'Spear');
    assert.ok(spear?.reachable);
    assert.deepEqual(spear.steps.slice(0, 2).map(s => s.amount), [2, 3]);
    assert.equal(spear.steps[2].kind, 'tag');
    assert.equal(spear.steps[0].seconds, 2);
    assert.ok(c.crafting.some(e => e.steps.some(s => s.kind === 'tool')));
    assert.ok(c.crafting.every(e => e.name && e.target));
  });
  test(`${build.id}/${lang}: lawsets preserve order and render ion templates`, () => {
    const crewsimov = c.laws.find(e => e.id === 'Crewsimov');
    assert.equal(crewsimov.laws.length, 3);
    assert.ok(crewsimov.laws.every(l => !l.text.startsWith('law-')));
    assert.ok(crewsimov.users.length);
    assert.ok(c.laws.some(e => e.ionWeight > 0));
    const ion = c.laws.filter(e => e.category === 'ion');
    assert.ok(ion.length > 20);
    for (const law of ion) assert.ok(!law.laws[0].text.startsWith('ion-storm-law-'), law.id);
    assert.match(ion.find(e => e.id === 'OnStation').laws[0].text, /\[/);
  });
  test(`${build.id}/${lang}: every active gas reaction is described and outputs resolve`, () => {
    assert.ok(c.gases.length >= 9);
    const root = `sources/${build.id === 'lust' ? 'lust-station' : 'wizden'}/Resources/Prototypes`;
    const raw = globSync('**/*.yml', { cwd: root }).flatMap(path => {
      const text = readFileSync(`${root}/${path}`, 'utf8');
      return /type:\s*gasReaction\b/.test(text) ? parse(text, { logLevel: 'silent' }) : [];
    }).filter(p => p?.type === 'gasReaction').map(p => p.id).sort();
    assert.deepEqual(c.gasReactions.map(r => r.id).sort(), raw);
    for (const r of c.gasReactions) {
      assert.ok(r.explanation.length > 20, r.id);
      assert.ok(r.source.endsWith('.cs'), r.id);
      for (const id of [...r.products, ...r.requirements.map(v => v.gas.id)]) assert.ok(c.gases.some(g => g.id === id), id);
    }
    const frezon = c.gasReactions.find(r => r.id === 'FrezonProduction');
    assert.equal(frezon.maxTemp, 73.15);
    assert.ok(frezon.products.includes('Frezon'));
    if (build.id === 'lust') {
      assert.ok(c.gasReactions.find(r => r.id === 'ElectrovaeCharge').explanation.includes('1518'));
      assert.ok(c.gases.some(g => g.id === 'BZ'));
    } else assert.ok(!c.gases.some(g => g.id === 'BZ'));
  });
}
