import { buildManufacturing, buildVending } from './manufacturing';
import { findSolution } from './solution-helpers';
import { DepartmentCatalog, PlantEntry } from '../catalog-types';
import { entityAndAncestors } from './helpers';
import { EntityId, ReagentId } from './prototypes';
import { RawGameData } from './read-raw';
import { ResolvedEntityMap } from './types';

interface PlantComponents {
  PlantData?: { name?: string; packetPrototype?: string; productPrototypes?: string[]; mutationPrototypes?: string[] };
  Plant?: { yield?: number; potency?: number; lifespan?: number; maturation?: number; production?: number };
  PlantHarvest?: { harvestRepeat?: string };
  PlantTraitLigneous?: { harvestToolQuality?: string | null };
  PlantChemicals?: { chemicals?: Record<string, { min?: number; max?: number; potencyDivisor?: number }> };
}

/** Uses the same ancestor precedence as the entity/sprite resolver. */
export const plantComponents = (raw: RawGameData, id: EntityId): PlantComponents => {
  const result: Record<string, object> = {};
  for (const ancestor of entityAndAncestors(raw.entities.get(id)!, raw.entities)) {
    for (const comp of ancestor.components ?? []) {
      if (comp.type.startsWith('Plant')) {
        result[comp.type] = { ...result[comp.type], ...comp };
      }
    }
  }
  return result as PlantComponents;
};

export const buildCatalog = (
  raw: RawGameData,
  entities: ResolvedEntityMap,
  translate: (key: string | undefined) => string | null
): DepartmentCatalog => {
  const entityRef = (id: string) => ({ id, name: translate(`ent-${id}`) ?? entities.get(id as EntityId)?.name ?? id });
  const reagentRef = (id: string) => ({ id, name: translate(raw.reagents.get(id as ReagentId)?.name) ?? id });
  const plants: PlantEntry[] = [];
  for (const entity of entities.values()) {
    if (entity.abstract || !entity.components.has('PlantData') || !entity.components.has('Plant')) continue;
    const c = plantComponents(raw, entity.id);
    const data = c.PlantData ?? {};
    const stats = c.Plant ?? {};
    // Defaults verified in Lust Station PlantComponent and PlantHarvestComponent.
    const potency = stats.potency ?? 1;
    plants.push({
      id: entity.id,
      name: translate(data.name) ?? entityRef(entity.id).name,
      products: (data.productPrototypes ?? []).map(entityRef),
      mutations: (data.mutationPrototypes ?? []).map(id => {
        const target = raw.entities.get(id as EntityId);
        const name = target && plantComponents(raw, target.id).PlantData?.name;
        return { id, name: translate(name) ?? entityRef(id).name };
      }),
      seed: data.packetPrototype ? entityRef(data.packetPrototype) : null,
      harvest: c.PlantHarvest ? c.PlantHarvest.harvestRepeat ?? 'NoRepeat' : 'None',
      tool: c.PlantTraitLigneous ? c.PlantTraitLigneous.harvestToolQuality === null ? null : c.PlantTraitLigneous.harvestToolQuality ?? 'Sawing' : null,
      yield: stats.yield ?? 0, potency,
      lifespan: stats.lifespan ?? 0, maturation: stats.maturation ?? 0, production: stats.production ?? 0,
      chemicals: Object.entries(c.PlantChemicals?.chemicals ?? {}).map(([id, value]) => {
        const min = value.min ?? 0.01;
        const max = value.max ?? 0;
        const potencyDivisor = value.potencyDivisor ?? 0;
        return { reagent: reagentRef(id), min, max, potencyDivisor,
          amount: Math.min(max, Math.max(min, min + (potencyDivisor > 0 && potency > 0 ? potency / potencyDivisor : 0))) };
      }),
    });
  }

  // Reagent categories (notably Drinks) are commonly declared on abstract parents.
  const inherited = (id: string, key: string, seen = new Set<string>()): unknown => {
    if (seen.has(id)) return undefined;
    seen.add(id);
    const r = raw.reagents.get(id as ReagentId);
    if (!r) return undefined;
    if (r[key] !== undefined) return r[key];
    const parents = typeof r.parent === 'string' ? [r.parent] : Array.isArray(r.parent) ? r.parent : [];
    for (const parent of parents) {
      const value = inherited(parent, key, new Set(seen));
      if (value !== undefined) return value;
    }
    return undefined;
  };
  type Metabolism = { metabolismRate?: number; effects?: Record<string, unknown>[] };
  const metabolisms = (id: string, seen = new Set<string>()): Record<string, Metabolism> => {
    if (seen.has(id)) return {};
    seen.add(id);
    const r = raw.reagents.get(id as ReagentId);
    if (!r) return {};
    const parents = typeof r.parent === 'string' ? [r.parent] : Array.isArray(r.parent) ? r.parent : [];
    const result: Record<string, Metabolism> = {};
    for (const parent of parents) for (const [stage, entry] of Object.entries(metabolisms(parent, new Set(seen)))) result[stage] = { ...entry, ...result[stage] };
    for (const [stage, entry] of Object.entries((r.metabolisms ?? {}) as Record<string, Metabolism>)) result[stage] = { ...result[stage], ...entry };
    return result;
  };
  const reagents = Array.from(raw.reagents.values()).filter(r => !r.abstract).map(r => ({
    ...reagentRef(r.id), color: String(inherited(r.id, 'color') ?? '#ffffff'), group: String(inherited(r.id, 'group') ?? ''),
    metabolisms: Object.entries(metabolisms(r.id)).map(([stage, m]) => ({ stage, rate: m.metabolismRate ?? 0.5, effects: m.effects ?? [] })),
    description: translate(typeof r.desc === 'string' ? r.desc : undefined) ?? '',
  }));
  // Keep all multi-output reactions and prerequisite chemistry, without the
  // cooking generator's one-result / food-only restrictions.
  const reactions = raw.reactions.map(r => ({
    id: r.id,
    reactants: Object.entries(r.reactants ?? {}).map(([id, v]) => ({ reagent: reagentRef(id), amount: v.amount, catalyst: v.catalyst ?? false })),
    products: Object.entries(r.products ?? {}).map(([id, amount]) => ({ reagent: reagentRef(id), amount })),
    minTemp: r.minTemp ?? null, maxTemp: r.maxTemp ?? null,
    mixers: r.requiredMixerCategories ?? [], hasOtherEffects: (r.effects?.length ?? 0) > 0,
  }));
  const extractions: DepartmentCatalog['extractions'] = [];
  for (const entity of entities.values()) {
    if (entity.abstract || !entity.extractable) continue;
    const grind = entity.extractable.grindSolutionName ? findSolution(entities, entity, entity.extractable.grindSolutionName) : null;
    for (const [method, solution] of [['grind', grind], ['juice', entity.extractable.juiceSolution]] as const) {
      for (const r of solution?.reagents ?? []) {
        if (r.Quantity > 0) extractions.push({ entity: entityRef(entity.id), reagent: reagentRef(r.ReagentId), method, amount: r.Quantity });
      }
    }
  }
  return { plants, reagents, reactions, extractions, manufacturing: buildManufacturing(raw, entities, translate), vending: buildVending(raw, entities, translate),
    drinks: reagents.filter(r => r.group === 'Drinks').map(r => r.id),
    medicine: reagents.filter(r => r.group === 'Medicine').map(r => r.id),
    botanical: reagents.filter(r => r.group === 'Botanical').map(r => r.id),
  };
};
