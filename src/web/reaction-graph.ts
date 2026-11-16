import type { ChemicalReaction } from '../catalog-types';

/**
 * Reaction links for the recipe explorer, the chemistry counterpart of the
 * cooking recipe indexes.
 *
 * A reaction counts as a way to *make* a reagent only when that reagent is its
 * single product. Multi-product reactions are breakdowns (blood in a
 * centrifuge, water electrolysis…): following them would list water as
 * "made from blood" in every cocktail, which is noise rather than a recipe.
 */
export interface ReactionGraph {
  readonly byId: ReadonlyMap<string, ChemicalReaction>;
  /** Reagent ID → reactions that make it (single-product only). */
  readonly makers: ReadonlyMap<string, readonly string[]>;
  /** Reagent ID → reactions that consume it, catalysts included. */
  readonly users: ReadonlyMap<string, readonly string[]>;
}

export const buildReactionGraph = (reactions: readonly ChemicalReaction[]): ReactionGraph => {
  const byId = new Map<string, ChemicalReaction>();
  const makers = new Map<string, string[]>();
  const users = new Map<string, string[]>();
  const append = (map: Map<string, string[]>, key: string, value: string) => {
    const list = map.get(key);
    if (!list) map.set(key, [value]);
    else if (!list.includes(value)) list.push(value);
  };
  for (const r of reactions) {
    byId.set(r.id, r);
    if (r.products.length === 1) append(makers, r.products[0].reagent.id, r.id);
    for (const reactant of r.reactants) append(users, reactant.reagent.id, r.id);
  }
  return { byId, makers, users };
};

/** Recipes of the ingredients, in ingredient order, without the reaction itself. */
export const reactionMadeWith = (graph: ReactionGraph, id: string): string[] => {
  const reaction = graph.byId.get(id);
  if (!reaction) return [];
  const result: string[] = [];
  for (const reactant of reaction.reactants) {
    for (const maker of graph.makers.get(reactant.reagent.id) ?? []) {
      if (maker !== id && !result.includes(maker)) result.push(maker);
    }
  }
  return result;
};

/** Reactions that consume any product of this one. */
export const reactionUsedIn = (graph: ReactionGraph, id: string): string[] => {
  const reaction = graph.byId.get(id);
  if (!reaction) return [];
  const result: string[] = [];
  for (const product of reaction.products) {
    for (const user of graph.users.get(product.reagent.id) ?? []) {
      if (user !== id && !result.includes(user)) result.push(user);
    }
  }
  return result;
};
