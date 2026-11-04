/**
 * English plural: `pluralEn(1, 'recipe', 'recipes')` -> 'recipe'.
 * Returns only the word; callers include the number themselves.
 */
export const pluralEn = (n: number, one: string, other: string): string =>
  n === 1 ? one : other;

/**
 * Russian plural with three forms:
 * `pluralRu(n, 'рецепт', 'рецепта', 'рецептов')`
 * - one:  1, 21, 31, ... (but not 11)
 * - few:  2–4, 22–24, ... (but not 12–14)
 * - many: everything else (0, 5–20, 25–30, ...)
 * Fractional numbers use the "few" form ("1,5 единицы").
 * Returns only the word; callers include the number themselves.
 */
export const pluralRu = (
  n: number,
  one: string,
  few: string,
  many: string
): string => {
  if (!Number.isInteger(n)) {
    return few;
  }
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
};
