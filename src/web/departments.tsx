import { MedicineEffects } from './medicine-effects';
import { groupMedicines, medicineGroups } from './medicine-groups';
import { CatalogIcon } from './sprites/catalog';
import { DepartmentHeading, CatalogSelection } from './department-heading';
import { RelatedResources, ResourceLink } from './catalog-links';
import { ReactElement, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CatalogRef, ChemicalReaction, PlantEntry } from '../catalog-types';
import { useGameData } from './context';
import { normalizeSearchText } from './helpers';
import { useLang } from './i18n';
import { RecipeList } from './recipe-list';
import { ReactionCard } from './chemical-reaction';

const useText = () => {
  const { lang } = useLang();
  return (ru: string, en: string) => lang === 'ru' ? ru : en;
};
const number = (value: number) => Number(value.toFixed(2));

export const Medicine = (): ReactElement => {
  const [params, setParams] = useSearchParams();
  const text = useText();
  const { microwaveRecipeTypes } = useGameData();
  const hasAssembler = Boolean(microwaveRecipeTypes?.MedicalAssembler);
  const assembled = hasAssembler && params.get('view') === 'assembler';
  return <main className='department department--medicine'>
    <DepartmentHeading code='03 / MEDICAL' title={['Медицина', 'Medicine']} description={['Синтез лекарств, промежуточные реагенты и медицинские изделия.', 'Medicine synthesis, precursor reagents and medical supplies.']}/>
    <div className='department-modes' role='group' aria-label={text('Каталог медицины', 'Medical catalog')}>
      {(hasAssembler ? [false, true] : [false]).map(value => <button key={String(value)} aria-pressed={assembled === value} onClick={() => setParams(p => {
        const next = new URLSearchParams(p); next.set('view', value ? 'assembler' : 'chemistry'); next.delete('reagent'); return next;
      })}>{value ? text('Мед-о-мат', 'Med-O-Mat') : text('Лекарства и химия', 'Medicine & chemistry')}</button>)}
    </div>
    {assembled ? <RecipeList section='medicine' key='medical-recipes'/> : <Chemistry department='medicine'/>}
  </main>;
};

export const Drinks = (): ReactElement => <main className='department department--drinks'>
  <DepartmentHeading code='02 / BAR' title={['Напитки', 'Drinks']} description={['Коктейли, соки и другие напитки: пропорции, температура и условия смешивания.', 'Cocktails, juices and other drinks: ratios, temperatures and mixing requirements.']}/>
  <Chemistry department='drinks'/>
</main>;

export const Botany = (): ReactElement => {
  const [params, setParams] = useSearchParams();
  const text = useText();
  const chemicals = params.get('view') === 'chemistry';
  return <main className='department department--botany'>
    <DepartmentHeading code='04 / BOTANY' title={['Ботаника', 'Botany']} description={['Растения, мутации и урожай выбранной сборки.', 'Plants, mutations and harvests in the selected build.']}/>
    <div className='department-modes' role='group' aria-label={text('Каталог ботаники', 'Botany catalog')}>
      {[false, true].map(value => <button key={String(value)} aria-pressed={chemicals === value} onClick={() => setParams(p => {
        const next = new URLSearchParams(p); next.set('view', value ? 'chemistry' : 'plants'); next.delete('reagent'); next.delete('plant'); return next;
      })}>{value ? text('Удобрения и химия', 'Fertilizers & chemistry') : text('Растения', 'Plants')}</button>)}
    </div>
    {chemicals ? <Chemistry department='botanical'/> : <PlantCatalog/>}
  </main>;
};

