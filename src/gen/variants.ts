/** CreateVariants is a zipped expansion, not a Cartesian product. */
export function expandPrototypeVariants(prototype: unknown): unknown[] {
  const counts = new Set<number>();
  const visit = (value: any): void => {
    if (!value || typeof value !== 'object') return;
    if (value['!type'] === 'CreateVariants') {
      const choices = value.values ?? value.sequences ?? value.mappings;
      if (!Array.isArray(choices)) throw new Error('Unsupported CreateVariants shape');
      counts.add(choices.length); return;
    }
    Object.values(value).forEach(visit);
  };
  visit(prototype);
  if (!counts.size) return [prototype];
  if (counts.size !== 1 || counts.has(0)) throw new Error('Mismatched CreateVariants lengths');
  const pick = (value: any, index: number): any => {
    if (!value || typeof value !== 'object') return value;
    if (value['!type'] === 'CreateVariants') return pick((value.values ?? value.sequences ?? value.mappings)[index], index);
    if (Array.isArray(value)) return value.map(v => pick(v, index));
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, pick(v, index)]));
  };
  return Array.from({ length: [...counts][0] }, (_, i) => pick(prototype, i));
}
