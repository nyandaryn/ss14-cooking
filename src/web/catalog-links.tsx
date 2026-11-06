import { ReactionCard } from './chemical-reaction';
import { CatalogIcon } from './sprites/catalog';
import { ManufacturingCard, VendorSource } from './production';
import { findRelatedResources, hasRelatedResources, RelatedData, ResourceKind } from './related-resources';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { RecipePopup, ReagentInfoPopup, EntitySourcesPopup } from './recipe/popup';
import { Link, useSearchParams } from 'react-router';
import { Recipe as RecipeData } from '../types';
import { DepartmentCatalog } from '../catalog-types';
import { useGameData } from './context';
import { useLang } from './i18n';
import { useUrl } from './url';
import { DepartmentHeading } from './department-heading';

export const isMedicalRecipe = (r: RecipeData) => r.method === 'microwave' && [r.subtype].flat().includes('MedicalAssembler');
export const reagentPath = (catalog: DepartmentCatalog, id: string) => catalog.drinks.includes(id) ? '/drinks' : catalog.botanical.includes(id) ? '/botany' : '/medicine';

export const useCatalogLinks = () => {
  const { catalog, recipeList } = useGameData();
  const [params] = useSearchParams();
  const make = (path: string, values: Record<string, string>) => {
    const query = new URLSearchParams(values);
    const fork = params.get('fork');
    if (fork) query.set('fork', fork);
    return `${path}?${query}`;
  };
  return {
    reagent: (id: string) => {
      const recipe = !catalog.drinks.includes(id) && !catalog.medicine.includes(id) && !catalog.botanical.includes(id)
        ? recipeList.find(r => r.reagentResult === id && !isMedicalRecipe(r)) : undefined;
      return recipe ? make('/', { recipe: recipe.id }) : make(reagentPath(catalog, id), { view: 'chemistry', reagent: id });
    },
    entity: (id: string) => make('/reference', { entity: id }),
    plant: (id: string) => make('/botany', { plant: id }),
    recipe: (r: RecipeData) => make(isMedicalRecipe(r) ? '/medicine' : '/', { ...(isMedicalRecipe(r) ? { view: 'assembler' } : {}), recipe: r.id }),
  };
};

const PreviewAncestors = createContext<readonly string[]>([]);
export const ResourceLink = ({ id, kind, children }: { id: string; kind: 'entity' | 'reagent'; children: ReactNode }) => {
  const links = useCatalogLinks();
  const data = useGameData();
  const { lang } = useLang();
  const ancestors = useContext(PreviewAncestors);
  const key = `${kind}:${id}`;
  const link = <Link to={links[kind](id)} aria-label={children === '↗' ? `${lang === 'ru' ? 'Источники и рецепты' : 'Sources and recipes'}: ${id}` : undefined}>{children !== '↗' && <CatalogIcon kind={kind} id={id}/>} {children}</Link>;
  // Arrow links already sit inside cooking ingredient previews. Avoid duplicate
  // triggers there, and cycles when a preview links to its own result.
  if (children === '↗' || ancestors.includes(key)) return link;
  const recipes = data.recipeList.filter(r => kind === 'entity' ? r.solidResult === id : r.reagentResult === id).map(r => r.id);
  let preview;
  if (kind === 'reagent') {
    const hasSources = data.catalog.reagents.find(r => r.id === id)?.plantMetabolism?.length || recipes.length || data.catalog.reactions.some(r => r.products.some(p => p.reagent.id === id)) || data.catalog.extractions.some(e => e.reagent.id === id) || data.catalog.manufacturing.some(r => r.reagentResults.some(p => p.reagent.id === id));
    if (!hasSources) return link;
    preview = <ReagentInfoPopup reagentId={id} recipes={recipes} sources={[]}>{link}</ReagentInfoPopup>;
  } else if (recipes.length) {
    preview = <RecipePopup id={recipes}>{link}</RecipePopup>;
  } else {
    if (!hasRelatedResources(findRelatedResources(data, id, kind))) return link;
    preview = <EntitySourcesPopup id={id}>{link}</EntitySourcesPopup>;
  }
  return <PreviewAncestors.Provider value={[...ancestors, key]}>{preview}</PreviewAncestors.Provider>;
};

/** Render the panel only when it contains useful links; mount lists on demand. */
export const RelatedResources = ({ id, kind, excludeRecipeId }: { id: string; kind: ResourceKind; excludeRecipeId?: string }) => {
  const data = useGameData();
  const related = useMemo(() => findRelatedResources(data, id, kind, excludeRecipeId), [data, id, kind, excludeRecipeId]);
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  if (!hasRelatedResources(related)) return null;
  return <details className='related-resources' onToggle={e => setOpen(e.currentTarget.open)}><summary>{lang === 'ru' ? 'Источники и использование в рецептах' : 'Sources & recipe uses'}</summary>
    {open && <RelatedBody kind={kind} related={related} alternative={Boolean(excludeRecipeId)}/>}
  </details>;
};

