import { ManufacturingRecipe } from '../catalog-types';
import { entityAndAncestors } from './helpers';
import { EntityId, ReagentId } from './prototypes';
import { RawGameData } from './read-raw';
import { ResolvedEntityMap } from './types';

export function buildManufacturing(raw: RawGameData, entities: ResolvedEntityMap, translate: (key: string | undefined) => string | null): ManufacturingRecipe[] {
  // Prototype inheritance uses leftmost-parent precedence, like entity inheritance.
  const maps = (type: string) => new Map(raw.production.filter(p => p.type === type).map(p => [p.id, p]));
  const recipes = maps('latheRecipe'), packs = maps('latheRecipePack'), materials = maps('material');
  const resolve = (map: Map<string, any>, id: string, seen = new Set<string>()): any => {
    if (seen.has(id)) return {};
    const p = map.get(id); if (!p) return {};
    const parents: string[] = p.parent ? [p.parent].flat() : [];
    return Object.assign({}, ...parents.slice().reverse().map(v => resolve(map, v, new Set([...seen, id]))), p);
  };
  const ref = (id: string) => ({ id, name: translate(`ent-${id}`) ?? entities.get(id as EntityId)?.name ?? id });
  const available = new Map<string, ManufacturingRecipe['machines']>();
  for (const entity of entities.values()) {
    if (entity.abstract || !entity.components.has('Lathe')) continue;
    const components: Record<string, any> = {};
    for (const ancestor of entityAndAncestors(raw.entities.get(entity.id)!, raw.entities)) {
      for (const c of ancestor.components ?? []) components[c.type] = { ...components[c.type], ...c };
    }
    const lathe = components.Lathe ?? {}, emag = components.EmagLatheRecipes ?? {};
    const groups = [
      ['static', lathe.staticPacks ?? [], lathe.staticRecipes ?? []],
      ['research', lathe.dynamicPacks ?? [], lathe.dynamicRecipes ?? []],
      ['emag', emag.emagStaticPacks ?? [], emag.emagStaticRecipes ?? []],
      ['emagResearch', emag.emagDynamicPacks ?? [], emag.emagDynamicRecipes ?? []],
    ] as const;
    for (const [access, packIds, direct] of groups) {
      const ids = new Set<string>([...direct, ...packIds.flatMap((id: string) => resolve(packs, id).recipes ?? [])]);
      for (const id of ids) {
        const list = available.get(id) ?? [];
        list.push({ machine: ref(entity.id), access, materialMultiplier: lathe.materialUseMultiplier ?? 1, timeMultiplier: lathe.timeMultiplier ?? 1 });
        available.set(id, list);
      }
    }
  }
  return [...available].flatMap(([id, machines]) => {
    const r = resolve(recipes, id);
    if ((!r.result && !r.resultReagents) || recipes.get(id)?.abstract) return [];
    const reagentResults = Object.entries(r.resultReagents ?? {}).map(([id, amount]) => ({ reagent: { id, name: translate(raw.reagents.get(id as ReagentId)?.name) ?? id }, amount: Number(amount) }));
    return [{ id, result: r.result ? ref(r.result) : { id, name: translate(r.name) ?? reagentResults.map(p => p.reagent.name).join(' + ') }, entityResult: Boolean(r.result), reagentResults, time: r.completetime ?? 5, machines: machines.map(m => ({ ...m, materialMultiplier: r.applyMaterialDiscount === false ? 1 : m.materialMultiplier })),
      materials: Object.entries(r.materials ?? {}).map(([id, amount]) => {
        const m = resolve(materials, id);
        return { material: { id, name: translate(m.name) ?? id }, amount: Number(amount), entityId: m.stackEntity };
      }),
      technologies: raw.production.filter(p => p.type === 'technology' && Array.isArray(p.recipeUnlocks) && p.recipeUnlocks.includes(id)).map(p => ({ id: p.id, name: translate(typeof p.name === 'string' ? p.name : undefined) ?? p.id })),
    }];
  });
}

export function buildVending(raw: RawGameData, entities: ResolvedEntityMap, translate: (key: string | undefined) => string | null) {
  const ref = (id: string) => ({ id, name: translate(`ent-${id}`) ?? entities.get(id as EntityId)?.name ?? id });
  const inventories = new Map(raw.production.filter(p => p.type === 'vendingMachineInventory').map(p => [p.id, p]));
  return [...entities.values()].filter(e => !e.abstract && e.components.has('VendingMachine')).flatMap(e => {
    let component: any = {};
    for (const ancestor of entityAndAncestors(raw.entities.get(e.id)!, raw.entities)) {
      for (const c of ancestor.components ?? []) if (String(c.type) === 'VendingMachine') component = { ...component, ...c };
    }
    const inventory = inventories.get(component.pack);
    if (!inventory) return [];
    const items = ['startingInventory', 'contrabandInventory', 'emaggedInventory'].flatMap(access => Object.entries(inventory[access] ?? {}).filter(([,amount]) => Number(amount) > 0).map(([id, amount]) => ({ entity: ref(id), amount: Number(amount), access })));
    return [{ machine: ref(e.id), items }];
  });
}
