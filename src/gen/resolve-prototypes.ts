import { FluentBundle, FluentResource } from '@fluent/bundle';
import { globSync } from 'glob';
import { resolve } from 'node:path';
import { CookingMethod } from '../types';
import {
  DefaultCookTime,
  DefaultRecipeGroup,
  MixerCategoryToStepType,
} from './constants';
import { ConstructRecipeBuilder } from './construct-recipe-builder';
import { PrunedGameData } from './filter-relevant';
import { readFileTextWithoutTheStupidBOM, recipeSolids } from './helpers';
import {
  EntityId,
  MicrowaveMealRecipe,
  Reactant,
  ReactionPrototype,
  ReagentId,
  StackMap,
} from './prototypes';
import { getReagentResult, getSolidResult } from './reaction-helpers';
import {
  ForkLocales,
  LocalizedNames,
  MethodEntities,
  MicrowaveRecipeTypes,
  ResolvedEntity,
  ResolvedEntityMap,
  ResolvedReagent,
  ResolvedReagentMap,
  ResolvedRecipe,
} from './types';

export interface ResolvedGameData {
  readonly entities: ResolvedEntityMap;
  readonly reagents: ResolvedReagentMap;
  readonly recipes: ReadonlyMap<string, ResolvedRecipe>;
  readonly reagentSources: ReadonlyMap<ReagentId, readonly EntityId[]>;
  readonly methodEntities: ReadonlyMap<CookingMethod, ResolvedEntity>;
  /** Frontier */
  readonly microwaveRecipeTypeEntities: ReadonlyMap<string, ResolvedEntity> | undefined;
  /**
   * Display names per site language. The iteration order matches the fork's
   * `locales` config; the first language is the fallback.
   */
  readonly names: ReadonlyMap<string, LocalizedNames>;
}

export const resolvePrototypes = (
  filtered: PrunedGameData,
  allEntities: ResolvedEntityMap,
  localeRoot: string,
  locales: ForkLocales,
  methodEntities: MethodEntities,
  microwaveRecipeTypes: MicrowaveRecipeTypes | undefined
): ResolvedGameData => {
  const reagents = new Map<ReagentId, ResolvedReagent>();
  const recipes = new Map<string, ResolvedRecipe>();

  const bundles = new Map<string, FluentBundle>();
  for (const [lang, gameLocale] of Object.entries(locales)) {
    bundles.set(lang, createFluentBundle(resolve(localeRoot, gameLocale), gameLocale));
  }
  // The first locale is the fallback for everything else.
  const fluentBundle = bundles.values().next().value!;

  const defaultMicrowaveRecipeType = microwaveRecipeTypes &&
    Object.entries(microwaveRecipeTypes)
      .find(([k, v]) => v.default)
      ?.[0];

  const anyRecipeHasStacks = filtered.recipes.some(r => r.stacks != null);
  for (const recipe of filtered.recipes) {
    recipes.set(recipe.id, {
      method: 'microwave',
      time: recipe.time ?? DefaultCookTime,
      solidResult: recipe.result,
      reagentResult: null,
      resultQty: recipe.resultCount, // Frontier
      solids: convertMicrowaveSolids(
        recipe,
        filtered.stacks,
        anyRecipeHasStacks
      ),
      reagents: recipe.reagents
        ? convertMicrowaveReagents(recipe.reagents)
        : {},
      subtype: resolveRecipeSubtype(recipe, defaultMicrowaveRecipeType),
      group: recipe.group ?? DefaultRecipeGroup,
    });
  }

  for (const [id, recipe] of filtered.specialRecipes) {
    recipes.set(id, recipe);
  }

  for (const [id, recipe] of reactionRecipes(filtered.reactions)) {
    recipes.set(id, recipe);
  }

  for (const reagent of filtered.reagents.values()) {
    const name = formatMessage(fluentBundle, reagent.name) ?? reagent.id;
    reagents.set(reagent.id, {
      name,
      color: reagent.color ?? '#ffffff',
    });
  }

  const recipeGroups = new Set<string>();
  for (const recipe of recipes.values()) {
    recipeGroups.add(recipe.group);
  }

  const names = new Map<string, LocalizedNames>();
  for (const [lang, bundle] of bundles) {
    names.set(lang, resolveNames(
      bundle,
      fluentBundle,
      filtered.entities,
      filtered.reagents.values(),
      recipeGroups
    ));
  }

  const resolvedMethodEntities = new Map<CookingMethod, ResolvedEntity>();
  for (const [method, id] of Object.entries(methodEntities)) {
    if (id === null) {
      // Unsupported cooking method on this fork, skip it.
      continue;
    }
    resolvedMethodEntities.set(
      method as CookingMethod,
      allEntities.get(id)!
    );
  }

  let microwaveRecipeTypeEntities: Map<string, ResolvedEntity> | undefined;
  if (microwaveRecipeTypes) {
    microwaveRecipeTypeEntities = new Map<string, ResolvedEntity>();
    for (const [subtype, subtypeData] of Object.entries(microwaveRecipeTypes)) {
      microwaveRecipeTypeEntities.set(
        subtype,
        allEntities.get(subtypeData.machine)!
      );
    }
  }

  return {
    entities: filtered.entities,
    reagents,
    recipes,
    reagentSources: filtered.reagentSources,
    methodEntities: resolvedMethodEntities,
    microwaveRecipeTypeEntities,
    names,
  };
};

/**
 * Formats a Fluent message (or `message.attribute`) from the bundle, returning
 * null if the message does not exist or fails to format.
 */