export const RelatedBody = ({ kind, related, alternative = false }: { kind: ResourceKind; related: RelatedData; alternative?: boolean }) => {
  const data = useGameData();
  const url = useUrl();
  const links = useCatalogLinks();
  const { lang } = useLang();
  const ru = lang === 'ru';
  const name = (r: RecipeData) => data.entityMap.get(r.solidResult ?? '')?.name ?? data.reagentMap.get(r.reagentResult ?? '')?.name ?? r.id;
  const sourceDescription = (r: RecipeData) => {
    const inputs = [
      ...Object.entries(r.solids).map(([id, qty]) => `${qty} × ${data.entityMap.get(id)?.name ?? id}`),
      ...Object.entries(r.reagents).map(([id, ingredient]) => `${ingredient.amount} u ${data.reagentMap.get(id)?.name ?? id}`),
    ].join(' + ');
    const justCutting = r.method === 'construct' && r.steps.some(step => step.type === 'cut') && r.steps.every(step => ['start', 'cut', 'alsoMakes'].includes(step.type));
    const action = justCutting ? (ru ? 'Нарезать' : 'Slice') : (ru ? 'Приготовить' : 'Prepare');
    return `${action}: ${inputs} → ${r.resultQty ?? 1} ${r.reagentResult ? 'u' : (ru ? 'шт.' : 'pcs')}`;
  };
  const list = (items: RecipeData[], sources = false) => <ul>{items.map(r => <li key={r.id}><Link to={links.recipe(r)}><CatalogIcon kind={r.solidResult ? 'entity' : 'reagent'} id={r.solidResult ?? r.reagentResult ?? ''}/>{sources ? sourceDescription(r) : name(r)}</Link></li>)}</ul>;
  return <div className='related-body'>
    {(related.sources.length > 0 || related.plants.length > 0 || (kind === 'reagent' && related.extractions.length > 0)) && <h3>{alternative ? (ru ? 'Другие способы получения' : 'Other ways to obtain') : (ru ? 'Как получить' : 'How to obtain')}</h3>}
    {related.manufacturing.map(r => <ManufacturingCard key={r.id} recipe={r}/>)}
    {related.vendors.map(v => <VendorSource key={v.machine.id} vendor={v}/>)}
    {related.sources.length > 0 && list(related.sources, true)}
    {related.plants.length > 0 && <ul>{related.plants.map(p => <li key={p.id}><Link to={links.plant(p.id)}>{p.name}</Link> — {ru ? 'ботаника' : 'botany'}</li>)}</ul>}
    {kind === 'reagent' && related.extractions.length > 0 && <ul>{related.extractions.map((e, i) => <li key={i}><Link to={links.entity(e.entity.id)}><CatalogIcon id={e.entity.id}/>{e.entity.name}</Link> — {e.method === 'juice' ? (ru ? 'выжать сок' : 'juice') : (ru ? 'измельчить' : 'grind')}, {e.amount} u</li>)}</ul>}
    {kind === 'entity' && related.extractions.length > 0 && <><h3>{ru ? 'Переработка' : 'Processing'}</h3><ul>{related.extractions.map((e, i) => <li key={i}><Link to={links.reagent(e.reagent.id)}><CatalogIcon kind='reagent' id={e.reagent.id}/>{e.reagent.name}</Link> — {e.method === 'juice' ? (ru ? 'выжать сок' : 'juice') : (ru ? 'измельчить' : 'grind')}, {e.amount} u</li>)}</ul></>}
    {(related.uses.length > 0 || related.reactions.length > 0 || related.combinations.length > 0) && <h3>{ru ? 'Где используется' : 'Used in'}</h3>}
    {related.uses.length > 0 && list(related.uses)}
    {related.reactions.map(r => <ReactionCard key={r.id} reaction={r}/>)}
    {related.combinations.length > 0 && <ul>{related.combinations.map(start => <li key={start}><Link to={url.foodSequence} state={{ forEntity: start }}>{data.entityMap.get(start)?.name ?? start}</Link> — {ru ? 'комбинации' : 'combinations'}</li>)}</ul>}
  </div>;
};

export const ReferencePage = () => {
  const [params] = useSearchParams();
  const data = useGameData();
  const { catalog, entityMap } = data;
  const id = params.get('entity') ?? '';
  const related = useMemo(() => findRelatedResources(data, id, 'entity'), [data, id]);
  const entity = entityMap.get(id) ?? catalog.extractions.find(e => e.entity.id === id)?.entity
    ?? catalog.manufacturing?.find(r => r.result.id === id)?.result
    ?? catalog.vending?.flatMap(v => v.items.map(i => i.entity)).find(e => e.id === id)
    ?? catalog.plants.flatMap(p => [...p.products, ...(p.seed ? [p.seed] : [])]).find(v => v.id === id);
  const { lang } = useLang();
  const url = useUrl();
  return <main className='department'>
    <DepartmentHeading code='CATALOG / INGREDIENT' title={[entity?.name ?? 'Ингредиент не найден', entity?.name ?? 'Ingredient not found']} description={['Источники и связанные рецепты выбранной сборки.', 'Sources and related recipes in the selected build.']}/>
    <Link to={url.recipes}>{lang === 'ru' ? '← Кулинария' : '← Cooking'}</Link>
    {entity && <article className='catalog-card'><h2>{lang === 'ru' ? 'Связанные рецепты' : 'Related recipes'}</h2><p className='catalog-id'>{id}</p>{hasRelatedResources(related) ? <RelatedBody kind='entity' related={related}/> : <p className='catalog-note'>{lang === 'ru' ? 'Для этого предмета в сборке не найдено рецептов или источников.' : 'No recipes or sources found for this item in this build.'}</p>}</article>}
  </main>;
};
