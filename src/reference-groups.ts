import { CraftEntry, GasEntry, LawEntry, ReferenceEntity } from './encyclopedia-types';
export type ReferenceRow = ReferenceEntity | CraftEntry | LawEntry | GasEntry;
export const groupNames: Record<string, [string, string]> = {
  rats: ['Крысы и мыши', 'Rats & mice'], carp: ['Карпы, карпоакулы и драконы', 'Carp, sharkminnows & dragons'],
  pirates: ['Пираты и мусорщики', 'Pirates & scavengers'], soviet: ['СССП', 'USSP'], abductors: ['Абдукторы', 'Abductors'],
  xenos: ['Ксеноморфы', 'Xenomorphs'], flesh: ['Плоть и чудовища', 'Flesh creatures'], slimes: ['Слаймы', 'Slimes'],
  spiders: ['Пауки и насекомые', 'Spiders & insects'], animals: ['Животные и питомцы', 'Animals & pets'],
  hostile: ['Космическая и шахтёрская фауна', 'Space & mining fauna'], constructs: ['Конструкты и призванные существа', 'Constructs & summoned creatures'],
  mechs: ['Мехи', 'Mechs'], robots: ['Борги, боты и ИИ', 'Borgs, bots & AI'], people: ['Гуманоиды', 'Humanoids'], miscellaneous: ['Другие существа и объекты', 'Other creatures & objects'],
  'law-ai': ['ЦИИ', 'Station AI'], 'law-borg': ['Станционные киборги', 'Station cyborgs'],
  'law-security': ['Киборги СБ', 'Security cyborgs'], 'law-peace': ['Киборги-миротворцы', 'Peacekeeper cyborgs'],
  'law-xeno': ['Ксеноборги', 'Xenoborgs'], 'law-core': ['Ядро материнского корабля', 'Mothership core'],
  'law-syndicate': ['Киборги Синдиката', 'Syndicate cyborgs'], 'law-pirate': ['Пиратские киборги', 'Pirate cyborgs'],
  'law-ert': ['ОБР и Отряд Смерти', 'ERT & Death Squad'], 'law-drone': ['Дроны', 'Drones'],
  'law-other': ['Другие наборы и платы законов', 'Other lawsets & law boards'], ion: ['Сбойные шаблоны', 'Ion corruption templates'],
};
/** Family IDs are matched against prototype ancestry, never localized display names. */
export function creatureGroup(ids: string[], components: Record<string, unknown>): string {
  const lineage = ids.join(' ');
  const rules: [string, RegExp][] = [
    ['pirates', /Pirate|Spirate/], ['soviet', /Soviet|USSP/], ['abductors', /Abductor/],
    ['rats', /RatKing|RatServant|RatGuard|BigRat|MobMouse/], ['carp', /Carp|Shark|MobDragon/],
    ['robots', /Borg|Silicon|Bot|StationAi|PersonalAI|Positronic|Mothership|Robot/], ['mechs', /Mech/],
    ['xenos', /MobXeno/], ['flesh', /Flesh|Abomination|Hellspawn|HellSpawn/],
    ['constructs', /Construct|Guardian/], ['slimes', /AdultSlimes|SlimesPet|ReagentSlime/],
    ['spiders', /Spider|Cockroach|Mothroach|Glockroach|Moproach|MobBee|AngryBee|Butterfly|MobTick/],
    ['hostile', /Argocyte|Goliath|Hivelord|Basilisk|Watcher|Luminous|BearSpace|KangarooSpace|CobraSpace|SheepSpace|Behonker|QuartzCrab|IronCrab|CoalCrab|UraniumCrab|BananiumCrab|SilverCrab|GoldCrab|PlasmaCrab|SaltCrab/],
  ];
  for (const [group, pattern] of rules) if (pattern.test(lineage)) return group;
  if (components.HumanoidAppearance || components.HumanoidProfile) return 'people';
  if (/Animal|Pet|MobMonkey|MobKobold|MobBat|MobCow|MobCrab|MobGoat|MobSheep|MobGoose|MobGorilla|MobKangaroo|MobLizard|MobSlug|MobFrog|MobParrot|MobPenguin|MobSnake|MobPossum|MobRaccoon|MobFox|MobCorgi|MobCat|MobSloth|MobFerret|MobHamster|MobPig|MobReindeer|MobSnail|MobScurret|MobChicken|MobDuck|MobDionaNymph/.test(lineage)) return 'animals';
  return 'miscellaneous';
}
export function lawGroups(row: LawEntry): string[] {
  if (row.category === 'ion') return ['ion'];
  const result = new Set<string>();
  const rules: [string, RegExp][] = [
    ['law-xeno', /Xenoborg/], ['law-core', /Mothership/], ['law-security', /Security/], ['law-peace', /Peace/],
    ['law-ert', /ERT|DeathSquad/], ['law-pirate', /Pirate/], ['law-syndicate', /Syndicate/], ['law-drone', /^Drone$/],
  ];
  for (const [group, pattern] of rules) if (pattern.test(row.id)) result.add(group);
  for (const user of [...row.users, ...(row.typeUsers ?? [])]) {
    if (/CircuitBoard/.test(user.id)) continue;
    if (/StationAi/.test(user.id)) result.add('law-ai');
    else if (/Borg|borg/.test(user.id)) {
      const specific = rules.find(([, pattern]) => pattern.test(user.id));
      result.add(specific?.[0] ?? 'law-borg');
    }
  }
  return result.size ? [...result] : ['law-other'];
}
export function referenceGroups(section: string, row: ReferenceRow): string[] {
  if ('laws' in row) return lawGroups(row);
  if ('categories' in row) return section === 'creatures' ? [row.group ?? 'miscellaneous'] : row.categories;
  if ('category' in row) return [row.category];
  return [];
}