const formatMessage = (
  bundle: FluentBundle,
  id: string | undefined
): string | null => {
  if (!id) {
    return null;
  }
  const message = bundle.getMessage(id);
  if (!message?.value) {
    return null;
  }
  const errors: Error[] = [];
  const text = bundle.formatPattern(message.value, null, errors).trim();
  if (errors.length > 0 || text === '') {
    return null;
  }
  return text;
};

/**
 * Resolves display names the same way the game does: entity names come from
 * `ent-<ID>` in the locale (falling back to the prototype's `name`), reagent
 * names from the reagent's `name` key, and recipe group names from the
 * guidebook's `guide-entry-<group>-recipes` entries.
 */
const resolveNames = (
  bundle: FluentBundle,
  fallbackBundle: FluentBundle,
  entities: ResolvedEntityMap,
  reagents: Iterable<{ readonly id: ReagentId; readonly name: string }>,
  groups: ReadonlySet<string>
): LocalizedNames => {
  const tryBoth = (id: string): string | null =>
    formatMessage(bundle, id) ?? formatMessage(fallbackBundle, id);

  const entityNames = new Map<EntityId, string>();
  for (const [id, entity] of entities) {
    entityNames.set(id, tryBoth(`ent-${id}`) ?? entity.name);
  }

  const reagentNames = new Map<ReagentId, string>();
  for (const reagent of reagents) {
    reagentNames.set(reagent.id, tryBoth(reagent.name) ?? reagent.id);
  }

  const groupNames = new Map<string, string>();
  for (const group of groups) {
    const key = group.toLowerCase();
    const name =
      tryBoth(`guide-entry-${key}-recipes`) ??
      // "Breads" -> "guide-entry-bread-recipes"
      (key.endsWith('s') ? tryBoth(`guide-entry-${key.slice(0, -1)}-recipes`) : null) ??
      // "BarsAndCookies" -> "Bars And Cookies"
      group.replace(/([a-z])([A-Z])/g, '$1 $2');
    groupNames.set(group, name);
  }

  return {
    entities: entityNames,
    reagents: reagentNames,
    groups: groupNames,
  };
};

const resolveRecipeSubtype = (
  recipe: MicrowaveMealRecipe,
  defaultSubtype: string | undefined
): string | readonly string[] | undefined => {
  const subtype = recipe.recipeType;
  if (Array.isArray(subtype)) {
    switch (subtype.length) {
      case 0:
        return defaultSubtype;
      case 1:
        return subtype[0];
      default:
        return subtype;
    }
  }
  return subtype ?? defaultSubtype;
};

const createFluentBundle = (
  localeDir: string,
  gameLocale: string
): FluentBundle => {
  const ftlPaths =
    globSync('**/*.ftl', { cwd: localeDir })
      .sort()
      .map(filePath => resolve(localeDir, filePath));
  if (ftlPaths.length === 0) {
    throw new Error(`No .ftl files found in ${localeDir}`);
  }

  const bundle = new FluentBundle(gameLocale, {
    useIsolating: false,
  });

  for (const path of ftlPaths) {
    const source = readFileTextWithoutTheStupidBOM(path);
    const resource = new FluentResource(source);
    // Duplicate IDs: the first definition wins (paths are sorted, so this is
    // deterministic).
    bundle.addResource(resource);
  }

  return bundle;
};

const convertMicrowaveSolids = (
  recipe: MicrowaveMealRecipe,
  stacks: StackMap,
  anyRecipeHasStacks: boolean
): Record<EntityId, number> => {
  const result: Record<EntityId, number> = {};
  for (const [id, qty] of recipeSolids(recipe, stacks, anyRecipeHasStacks)) {
    result[id] = qty;
  }
  return result;
};

const convertMicrowaveReagents = (
  reagents: Readonly<Record<string, number>>
): Record<string, Reactant> => {
  const result: Record<string, Reactant> = {};
  for (const [id, amount] of Object.entries(reagents)) {
    result[id] = { amount };
  }
  return result;
};

function* reactionRecipes(
  reactions: readonly ReactionPrototype[]
): Generator<[string, ResolvedRecipe]> {
  for (const reaction of reactions) {
    const reagentResult = getReagentResult(reaction);
    const solidResult = getSolidResult(reaction);
    // Add an arbitrary prefix to prevent collisions.
    const id = `r!${reaction.id}`;

    if (
      reaction.requiredMixerCategories &&
      reaction.requiredMixerCategories.length > 0
    ) {
      for (const category of reaction.requiredMixerCategories) {
        const type = MixerCategoryToStepType.get(category);
        if (!type) {
          continue;
        }

        const recipe = new ConstructRecipeBuilder();
        if (reagentResult) {
          recipe
            .withReagentResult(reagentResult[0])
            .withResultQty(reagentResult[1]);
        } else {
          recipe.withSolidResult(solidResult!);
        }

        recipe.mix(reaction.reactants);
        if (reaction.minTemp) {
          recipe.heatMixture(reaction.minTemp, reaction.maxTemp);
        }
        recipe.pushStep({ type });

        yield [`${id}:${type}`, recipe.toRecipe()];
      }
    } else {
      yield [id, {
        method: 'mix',
        solidResult,
        reagentResult: reagentResult?.[0] ?? null,
        resultQty: reagentResult?.[1] ?? 1,
        minTemp: reaction.minTemp ?? 0,
        maxTemp: reaction.maxTemp && isFinite(reaction.maxTemp)
          ? reaction.maxTemp
          : null,
        reagents: reaction.reactants,
        solids: {},
        group: DefaultRecipeGroup,
      }];
    }
  }
}
