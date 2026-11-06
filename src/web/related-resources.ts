import type { VendorEntry } from '../catalog-types';
import type { SearchableRecipeData } from './types';
export type ResourceKind = 'entity' | 'reagent';
type RelationData = Pick<SearchableRecipeData, 'recipeList' | 'entityMap' | 'foodSequenceStartPoints' | 'catalog'>;

export const findRelatedResources = (data: RelationData, id: string, kind: ResourceKind, excludeRecipeId?: string) => {
    const recipes = data.recipeList;
    const entity = kind === 'entity' ? data.entityMap.get(id) : undefined;
    const combinations = new Set([
      ...(entity?.seqStart ? [id] : []),
      ...[...entity?.seqElem ?? [], ...entity?.seqEnd ?? []].flatMap(key => data.foodSequenceStartPoints.get(key) ?? []),
    ]);
    return {
      manufacturing: (data.catalog.manufacturing ?? []).filter(r => kind === 'entity' ? r.entityResult && r.result.id === id : r.reagentResults?.some(p => p.reagent.id === id)),
      vendors: kind === 'entity' ? uniqueVendors((data.catalog.vending ?? []).filter(v => v.items.some(i => i.entity.id === id)).map(v => ({ ...v, items: v.items.filter(i => i.entity.id === id) }))) : [],
      combinations: [...combinations],
      extractions: data.catalog.extractions.filter(e => kind === 'entity' ? e.entity.id === id : e.reagent.id === id),
      sources: recipes.filter(r => r.id !== excludeRecipeId).filter(r => kind === 'entity' ? (r.solidResult === id || (r.method === 'construct' && r.steps.some(step => step.type === 'alsoMakes' && [step.entity].flat().includes(id)))) : r.reagentResult === id),
      uses: recipes.filter(r => r.id !== excludeRecipeId).filter(r => kind === 'entity' ? id in r.solids : id in r.reagents),
      plants: data.catalog.plants.filter(p => kind === 'entity' ? p.products.some(v => v.id === id) || p.seed?.id === id : p.chemicals.some(v => v.reagent.id === id)),
      reactions: kind === 'reagent' ? data.catalog.reactions.filter(r => r.reactants.some(v => v.reagent.id === id) && !recipes.some(recipe => recipe.id === `r!${r.id}`)) : [],
    };
};

export type RelatedData = ReturnType<typeof findRelatedResources>;
export const hasRelatedResources = (data: RelatedData) => Object.values(data).some(items => items.length > 0);

/** Cosmetic and unlocked machine variants may expose the exact same stock. */
export const uniqueVendors = (vendors: readonly VendorEntry[]): VendorEntry[] => {
  const seen = new Set<string>();
  return vendors.filter(v => {
    const stock = v.items.map(i => [i.entity.id, i.amount, i.access] as const)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const key = JSON.stringify([v.machine.name, stock]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
