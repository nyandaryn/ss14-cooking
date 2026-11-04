import { JimpInstance } from 'jimp';
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import {
  Entity,
  ForkData,
  GameData,
  Reagent,
  Recipe,
} from '../types';
import { SpriteSheetData } from './build-spritesheet';
import {
  ForkListPath,
  GameDataPath,
  SpriteSheetFileName,
  SpriteSheetPath,
} from './constants';
import { mapToObject } from './helpers';
import { EntityId, TagId } from './prototypes';
import { ResolvedGameData } from './resolve-prototypes';
import { ResolvedSpecials } from './resolve-specials';
import {
  LocalizedNames,
  LocalizedString,
  MicrowaveRecipeTypes,
  ResolvedEntity,
} from './types';

export interface ProcessedGameData {
  readonly id: string;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  readonly default: boolean;
  readonly hidden?: boolean;
  readonly resolved: ResolvedGameData;
  readonly foodSequenceStartPoints: ReadonlyMap<TagId, readonly EntityId[]>;
  readonly foodSequenceElements: ReadonlyMap<TagId, readonly EntityId[]>;
  readonly foodSequenceEndPoints: ReadonlyMap<TagId, readonly EntityId[]>;
  readonly specials: ResolvedSpecials,
  readonly sprites: SpriteSheetData;
  readonly microwaveRecipeTypes?: MicrowaveRecipeTypes;
  readonly sortingIdRewrites: Record<string, string>;
  readonly repo: string;
  readonly commitHash: string;
}

export const saveData = async (
  data: readonly ProcessedGameData[]
): Promise<void> => {
  const dir = dirname(__dirname);

  const dataWithSpriteHash = await Promise.all(
    data.map(async d => ({
      ...d,
      spriteHash: await getSpriteHash(d.sprites.sheet),
    }))
  );

  const now = Date.now();
  const index: ForkData[] = [];
  for (const d of dataWithSpriteHash) {
    const langs = Array.from(d.resolved.names.keys());
    const fallbackLang = langs[0];
    const hashes: Record<string, string> = {};
    for (const [lang, names] of d.resolved.names) {
      const entities: Entity[] = [];

      for (const [id, entity] of d.resolved.entities) {
        entities.push({
          id,
          name: names.entities.get(id) ?? entity.name,
          sprite: d.sprites.points.get(id)!,
          traits: getSpecialsMask(entity, d.specials),
          ...getFoodSequenceData(entity, d.foodSequenceStartPoints),
        });
      }

      const reagents: Reagent[] = [];
      for (const [id, reagent] of d.resolved.reagents) {
        reagents.push({
          id,
          name: names.reagents.get(id) ?? reagent.name,
          color: reagent.color,
          sources: d.resolved.reagentSources.get(id) ?? [],
        });
      }

      const ingredients = new Set<string>();

      const recipes: Recipe[] = [];
      for (const [id, recipe] of d.resolved.recipes) {
        recipes.push({ id, ...recipe });

        for (const solid of Object.keys(recipe.solids)) {
          ingredients.add(solid);
        }
      }

      const finalData: GameData = {
        entities,
        reagents,
        ingredients: Array.from(ingredients),
        recipes,
        foodSequenceStartPoints: mapToObject(d.foodSequenceStartPoints),
        foodSequenceElements: mapToObject(d.foodSequenceElements),
        foodSequenceEndPoints: mapToObject(d.foodSequenceEndPoints),

        methodSprites: mapToObject(d.sprites.methods),
        beakerFill: d.sprites.beakerFillPoint,
        microwaveRecipeTypes:
          d.microwaveRecipeTypes &&
          d.sprites.microwaveRecipeTypes
            ? mapToObject(d.sprites.microwaveRecipeTypes, (sprite, subtype) => {
              const def = d.microwaveRecipeTypes![subtype];
              return {
                sprite,
                verb: localize(def.verb, lang, fallbackLang),
                filterSummary: localize(def.filterSummary, lang, fallbackLang),
              };
            })
            : null,
        spriteSheet: SpriteSheetFileName(d.id, d.spriteHash),
        sortingIdRewrites: d.sortingIdRewrites,

        specialTraits: d.specials.map(s => ({
          mask: s.mask,
          hint: localize(s.hint, lang, fallbackLang),
          color: s.color,
          filterName: localize(s.filterName, lang, fallbackLang),
          filterSummary: localize(s.filterSummary, lang, fallbackLang),
        })),
        groupNames: mapToObject(names.groups),
        attributions: d.sprites.attributions,
      };
      const json = JSON.stringify(finalData);
      const hash = getDataHash(json);
      const path = resolve(dir, GameDataPath(d.id, lang, hash));
      if (!existsSync(path)) {
        console.log(`Create: ${path}`);
      }
      writeFileSync(path, json, {
        encoding: 'utf-8',
      });
      hashes[lang] = hash;
    }

    index.push({
      id: d.id,
      hashes,
      name: localizeAll(d.name, langs),
      description: localizeAll(d.description, langs),
      default: d.default,
      hidden: d.hidden || undefined,
      meta: {
        commit: d.commitHash,
        repo: d.repo,
        date: now,
      },
    });
  }

  const indexJson = JSON.stringify(index);
  writeFileSync(resolve(dir, ForkListPath), indexJson, {
    encoding: 'utf-8',
  });

  await Promise.all(dataWithSpriteHash.map(async d => {
    const fullPath = resolve(dir, SpriteSheetPath(d.id, d.spriteHash));
    const png = await d.sprites.sheet.getBuffer('image/png');
    const webp = await sharp(png)
      .webp({
        alphaQuality: 100,
        quality: 100,
        lossless: true,
        preset: 'drawing',
      })
      .toBuffer();
    if (!existsSync(fullPath)) {
      console.log(`Create: ${fullPath}`);
    }
    writeFileSync(fullPath, webp);
  }));
};

