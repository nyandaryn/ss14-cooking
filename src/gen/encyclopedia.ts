import { creatureGroup } from '../reference-groups';
import { Encyclopedia, ReferenceEntity, CraftEntry } from '../encyclopedia-types';
import { entityAndAncestors } from './helpers';
import { EntityId } from './prototypes';
import { RawGameData } from './read-raw';
import { ResolvedEntityMap } from './types';
import gasNotes from './gas-notes.json';

/** Catalogs intentionally include concrete prototypes, including event/admin variants. */
export function buildEncyclopedia(raw: RawGameData, entities: ResolvedEntityMap, t: (key: string | undefined) => string | null): Encyclopedia {
  const ref = (id: string) => ({ id, name: t(`ent-${id}`) ?? entities.get(id as EntityId)?.name ?? id });
  const maps = (type: string): Map<string, any> => new Map((raw.reference ?? []).filter(p => p.type === type).map(p => [p.id, p]));
  const resolve = (map: Map<string, any>, id: string, seen = new Set<string>()): any => {
    if (seen.has(id)) throw new Error(`Prototype inheritance cycle: ${id}`);
    const p = map.get(id); if (!p) return {};
    return Object.assign({}, ...[p.parent ?? []].flat().reverse().map(v => resolve(map, v, new Set([...seen, id]))), p);
  };
  const components = new Map<string, Record<string, any>>();
  const descriptions = new Map<string, string>();
  for (const entity of entities.values()) {
    if (entity.abstract) continue;
    const c: Record<string, any> = {}; let description = '';
    for (const a of entityAndAncestors(raw.entities.get(entity.id)!, raw.entities)) {
      for (const v of a.components ?? []) c[v.type] = { ...c[v.type], ...v };
      description = t(`ent-${a.id}.desc`) ?? (typeof a.description === 'string' ? a.description : description);
    }
    components.set(entity.id, c); descriptions.set(entity.id, description);
  }
  const creatures: ReferenceEntity[] = [], items: ReferenceEntity[] = [];
  const describe = (id: string, c: Record<string, any>, categories: string[]): ReferenceEntity => {
    const stats: ReferenceEntity['stats'] = [];
    const add = (label: string, value: unknown) => { if (value !== undefined && value !== null && value !== '') stats.push({ label, value: typeof value === 'object' ? Object.entries(value).map(([k,v]) => `${k}: ${v}`).join(' · ') : String(value) }); };
    add('damage', c.MeleeWeapon?.damage?.types); add('attackRate', c.MeleeWeapon?.attackRate);
    add('armor', c.Armor?.modifiers?.coefficients); add('speed', c.MovementSpeedModifier?.baseSprintSpeed);
    add('thresholds', c.MobThresholds?.thresholds); add('tools', c.Tool?.qualities?.join(', '));
    add('size', c.Item?.size); add('slots', [c.Clothing?.slots ?? []].flat().join(', '));
    add('factions', c.NpcFactionMember?.factions?.join(', '));
    return { ...ref(id), description: descriptions.get(id) ?? '', categories, stats };
  };
  for (const [id, c] of components) {
    if (c.MobState || c.MobThresholds) creatures.push({ ...describe(id, c, [c.BorgBrain || c.Silicon ? 'silicon' : c.HumanoidAppearance ? 'humanoid' : 'creature']), group: creatureGroup([...entityAndAncestors(raw.entities.get(id as EntityId)!, raw.entities)].map(a => a.id), c) });
    if (c.Item) {
      const cats: string[] = [];
      if (c.Armor) cats.push('armor');
      if (c.Gun || c.Projectile || c.Grenade || c.Explosive || Object.values(c.MeleeWeapon?.damage?.types ?? {}).some(v => Number(v) > 0) || Object.values(c.ThrowableDamage?.damage?.types ?? {}).some(v => Number(v) > 0)) cats.push('weapon');
      if (c.Tool || c.MultipleTool || c.WeldTool) cats.push('tool');
      if (c.Clothing && (id.startsWith('Clothing') || [c.Clothing.slots ?? []].flat().some(slot => ['head', 'eyes', 'mask', 'innerclothing', 'outerclothing', 'gloves', 'shoes', 'neck', 'ears'].includes(String(slot).toLowerCase())))) cats.push('clothing');
      if (c.Storage) cats.push('storage');
      if (c.Food || c.Edible || c.Drink) cats.push('food');
      if (c.Stack) cats.push('material');
      if (c.Healing || c.Hypospray || c.Syringe) cats.push('medical');
      items.push(describe(id, c, cats.length ? cats : ['other']));
    }
  }
  const constructions = maps('construction');
  const crafting: CraftEntry[] = [];
  for (const [id, own] of constructions) {
    if (own.abstract) continue;
    const p = resolve(constructions, id);
    if (p.hide === true) continue;
    const graph: any = raw.constructionGraphs.get(p.graph);
    if (!graph) continue;
    const nodes = new Map<string, any>((graph.graph ?? []).map((n: any) => [n.node, n]));
    const target = nodes.get(p.targetNode); const start = p.startNode ?? graph.start ?? 'start';
    const queue: { node: string; edges: any[] }[] = [{ node: start, edges: [] }];
    const seen = new Set<string>(); let path: any[] | undefined;
    while (queue.length) {
      const current = queue.shift()!;
      if (current.node === p.targetNode) { path = current.edges; break; }
      if (seen.has(current.node)) continue; seen.add(current.node);
      for (const edge of nodes.get(current.node)?.edges ?? []) queue.push({ node: edge.to, edges: [...current.edges, edge] });
    }
    const result = typeof target?.entity === 'string' ? ref(target.entity) : null;
    const steps = (path ?? []).flatMap(e => (e.steps ?? []).map((s: any) => {
      const stack: any = raw.stacks.get(s.material);
      const name = t(s.name) ?? (s.material ? (stack?.spawn ? ref(stack.spawn).name : s.material) : s.tool ? t(`tool-quality-${String(s.tool).toLowerCase()}-name`) ?? s.tool : s.tag ?? s.component ?? s['!type'] ?? 'Interaction');
      return { name, amount: s.amount ?? null, seconds: s.doAfter ?? null, kind: s.tool ? 'tool' : s.material ? 'material' : s.tag ? 'tag' : 'interaction' };
    }));
    const conditionLabel = (c: any): string => {
      const kind = c['!type'] ?? c.type ?? String(c);
      const details = Object.entries(c).filter(([key]) => key !== '!type' && key !== 'type').map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`).join(', ');
      return kind + (details ? ` (${details})` : '');
    };
    const conditions = [...(p.conditions ?? []), ...(path ?? []).flatMap(e => e.conditions ?? [])].map(conditionLabel);
    crafting.push({ id, name: t(p.name) ?? result?.name ?? id, description: t(p.description) ?? (result ? descriptions.get(result.id) ?? '' : ''), category: t(p.category) ?? p.category ?? 'Other', result, start, target: p.targetNode ?? '', conditions, steps, reachable: path !== undefined });
  }
  const lawMap = maps('siliconLaw');
  const laws: Encyclopedia['laws'] = [...maps('siliconLawset').values()].filter(p => !p.abstract).map(p => ({
    id: p.id, name: t(p.name) ?? p.id, category: 'lawset', ionWeight: maps('weightedRandom').get('IonStormLawsets')?.weights?.[p.id],
    laws: (p.laws ?? []).map((id: string) => { const law = lawMap.get(id); return { order: law?.order ?? 0, text: t(law?.lawString) ?? id }; }).sort((a: any, b: any) => a.order - b.order),
    typeUsers: [...maps('borgType').values()].filter(b => b.dummyPrototype && (b.addComponents ?? []).some((c: any) => c.type === 'SiliconLawProvider' && c.laws === p.id)).map(b => ref(b.dummyPrototype)),
    users: [...components].filter(([, c]) => c.SiliconLawProvider && c.SiliconLawProvider.laws === p.id).map(([id]) => ref(id)),
  }));
  for (const p of maps('ionLaw').values()) {
    const variants = [...new Set(['', '::part', '::plural', '::plural-part'].map(suffix => t(p.lawString + suffix) ?? p.lawString))];
    laws.push({ id: p.id, name: variants[0].length > 80 ? variants[0].slice(0, 77) + '…' : variants[0], category: 'ion', users: [], laws: variants.map(text => ({ order: 0, text })) });
  }
  const gasMap = maps('gas');
  const gasRef = (id: string) => ({ id, name: t(gasMap.get(id)?.name) ?? id });
  const gases = [...gasMap.values()].map(p => ({ ...gasRef(p.id), description: t(raw.reagents.get(p.reagent)?.desc as string) ?? '', color: p.color ?? '#aaa', heatCapacity: p.molarHeatCapacity, molarMass: p.molarMass, reagent: p.reagent ?? null }));
  const gasReactions = [...maps('gasReaction').values()].map(p => {
    const effects: string[] = (p.effects ?? []).map((e: any) => e['!type']);
    const notes = effects.map((e: string) => (gasNotes as Record<string, { ru: string; en: string; titleRu: string; titleEn: string; products: string[]; source: string }>)[e]).filter(Boolean);
    // The locale marker is supplied through Fluent, including English fallback builds.
    const ru = t('gas-oxygen')?.toLowerCase() === 'кислород';
    return { id: p.id, name: notes.map(n => ru ? n.titleRu : n.titleEn).join(" · ") || p.id, requirements: Object.entries(p.minimumRequirements ?? {}).map(([id, amount]) => ({ gas: gasRef(id), amount: Number(amount) })), minTemp: p.minimumTemperature ?? null, maxTemp: p.maximumTemperature ?? null, minEnergy: p.minimumEnergy ?? null, effects, explanation: notes.map(n => ru ? n.ru : n.en).join('\n') + (gasMap.has('HyperNoblium') && !['AmmoniaOxygenReaction', 'N2ODecompositionReaction'].some(e => effects.includes(e)) ? (ru ? '\nПри ≥ 5 моль гипер-ноблия и температуре > 20 K реакция подавляется.' : '\nSuppressed by ≥ 5 mol hyper-noblium at temperatures > 20 K.') : ''), products: [...new Set(notes.flatMap(n => n.products))], source: notes[0]?.source ?? '' };
  });
  return { creatures, items, crafting, laws, gases, gasReactions };
}
