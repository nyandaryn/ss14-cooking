import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync('src/reference-groups.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { creatureGroup, referenceGroups, lawGroups, groupNames } = context.exports;
test('monster variants inherit families without classifying humanoid slimes as animals', () => {
  for (const [ids, expected] of [[['MobRatKingBuff','MobRatKing'],'rats'],[['MobShark'],'carp'],[['MobPirateT1BorgAssault'],'pirates'],[['PetMobCorgiIan','MobCorgi'],'animals'],[['UnknownVariant','MobXeno'],'xenos']]) assert.equal(creatureGroup(ids, {}), expected);
  assert.equal(creatureGroup(['MobSlimePerson'], { HumanoidAppearance: {} }), 'people');
});
for (const build of JSON.parse(readFileSync('public/data/index.json'))) for (const [lang, hash] of Object.entries(build.hashes)) {
  const c = JSON.parse(readFileSync(`public/data/data_${build.id}.${lang}.${hash}.json`)).catalog.encyclopedia;
  test(`${build.id}/${lang}: grouping keeps all records and all equipment categories`, () => {
    for (const section of ['creatures','items','crafting','laws']) for (const row of c[section]) assert.ok(referenceGroups(section, row).length, `${section}/${row.id}`);
    for (const row of c.creatures) assert.ok(row.group && groupNames[row.group], row.id);
    assert.equal(c.creatures.find(x => x.id === 'MobRatKing').group, 'rats');
    assert.equal(c.creatures.find(x => x.id === 'MobShark').group, 'carp');
    assert.equal(c.creatures.find(x => x.id === 'MobHuman').group, 'people');
    const multi = c.items.find(x => x.categories.length > 1);
    assert.deepEqual(Array.from(referenceGroups('items', multi)), multi.categories);
    for (const row of c.laws.filter(x=>x.category === 'ion')) assert.deepEqual(Array.from(lawGroups(row)), ['ion']);
    assert.ok(lawGroups(c.laws.find(x=>x.id === 'Crewsimov')).includes('law-ai'));
    assert.ok(lawGroups(c.laws.find(x=>x.id === 'XenoborgLawset')).includes('law-xeno'));
    if (build.id === 'lust') assert.ok(c.laws.find(x=>x.id === 'SecurityLawsetAiAssigned').typeUsers.some(x=>x.id === 'BorgChassisSecurity'));
  });
}
