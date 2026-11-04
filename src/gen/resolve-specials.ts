import {
  BaselineComparison,
  LocalizedString,
  ResolvedEntity,
  SpecialDiet,
  SpecialReagent,
} from './types';

export type ResolvedSpecials = readonly Special[];

export interface Special {
  readonly mask: number;
  readonly hint: LocalizedString;
  readonly color: string;
  readonly filterName: LocalizedString;
  readonly filterSummary: LocalizedString;
  readonly entityMatches: (ent: ResolvedEntity) => boolean;
}

// Hard limitation imposed by JS bitwise operations: we're limited to 32 bits,
// and in most cases it's *signed*. Setting this to 31 makes things less likely
// to fail for stupid reasons.
const MAX_COUNT = 31;

export const resolveSpecials = (
  allEntities: ReadonlyMap<string, ResolvedEntity>,
  diets: readonly SpecialDiet[],
  reagents: readonly SpecialReagent[],
  baseline: (BaselineComparison & {
    readonly extraEntities: ReadonlySet<string>;
  }) | null = null
): ResolvedSpecials => {
  const totalCount = diets.length + reagents.length + (baseline ? 1 : 0);
  if (totalCount >= MAX_COUNT) {
    throw new Error(
      `Can't have more than ${
        MAX_COUNT
      } special diets and special reagents in total; got ${
        totalCount
      }`
    );
  }

  let result: Special[] = [];

  for (const diet of diets) {
    // If we get this far, then the we *know* the organ must exist.
    const { stomach } = allEntities.get(diet.organ)!;
    const digestibleTags = stomach?.tags;
    const digestibleComps = stomach?.components;
    if (!digestibleTags || !digestibleComps) {
      throw new Error(`Organ ${diet.organ} has no tags or components to filter by`);
    }
    const excludeReagents =
      diet.excludeFoodsWith &&
      new Set(diet.excludeFoodsWith);
    const mask = 1 << result.length;
    result.push({
      mask,
      hint: diet.hint,
      color: diet.color,
      filterName: diet.filterName,
      filterSummary: diet.filterSummary,
      entityMatches: ent =>
        (
          digestibleTags.some(t => ent.tags.has(t)) ||
          digestibleComps.some(c => ent.components.has(c))
        ) && (
          // There are no reagents to exclude, or...
          excludeReagents == null ||
          // ... all excluded reagents are absent from ent.reagents
          excludeReagents.isDisjointFrom(ent.reagents)
        ),
    });
  }

  for (const reagent of reagents) {
    const mask = 1 << result.length;
    result.push({
      mask,
      hint: reagent.hint,
      color: reagent.color,
      filterName: reagent.filterName,
      filterSummary: reagent.filterSummary,
      entityMatches: ent => ent.reagents.has(reagent.id),
    });
  }

  if (baseline) {
    const mask = 1 << result.length;
    result.push({
      mask,
      hint: baseline.hint,
      color: baseline.color,
      filterName: baseline.filterName,
      filterSummary: baseline.filterSummary,
      entityMatches: ent => baseline.extraEntities.has(ent.id),
    });
  }

  return result;
};
