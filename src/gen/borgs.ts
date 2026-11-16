import { BorgCatalog, BorgChassisEntry, BorgModuleEntry } from '../borg-types';
import { ManufacturingRecipe } from '../catalog-types';
import { entityAndAncestors } from './helpers';
import { EntityId } from './prototypes';
import { RawGameData } from './read-raw';
import { ResolvedEntityMap } from './types';

type Components = Record<string, any>;

/**
 * Cyborg chassis and the modules they accept.
 *
 * Station chassis come from `borgType` prototypes: the selectable chassis
 * switches into one of them, which sets its module whitelist and default
 * modules. Antagonist and team chassis are plain entities with a
 * `BorgChassis` whitelist and a module `ContainerFill`.
 */
export function buildBorgs(
  raw: RawGameData,
  entities: ResolvedEntityMap,
  t: (key: string | undefined) => string | null,
  manufacturing: readonly ManufacturingRecipe[]
): BorgCatalog {
  const ref = (id: string) => ({ id, name: t(`ent-${id}`) ?? entities.get(id as EntityId)?.name ?? id });
  const components = (id: string): Components => {
    const result: Components = {};
    const proto = raw.entities.get(id as EntityId);
    if (!proto) return result;
    // Ancestors come first, so later (closer) prototypes override fields.
    for (const ancestor of entityAndAncestors(proto, raw.entities)) {
      for (const c of ancestor.components ?? []) result[c.type] = { ...result[c.type], ...c };
    }
    return result;
  };
  const description = (id: string): string => {
    const proto = raw.entities.get(id as EntityId);
    if (!proto) return '';
    let result = '';
    for (const ancestor of entityAndAncestors(proto, raw.entities)) {
      result = t(`ent-${ancestor.id}.desc`) ?? (typeof ancestor.description === 'string' ? ancestor.description : result);
    }
    return result;
  };
  const concrete = (id: string) => {
    const e = entities.get(id as EntityId);
    return Boolean(e && !e.abstract);
  };

  const chassis: BorgChassisEntry[] = [];
  const borgTypes = (raw.reference ?? []).filter(p => p.type === 'borgType');
  const typeDummies = new Set<string>();
  for (const type of borgTypes) {
    const entity = typeof type.dummyPrototype === 'string' ? type.dummyPrototype : null;
    if (entity) typeDummies.add(entity);
    const defaults = (Array.isArray(type.defaultModules) ? type.defaultModules : []).filter(concrete);
    const extra = typeof type.extraModuleCount === 'number' ? type.extraModuleCount : 0;
    chassis.push({
      id: type.id,
      name: t(`borg-type-${type.id}-name`) ?? (entity ? ref(entity).name : type.id),
      entity: entity ?? type.id,
      description: t(`borg-type-${type.id}-desc`) ?? (entity ? description(entity) : ''),
      kind: 'station',
      whitelist: [...((type.moduleWhitelist as { tags?: string[] } | undefined)?.tags ?? [])],
      defaultModules: defaults,
      extraSlots: extra,
      // BorgSwitchableTypeSystem: max modules = default modules + extra count.
      slots: defaults.length + extra,
    });
  }

  // Team chassis exist in several copies: the bare chassis, player spawners
  // and "battery" variants with the starting modules, and derelict wrecks.
  // One branch per whitelist: named after the bare chassis, with the
  // starting modules of the variant that actually spawns with them.
  const variantPenalty = (id: string) => /Player|Battery|Dummy|Spawner/.test(id) ? 1 : 0;
  const candidates = [...entities.values()]
    .filter(e => !e.abstract && !typeDummies.has(e.id) && !/Derelict/.test(e.id))
    .map(e => e.id)
    .sort((a, b) => variantPenalty(a) - variantPenalty(b) || a.length - b.length || a.localeCompare(b));
  const special = new Map<string, BorgChassisEntry>();
  for (const id of candidates) {
    const c = components(id);
    const tags: string[] = c.BorgChassis?.moduleWhitelist?.tags ?? [];
    if (!tags.length) continue;
    const fill = c.ContainerFill?.containers?.borg_module;
    const defaults = (Array.isArray(fill) ? fill : []).filter(concrete);
    const slots = typeof c.BorgChassis?.maxModules === 'number' ? c.BorgChassis.maxModules : null;
    const key = [...tags].sort().join(',');
    const existing = special.get(key);
    if (existing) {
      if (!existing.defaultModules.length && defaults.length) existing.defaultModules = defaults;
      existing.slots ??= slots;
      continue;
    }
    special.set(key, {
      ...ref(id),
      entity: id,
      description: description(id),
      kind: 'special',
      whitelist: [...tags],
      defaultModules: defaults,
      extraSlots: null,
      slots,
    });
  }
  chassis.push(...special.values());

  const acceptedTags = new Set(chassis.flatMap(c => c.whitelist));
  const modules: BorgModuleEntry[] = [];
  for (const entity of entities.values()) {
    if (entity.abstract) continue;
    const c = components(entity.id);
    if (!c.BorgModule) continue;
    const tags = (c.Tag?.tags ?? []).filter((tag: string) => acceptedTags.has(tag));
    if (!tags.length) continue;
    const hands: unknown[] = c.ItemBorgModule?.hands ?? c.ItemBorgModule?.items ?? [];
    const items = [...new Set(hands
      .map(h => typeof h === 'string' ? h : (h as { item?: unknown })?.item)
      .filter((id): id is string => typeof id === 'string'))]
      .map(ref);
    modules.push({ ...ref(entity.id), description: description(entity.id), tags, items });
  }
  modules.sort((a, b) => a.id.localeCompare(b.id));

  const moduleIds = new Set(modules.map(m => m.id));
  const technologyIds = new Set(manufacturing
    .filter(r => moduleIds.has(r.result.id))
    .flatMap(r => r.technologies.map(v => v.id)));
  const kebab = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const technologies = raw.production
    .filter(p => p.type === 'technology' && technologyIds.has(p.id))
    .map(p => {
      const discipline = typeof p.discipline === 'string' ? p.discipline : '';
      return {
        id: p.id,
        name: t(typeof p.name === 'string' ? p.name : undefined) ?? p.id,
        tier: typeof p.tier === 'number' ? p.tier : 1,
        discipline: t(`research-discipline-${kebab(discipline)}`) ?? discipline,
      };
    });

  return { chassis, modules, technologies };
}
