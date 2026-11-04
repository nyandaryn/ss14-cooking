import { enableMapSet, setAutoFreeze } from 'immer';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { SpritePoint } from '../types';
import { buildSpriteSheet } from './build-spritesheet';
import { getGitCommitHash } from './commit-hash';
import { filterRelevantPrototypes } from './filter-relevant';
import { EntityId, MicrowaveMealRecipeId, ReagentId } from './prototypes';
import { findResourceFiles, readRawGameData } from './read-raw';
import { resolveComponents } from './resolve-components';
import { ResolvedGameData, resolvePrototypes } from './resolve-prototypes';
import { resolveSpecials } from './resolve-specials';
import { ProcessedGameData, saveData } from './save-data';
import {
  BaselineComparison,
  ForkLocales,
  LocalizedString,
  MethodEntities,
  MicrowaveRecipeTypes,
  ResolvedEntity,
  SpecialDiet,
  SpecialReagent,
} from './types';

interface ForkInfo {
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  /**
   * Site languages to generate data for, mapped to the game's locale folder.
   * The first entry is the fallback language.
   * Optional. Default value: { en: en-US }
   */
  readonly locales?: ForkLocales;
  readonly hidden?: boolean;
  readonly path: string;
  readonly repo: string;
  readonly default?: boolean;
  readonly specialDiets?: SpecialDiet[];
  readonly specialReagents?: SpecialReagent[];
  /** Highlight recipe results that are missing from a baseline repo. */
  readonly baseline?: BaselineComparison;
  readonly methodEntities: MethodEntities;
  readonly mixFillState: string;
  /** Frontier */
  readonly microwaveRecipeTypes?: MicrowaveRecipeTypes;
  readonly sortingIdRewrites?: string[];
  readonly ignoredRecipes?: MicrowaveMealRecipeId[];
  readonly ignoredSpecialRecipes?: string[];
  readonly ignoredFoodSequenceElements?: EntityId[];
  readonly ignoreSourcesOf?: ReagentId[];
  readonly forceIncludeReagentSources?: Record<ReagentId, readonly EntityId[]>;
  readonly spriteOffsets?: Record<string, SpritePoint>;
}

const PrototypesSubPath = './Resources/Prototypes';
const LocaleSubPath = './Resources/Locale';
const DefaultLocales: ForkLocales = { en: 'en-US' };
const TexturesSubPath = './Resources/Textures';

const buildFork = async (id: string, fork: ForkInfo): Promise<ProcessedGameData> => {
  console.log(`Starting work on fork ${id}...`);
  const locales = fork.locales ?? DefaultLocales;

  const commitHash = await getGitCommitHash(fork.path);
  console.log('Generating data from commit:', commitHash);

  const yamlPaths = findResourceFiles(resolve(fork.path, PrototypesSubPath));
  console.log(`Found ${yamlPaths.length} files`);

  const raw = readRawGameData(yamlPaths);
  console.log(`Loaded:\n${
    Object.entries(raw)
      .filter(([, val]) => (val.size ?? val.length) != null)
      .map(([key, val]) => `- ${key}: ${val.size ?? val.length}`)
      .join('\n')
  }`);

  const entities = resolveComponents(raw);

  const filtered = filterRelevantPrototypes(
    raw,
    entities,
    {
      ignoredRecipes: new Set(fork.ignoredRecipes ?? []),
      ignoredSpecialRecipes: new Set(fork.ignoredSpecialRecipes ?? []),
      ignoreSourcesOf: new Set(fork.ignoreSourcesOf ?? []),
      forceIncludeReagentSources: new Map(
        Object.entries(fork.forceIncludeReagentSources ?? {}) as
          [ReagentId, readonly EntityId[]][]
      ),
      ignoredFoodSequenceElements: new Set(
        fork.ignoredFoodSequenceElements ?? []
      ),
    }
  );
  console.log(
    `Filtered: ${
      filtered.recipes.length
    } recipes, ${
      filtered.entities.size
    } entities, ${
      filtered.reagents.size
    } reagents, ${
      filtered.reactions.length
    } reactions, ${
      filtered.specialRecipes.size
    } special recipes`
  );

  const resolved = resolvePrototypes(
    filtered,
    entities,
    resolve(fork.path, LocaleSubPath),
    locales,
    fork.methodEntities,
    fork.microwaveRecipeTypes
  );
  console.log(
    `Resolved ${
      resolved.entities.size
    } entities, ${
      resolved.reagents.size
    } reagents and ${
      resolved.recipes.size
    } recipes`
  );

  const baseline = fork.baseline
    ? {
      ...fork.baseline,
      extraEntities: findExtraResults(resolved, fork.baseline.path),
    }
    : null;

  const specials = resolveSpecials(
    entities,
    fork.specialDiets ?? [],
    fork.specialReagents ?? [],
    baseline
  );
  console.log(`Resolved ${specials.length} special diets and reagents`);

  const sortingIdRewrites = readRewrites(
    fork.sortingIdRewrites ?? [],
    resolved.entities
  );
  addSortLastRewrites(sortingIdRewrites, resolved, fork.microwaveRecipeTypes);

  const spriteSheet = await buildSpriteSheet(
    resolved,
    resolve(fork.path, TexturesSubPath),
    fork.mixFillState,
    new Map(Object.entries(fork.spriteOffsets ?? {}))
  );
  console.log(`Built sprite sheet for ${spriteSheet.spriteCount} sprites`);

  console.log(`Finished building ${id}`);

  return {
    id,
    name: fork.name,
    description: fork.description,
    default: fork.default ?? false,
    hidden: fork.hidden,
    resolved,
    foodSequenceStartPoints: filtered.foodSequenceStartPoints,
    foodSequenceElements: filtered.foodSequenceElements,
    foodSequenceEndPoints: filtered.foodSequenceEndPoints,
    specials,
    sprites: spriteSheet,
    microwaveRecipeTypes: fork.microwaveRecipeTypes,
    sortingIdRewrites,
    commitHash,
    repo: fork.repo,
  };
};