const PlantCatalog = (): ReactElement => {
  const { catalog } = useGameData();
  const text = useText();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [harvest, setHarvest] = useState('all');
  const [mutantsOnly, setMutantsOnly] = useState(false);
  const selected = params.get('plant');
  const plant = catalog.plants.find(p => p.id === selected);
  const plants = useMemo(() => {
    const query = normalizeSearchText(search);
    return catalog.plants.filter(p =>
      (harvest === 'all' || p.harvest === harvest) && (!mutantsOnly || p.mutations.length > 0) &&
      normalizeSearchText([p.id, p.name, ...p.products.map(v => v.name), ...p.mutations.map(v => v.name), ...p.chemicals.map(v => v.reagent.name)].join(' ')).includes(query)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, search, harvest, mutantsOnly]);
  return <>
    {selected && <CatalogSelection id={selected}>
      <Link to={catalogUrl(params, { plant: null })}>{text('← Все растения', '← All plants')}</Link>
      {plant ? <PlantCard plant={plant}/> : <p>{text('Растение не найдено в этой сборке.', 'Plant not found in this build.')}</p>}
    </CatalogSelection>}
    {!selected && <>
    <div className='catalog-controls'>
      <input type='search' aria-label={text('Поиск растений', 'Search plants')} placeholder={text('Растение, продукт, реагент или мутация…', 'Plant, produce, reagent or mutation…')} value={search} onChange={e => setSearch(e.target.value)}/>
      <select aria-label={text('Тип сбора', 'Harvest type')} value={harvest} onChange={e => setHarvest(e.target.value)}>
        <option value='all'>{text('Любой тип сбора', 'Any harvest type')}</option>
        <option value='NoRepeat'>{text('Одноразовый', 'Single harvest')}</option>
        <option value='Repeat'>{text('Многоразовый', 'Repeated harvest')}</option>
        <option value='SelfHarvest'>{text('Автоматический', 'Automatic harvest')}</option>
      </select>
      <label><input type='checkbox' checked={mutantsOnly} onChange={e => setMutantsOnly(e.target.checked)}/> {text('Есть мутации', 'Has mutations')}</label>
    </div>
    <p className='catalog-note'>{text('Базовые параметры до мутаций и скрещивания. Сроки указаны в циклах роста, не в секундах. Мутации здесь — переходы в другие виды, а не случайные изменения свойств.', 'Base stats before mutations and crossbreeding. Times are growth cycles, not seconds. Listed mutations are species changes, not random trait mutations.')}</p>
    <p role='status'>{text('Найдено растений', 'Plants found')}: {plants.length} / {catalog.plants.length}</p>
    {plants.length ? <div className='catalog-grid'>{plants.map(p => <PlantCard key={p.id} plant={p}/>)}</div> : <Empty/>}
    </>}
  </>;
};

const PlantCard = ({ plant: p }: { plant: PlantEntry }): ReactElement => {
  const { catalog, entityMap } = useGameData();
  const text = useText();
  const [params] = useSearchParams();
  const parents = catalog.plants.filter(other => other.mutations.some(m => m.id === p.id));
  const image = entityMap.get(p.products[0]?.id)?.sprite;
  const noHarvest = p.yield <= 0 || !p.products.length || p.harvest === 'None';
  const label = noHarvest ? text('Без урожая', 'No harvest') : p.harvest === 'NoRepeat' ? text('Одноразовое', 'Single harvest') : p.harvest === 'SelfHarvest' ? text('Автосбор', 'Self-harvesting') : p.harvest === 'Repeat' ? text('Многоразовое', 'Repeated harvest') : p.harvest;
  const refs = (items: CatalogRef[]) => items.length ? items.map((v, i) => <span key={v.id}>{i > 0 && ' · '}<Link to={catalogUrl(params, { plant: v.id })}><CatalogIcon id={catalog.plants.find(p => p.id === v.id)?.products[0]?.id ?? v.id}/>{v.name}</Link></span>) : text('Нет', 'None');
  return <article className='catalog-card plant-card'>
    <div className='catalog-card-heading'>
      {image && <span className='sprite' aria-hidden='true' style={{ backgroundPosition: `-${image[0]}px -${image[1]}px` }}/>}
      <div><h2>{p.name}</h2><span className='catalog-id'>{p.id}</span></div>
      <span className='catalog-badge'>{label}</span>
    </div>
    <h3>{text('Урожай', 'Produce')}</h3>
    <p>{p.products.map((v, i) => <span key={v.id}>{i > 0 && ' · '}<ResourceLink kind='entity' id={v.id}>{v.name}</ResourceLink></span>)}{!p.products.length && text('Нет продуктов', 'No produce')}</p>
    {p.products.length > 1 && <p className='catalog-note'>{text('Каждый плод выбирается случайно из списка.', 'Each produce item is picked randomly from the list.')}</p>}
    <p>{noHarvest ? text('Обычный сбор урожая недоступен.', 'Normal harvesting is unavailable.') : p.harvest === 'SelfHarvest' ? text('Созревшие плоды автоматически падают рядом с растением.', 'Ripe produce automatically drops beside the plant.') : p.tool ? text(`Требуется инструмент: ${p.tool === 'Sawing' ? 'пила (Sawing)' : p.tool}.`, `Required tool quality: ${p.tool}.`) : text('Собирайте пустой рукой с созревшего растения или грядки.', 'Use an empty hand on the ripe plant or tray.')}</p>
    {!noHarvest && <p className='catalog-note'>{p.harvest === 'NoRepeat' ? text('После сбора растение исчезает; нужна новая посадка.', 'The plant is removed after harvesting; replant it.') : text('После сбора растение остаётся и приносит следующий урожай.', 'The plant remains and produces another harvest.')}</p>}
    <dl className='plant-stats'>
      {[[text('Урожайность', 'Yield'), p.yield], [text('Потенция', 'Potency'), p.potency], [text('Созревание', 'Maturation'), p.maturation], [text('Производство', 'Production'), p.production], [text('Срок жизни', 'Lifespan'), p.lifespan]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}
    </dl>
    <h3>{text('Возможные мутации →', 'Possible mutations →')}</h3><p>{refs(p.mutations)}</p>
    {parents.length > 0 && <><h3>{text('Получается из', 'Mutates from')}</h3><p>{refs(parents)}</p></>}
    <details><summary>{text('Семена и состав урожая', 'Seeds & produce chemistry')}</summary>
      <p>{text('Семена', 'Seeds')}: {p.seed ? <ResourceLink kind='entity' id={p.seed.id}>{p.seed.name}</ResourceLink> : text('Не указаны', 'Not specified')}</p>
      {p.chemicals.length ? <ul>{p.chemicals.map(c => <li key={c.reagent.id}>
        <ResourceLink kind='reagent' id={c.reagent.id}>{c.reagent.name}</ResourceLink>: ≈{number(c.amount)} u <span className='catalog-note'>({c.min}–{c.max} u)</span>
      </li>)}</ul> : <p>{text('Состав не задан.', 'No chemicals specified.')}</p>}
      <p className='catalog-note'>{text('На один плод при базовой потенции. Количество = минимум + потенция / делитель, ограничено максимумом.', 'Per produce item at base potency. Amount = minimum + potency / divisor, capped at maximum.')}</p>
    </details>
  </article>;
};

const Chemistry = ({ department }: { department: 'medicine' | 'botanical' | 'drinks' }): ReactElement => {
  const { catalog } = useGameData();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [onlyRecipes, setOnlyRecipes] = useState(false);
  const text = useText();
  const selected = params.get('reagent');
  const medicineSection = department === 'medicine' && medicineGroups.some(g => g.id === params.get('section')) ? params.get('section')! : '';
  const reagent = catalog.reagents.find(r => r.id === selected);
  const byProduct = useMemo(() => {
    const result = new Map<string, ChemicalReaction[]>();
    for (const r of catalog.reactions) for (const p of r.products) result.set(p.reagent.id, [...result.get(p.reagent.id) ?? [], r]);
    return result;
  }, [catalog]);
  const roots = new Set(department === 'medicine' ? catalog.reagents.map(r => r.id) : catalog[department]);
  const query = normalizeSearchText(search);
  const results = catalog.reagents.filter(r => roots.has(r.id) && (!onlyRecipes || byProduct.has(r.id)) && normalizeSearchText(`${r.id} ${r.name} ${r.description}`).includes(query)).sort((a, b) => a.name.localeCompare(b.name));
  const grouped = groupMedicines(results, medicineSection);
  const otherReactions = department === 'medicine' && (!medicineSection || medicineSection === 'other') ? catalog.reactions.filter(r => !r.products.length && normalizeSearchText([r.id, ...r.reactants.map(v => v.reagent.name)].join(' ')).includes(query)) : [];
  const visibleCount = department === 'medicine' ? grouped.reduce((n, g) => n + g.basicItems.length + g.advancedItems.length, 0) : results.length;
  const card = (id: string) => {
    const r = catalog.reagents.find(r => r.id === id)!;
    const recipes = byProduct.get(id) ?? [];
    return <article className='catalog-card chemical-card' key={id}>
      <div className='catalog-card-heading'><div><h2><ResourceLink kind='reagent' id={r.id}>{r.name}</ResourceLink></h2><span className='catalog-id'>{r.id}</span></div></div>
      {r.description && <p>{r.description}</p>}
      {department === 'medicine' && <MedicineEffects reagent={r}/>}
      {recipes.length ? recipes.map(recipe => <ReactionCard key={recipe.id} reaction={recipe}/>) : <p className='catalog-note'>{text('Рецепт синтеза в сборке не найден. Реагент может быть доступен из раздатчика, добычи или других источников.', 'No synthesis recipe found in this build. It may come from a dispenser, extraction or other sources.')}</p>}
      <RelatedResources kind='reagent' id={id}/>
    </article>;
  };
  return <>
    {selected && <CatalogSelection id={selected}>
      <Link to={catalogUrl(params, { reagent: null })}>{text('← Назад к каталогу', '← Back to catalog')}</Link>
      {reagent ? card(reagent.id) : <p>{text('Реагент не найден в этой сборке.', 'Reagent not found in this build.')}</p>}
    </CatalogSelection>}
    {!selected && <>
    {department === 'medicine' && <nav className='medicine-sections' aria-label={text('Разделы медицины', 'Medicine categories')}>
      {[{ id: '', title: ['Все разделы', 'All categories'] }, ...medicineGroups].map(g => <button key={g.id} aria-pressed={medicineSection === g.id} onClick={() => setParams(p => {
        const next = new URLSearchParams(p); if (g.id) next.set('section', g.id); else next.delete('section'); return next;
      })}>{text(g.title[0], g.title[1])}</button>)}
    </nav>}
    <div className='catalog-controls'>
      <input type='search' value={search} onChange={e => setSearch(e.target.value)} aria-label={text('Поиск реагентов', 'Search reagents')} placeholder={text('Название, ID или описание…', 'Name, ID or description…')}/>
      <label><input type='checkbox' checked={onlyRecipes} onChange={e => setOnlyRecipes(e.target.checked)}/> {text('Только с рецептом', 'With synthesis recipe')}</label>
    </div>
    <p className='catalog-note'>{text('Количество указано в единицах реагента (u). Нажмите на ингредиент, чтобы посмотреть его синтез. Катализаторы не расходуются.', 'Quantities are reagent units (u). Select an ingredient to inspect its synthesis. Catalysts are not consumed.')}</p>
    <p role='status'>{text('Найдено реагентов', 'Reagents found')}: {visibleCount}</p>
    {department === 'medicine' ? (grouped.length ? grouped.map(g => <section className='medicine-group' key={g.id}>
      <h2>{text(g.title[0], g.title[1])}</h2>
      {g.basicItems.length > 0 && <><h3>{text('Базовые', 'Basic')}</h3><div className='catalog-grid'>{g.basicItems.map(r => card(r.id))}</div></>}
      {g.advancedItems.length > 0 && <div className='medicine-advanced'><h3>{text('Продвинутые', 'Advanced')}</h3><div className='catalog-grid'>{g.advancedItems.map(r => card(r.id))}</div></div>}
    </section>) : otherReactions.length ? null : <Empty/>) : (results.length ? <div className='catalog-grid'>{results.map(r => card(r.id))}</div> : <Empty/>)}
    {otherReactions.length > 0 && <section className='medicine-group'><h2>{text('Прочее: реакции без реагента-продукта', 'Other: reactions without reagent products')}</h2><div className='catalog-grid'>{otherReactions.map(r => <article className='catalog-card' key={r.id}><ReactionCard reaction={r}/></article>)}</div></section>}
    </>}
  </>;
};

const Empty = () => {
  const text = useText();
  return <p className='catalog-empty'>{text('Ничего не найдено. Попробуйте изменить поиск или фильтры.', 'Nothing found. Try changing the search or filters.')}</p>;
};

const catalogUrl = (params: URLSearchParams, changes: Record<string, string | null>): string => {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(changes)) value === null ? next.delete(key) : next.set(key, value);
  return `?${next}`;
};