const getSpecialsMask = (
  ent: ResolvedEntity,
  specials: ResolvedSpecials
): number => {
  let mask = 0;
  for (const special of specials) {
    if (special.entityMatches(ent)) {
      mask |= special.mask;
    }
  }
  return mask;
};

const getFoodSequenceData = (
  ent: ResolvedEntity,
  foodSequenceStartPoints: ReadonlyMap<TagId, readonly EntityId[]>
): Pick<Entity, 'seqStart' | 'seqElem' | 'seqEnd'> | null => {
  // Can this entity *start* a food sequence?
  const seqStart = ent.foodSequenceStart?.key ? {
    key: ent.foodSequenceStart.key,
    maxCount: ent.foodSequenceStart.maxLayers,
  } : undefined;

  // Can this entity be *part* of a food sequence (middle or end)?
  let seqElem: readonly string[] | undefined;
  let seqEnd: readonly string[] | undefined;
  if (ent.foodSequenceElement) {
    const elem = ent.foodSequenceElement;
    // Each food sequence that the entity can participate in must have
    // a start point. We use this information to show "X can be put in Y"
    // in the UI; if Y is empty, it can't *actually* be put in anything.
    const allElements = Array.from(elem);
    seqElem = allElements
      .filter(([k, e]) => foodSequenceStartPoints.has(k) && !e.final)
      .map(kvp => kvp[0]);
    seqEnd = allElements
      .filter(([k, e]) => foodSequenceStartPoints.has(k) && e.final)
      .map(kvp => kvp[0]);
  }

  return {
    seqStart,
    seqElem: seqElem && seqElem.length > 0 ? seqElem : undefined,
    seqEnd: seqEnd && seqEnd.length > 0 ? seqEnd : undefined,
  };
};

const getSpriteHash = async (sheet: JimpInstance): Promise<string> => {
  const buf = await sheet.getBuffer('image/png');
  return getDataHash(buf);
};

const getDataHash = (data: string | Buffer): string => {
  const hash = createHash('sha1');
  hash.update(data);
  const hex = hash.digest('hex');
  return hex.slice(0, 8);
};

const localize = (
  value: LocalizedString,
  lang: string,
  fallbackLang: string
): string => {
  if (typeof value === 'string') {
    return value;
  }
  const text = value[lang] ?? value[fallbackLang] ?? Object.values(value)[0];
  if (text == null) {
    throw new Error(`Localized string has no values: ${JSON.stringify(value)}`);
  }
  return text;
};

const localizeAll = (
  value: LocalizedString,
  langs: readonly string[]
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const lang of langs) {
    result[lang] = localize(value, lang, langs[0]);
  }
  return result;
};