const readRewrites = (
  paths: readonly string[],
  entities: ReadonlyMap<string, ResolvedEntity>
): Record<string, string> =>
  paths.reduce((result, path) => {
    const rewrites = readYamlFile(path) as Record<string, string>;

    for (const [key, value] of Object.entries(rewrites)) {
      if (!entities.has(key)) {
        console.warn(`Unknown entity prototype ID in rewrite file: ${key}`);
      }
      result[key] = value;
    }

    return result;
  }, {} as Record<string, string>);

/**
 * Finds recipe results (entities) that the baseline repo can't make: either
 * the entity doesn't exist there, or none of the recipes that make it do.
 * Recipes are matched by prototype ID (microwave recipes, reactions); recipes
 * derived from entity components (cutting, heating, etc.) by their result.
 */
const findExtraResults = (
  resolved: ResolvedGameData,
  baselinePath: string
): Set<string> => {
  const yamlPaths = findResourceFiles(resolve(baselinePath, PrototypesSubPath));
  const raw = readRawGameData(yamlPaths);
  const baseRecipes = new Set<string>(raw.recipes.map(r => r.id));
  const baseReactions = new Set<string>(raw.reactions.map(r => r.id));
  console.log(
    `Baseline: ${raw.entities.size} entities, ${
      baseRecipes.size
    } microwave recipes, ${baseReactions.size} reactions`
  );

  // result entity -> can the baseline make it in at least one of these ways?
  const makeableInBaseline = new Map<string, boolean>();
  for (const [id, recipe] of resolved.recipes) {
    const result = recipe.solidResult;
    if (!result) {
      continue;
    }
    let inBaseline: boolean;
    if (!raw.entities.has(result)) {
      inBaseline = false;
    } else if (recipe.method === 'microwave') {
      inBaseline = baseRecipes.has(id);
    } else if (id.startsWith('r!')) {
      // Reaction recipes: `r!<ReactionId>` or `r!<ReactionId>:<step>`.
      inBaseline = baseReactions.has(id.slice(2).split(':')[0]);
    } else {
      // Derived from the entity's components; the entity exists upstream.
      inBaseline = true;
    }
    makeableInBaseline.set(
      result,
      (makeableInBaseline.get(result) ?? false) || inBaseline
    );
  }

  const extra = new Set<string>();
  for (const [entityId, inBaseline] of makeableInBaseline) {
    if (!inBaseline) {
      extra.add(entityId);
    }
  }
  console.log(`Found ${extra.size} recipe results not in the baseline`);
  return extra;
};

/**
 * Pushes results of recipes made only in `sortLast` machines to the end of the
 * default sort order. An entity that can also be made some other way keeps its
 * normal position.
 */
const addSortLastRewrites = (
  rewrites: Record<string, string>,
  resolved: ResolvedGameData,
  microwaveRecipeTypes: MicrowaveRecipeTypes | undefined
): void => {
  if (!microwaveRecipeTypes) {
    return;
  }
  const sortLastTypes = new Set(
    Object.entries(microwaveRecipeTypes)
      .filter(([, def]) => def.sortLast)
      .map(([type]) => type)
  );
  if (sortLastTypes.size === 0) {
    return;
  }

  const onlyInSortLast = new Map<string, boolean>();
  for (const recipe of resolved.recipes.values()) {
    const result = recipe.solidResult;
    if (!result) {
      continue;
    }
    const subtypes =
      recipe.method === 'microwave' && recipe.subtype != null
        ? (Array.isArray(recipe.subtype) ? recipe.subtype : [recipe.subtype])
        : [];
    const isSortLast =
      subtypes.length > 0 && subtypes.every(t => sortLastTypes.has(t));
    onlyInSortLast.set(result, (onlyInSortLast.get(result) ?? true) && isSortLast);
  }

  for (const [entityId, sortLast] of onlyInSortLast) {
    if (sortLast) {
      rewrites[entityId] = `zzz~${rewrites[entityId] ?? entityId}`;
    }
  }
};

const readYamlFile = (path: string): unknown => {
  const source = readFileSync(path, 'utf-8');
  return parse(source, {
    // Shut up about unresolved tags
    logLevel: 'silent',
  });
};

const main = async () => {
  const forkListPath = process.argv[2];
  if (!forkListPath) {
    console.error('Received no fork list path!');
    return;
  }

  const forkList = readYamlFile(forkListPath) as Readonly<Record<string, ForkInfo>>;

  const forkData: ProcessedGameData[] = [];
  for (const [id, fork] of Object.entries(forkList)) {
    forkData.push(await buildFork(id, fork));
    console.log('');
  }

  console.log('Finished building everything. Writing data...');
  await saveData(forkData);
  console.log('Done.');
};

// I love you, Immer, yet you wound me so.
enableMapSet();
// Weird perf. issues, loads of objects to process.
setAutoFreeze(false);

main().catch(err => {
  console.error(err);
  process.exit(1);
});
