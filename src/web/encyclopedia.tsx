import { groupNames, referenceGroups, ReferenceRow } from '../reference-groups';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CraftEntry, GasEntry, GasRecipe, LawEntry, ReferenceEntity } from '../encyclopedia-types';
import { useGameData } from './context';
import { useLang } from './i18n';
import { normalizeSearchText } from './helpers';
import { DepartmentHeading } from './department-heading';
import { CatalogIcon } from './sprites/catalog';
import { useUrl } from './url';
import { ResourceLink } from './catalog-links';
import { useFork } from './fork-context';

const categories: Record<string, [string, string]> = {
  ...groupNames,
  armor: ['Броня', 'Armor'], weapon: ['Оружие', 'Weapons'], tool: ['Инструменты', 'Tools'], clothing: ['Одежда', 'Clothing'],
  storage: ['Хранение', 'Storage'], food: ['Еда и напитки', 'Food & drink'], material: ['Материалы', 'Materials'], medical: ['Медицинские', 'Medical'], other: ['Обычные предметы', 'Other items'],
  creature: ['Животные и монстры', 'Animals & monsters'], humanoid: ['Гуманоиды', 'Humanoids'], silicon: ['Силиконы', 'Silicons'],
  lawset: ['Наборы законов', 'Lawsets'], ion: ['Сбойные шаблоны', 'Ion corruption templates'],
};
const stats: Record<string, [string, string]> = {
  damage: ['Урон за удар', 'Damage per hit'], attackRate: ['Частота атак', 'Attack rate'], armor: ['Множители входящего урона', 'Incoming damage multipliers'],
  speed: ['Базовая скорость бега', 'Base sprint speed'], thresholds: ['Пороги состояний', 'State thresholds'], tools: ['Функции инструмента', 'Tool qualities'], size: ['Размер', 'Size'], slots: ['Слоты одежды', 'Clothing slots'], factions: ['Фракции NPC', 'NPC factions'],
};
type Section = 'creatures' | 'items' | 'crafting' | 'laws' | 'gases';
const headings: Record<Section, { code: string; title: [string, string]; description: [string, string] }> = {
  creatures: { code: '06 / BESTIARY', title: ['Существа', 'Creatures'], description: ['Крысы, король крыс, карпоакулы и другие обитатели станции. Включены событийные и административные варианты; наличие в справочнике не гарантирует появление в обычном раунде.', 'Rats, rat kings, sharkminnows and other station inhabitants. Includes event and admin variants; a listing does not guarantee ordinary round spawns.'] },
  items: { code: '07 / EQUIPMENT', title: ['Предметы', 'Items'], description: ['Снаряжение выбранной сборки: броня, оружие, инструменты, одежда и повседневные вещи. Один предмет может относиться к нескольким типам.', 'Equipment in the selected build: armor, weapons, tools, clothing and everyday items. An item can belong to multiple categories.'] },
  crafting: { code: '08 / CONSTRUCTION', title: ['Крафт', 'Crafting'], description: ['Рецепты меню строительства: материалы, инструменты и порядок действий. Показан кратчайший путь от начального узла к результату; условия окружающей среды могут ограничивать строительство.', 'Construction menu recipes: materials, tools and ordered steps. Shows the shortest path from the starting node to the result; environment conditions may restrict construction.'] },
  laws: { code: '09 / SILICON', title: ['Законы ИИ и боргов', 'AI & borg laws'], description: ['Наборы законов, их исходные носители и шаблоны ионных сбоев. Ионный шторм может сменить набор, перемешать или удалить законы, добавить новый либо заменить существующий.', 'Lawsets, their initial providers and ion corruption templates. An ion storm may change the lawset, shuffle or remove laws, add a law or replace an existing one.'] },
  gases: { code: '10 / ATMOSPHERICS', title: ['Газы и реакции', 'Gases & reactions'], description: ['Все газы и активные атмосферные реакции выбранной сборки. Количества для запуска — минимальные пороги в молях, а не пропорции смеси. Пропорции расхода и выхода приведены отдельно.', 'All gases and active atmospheric reactions in the selected build. Starting quantities are minimum thresholds in moles, not mixture ratios. Consumption and output ratios are shown separately.'] },
};
const useText = () => { const { lang } = useLang(); return (ru: string, en: string) => lang === 'ru' ? ru : en; };

export function EncyclopediaPage({ section }: { section: Section }) {
  const { catalog, forkId } = useGameData(); const text = useText(); const { lang } = useLang();
  const [params, setParams] = useSearchParams(); const [limit, setLimit] = useState(48);
  const q = params.get('q') ?? ''; const category = params.get('category') ?? ''; const selected = params.get('id');
  const data = catalog.encyclopedia;
  const rows = data?.[section] ?? [];
  const update = (key: string, value: string) => { setLimit(48); setParams(p => { const next = new URLSearchParams(p); value ? next.set(key, value) : next.delete(key); next.delete('id'); return next; }, { replace: key === 'q' }); };
  const available = [...new Set(rows.flatMap(r => referenceGroups(section, r)))].sort();
  const filtered = rows.filter(r => (!selected || r.id === selected) && (selected || (!category || referenceGroups(section, r).includes(category))) && (selected || normalizeSearchText(JSON.stringify(r)).includes(normalizeSearchText(q)))).sort((a, b) => a.name.localeCompare(b.name, lang));
  const title = (id: string) => categories[id]?.[lang === 'ru' ? 0 : 1] ?? id;
  const grouped = !selected && section !== 'gases';
  const groups = available.filter(id => !category || id === category).map(id => [id, filtered.filter(row => referenceGroups(section, row).includes(id))] as [string, ReferenceRow[]]).filter(([, entries]) => entries.length).sort(([a], [b]) => a === 'ion' ? 1 : b === 'ion' ? -1 : title(a).localeCompare(title(b), lang));
  const renderCard = (row: ReferenceRow) => <article className='catalog-card reference-card' key={row.id}>
      <div className='catalog-card-heading'><CatalogIcon id={'result' in row ? row.result?.id ?? row.id : row.id}/><div><h3><Link to={{ search: (() => { const p = new URLSearchParams(params); p.set('id', row.id); return p.toString(); })() }}>{row.name}</Link></h3><span className='catalog-id'>{row.id}</span></div></div>
      {'description' in row && <p>{row.description || text('В игре описание не задано.', 'No in-game description provided.')}</p>}
      {'stats' in row && <><p className='reference-tags'>{(section === 'creatures' ? [row.group ?? 'miscellaneous'] : row.categories).map(c => <span className='catalog-badge' key={c}>{title(c)}</span>)}</p><dl className='reference-stats'>{row.stats.map(s => <div key={s.label}><dt>{stats[s.label]?.[lang === 'ru' ? 0 : 1] ?? s.label}</dt><dd>{s.value}</dd></div>)}</dl><ItemSources entity={row}/></>}
      {'steps' in row && <CraftDetails entry={row}/>}
      {'laws' in row && <LawDetails entry={row}/>}
      {'heatCapacity' in row && <GasDetails gas={row}/>}
    </article>;
  return <main className={`department encyclopedia encyclopedia--${section}`}>
    <DepartmentHeading {...headings[section]}/>
    {section === 'laws' && <aside className='catalog-note'>{text('«По умолчанию» зависит от устройства: смотрите носителей под набором. Сбой не равен механическому повреждению корпуса; здесь показаны изменения законов от ионного воздействия. В квадратных скобках — случайные подстановки (число, предмет, должность и т. п.); все возможные комбинации перечислить нельзя.', 'Defaults depend on the device: see providers under each set. Corruption is not simply physical chassis damage; this page describes ion-induced law changes. Square brackets mark random substitutions (number, object, job, etc.); all combinations cannot be enumerated.')}</aside>}
    {selected ? <p><Link to={{ search: (() => { const p = new URLSearchParams(params); p.delete('id'); return p.toString(); })() }}>{text('← К списку', '← Back to list')}</Link></p> : <div className='catalog-controls'>
      <input type='search' value={q} onChange={e => update('q', e.target.value)} aria-label={text('Поиск в разделе', 'Search section')} placeholder={text('Название, описание или ID…', 'Name, description or ID…')}/>
      {available.length > 0 && <select aria-label={text('Тип', 'Category')} value={category} onChange={e => update('category', e.target.value)}><option value=''>{text('Все типы', 'All categories')}</option>{available.map(c => <option key={c} value={c}>{title(c)}</option>)}</select>}
    </div>}
    <p role='status'>{text('Найдено', 'Found')}: {filtered.length} / {rows.length}</p>
    {grouped && <nav className='reference-directory' aria-label={text('Группы раздела', 'Section groups')}>{groups.map(([id, entries], i) => <a key={id} href={`#${encodeURIComponent(`reference-group-${id}`)}`}><span className='reference-directory-number'>{String(i + 1).padStart(2, '0')}</span><span>{title(id)}</span><strong>{entries.length}</strong></a>)}</nav>}
    {grouped ? groups.map(([id, entries], i) => <ReferenceGroup key={`${forkId}:${section}:${lang}:${params.toString()}:${id}`} id={id} title={title(id)} count={entries.length} number={i + 1} rows={entries} render={renderCard}/>) : <div className='catalog-grid'>{filtered.slice(0, selected ? 1 : limit).map(renderCard)}</div>}
    {!filtered.length && <p>{text(selected ? 'Запись не найдена в этой сборке.' : 'Ничего не найдено. Измените поиск или тип.', selected ? 'Entry not found in this build.' : 'No matches. Change your search or category.')}</p>}
    {!selected && !grouped && filtered.length > limit && <button className='btn reference-more' onClick={() => setLimit(v => v + 48)}>{text('Показать ещё', 'Show more')} ({filtered.length - limit})</button>}
    {section === 'gases' && <section className='gas-reactions'><h2>{text('Атмосферные реакции', 'Atmospheric reactions')}</h2><div className='catalog-grid'>{(data?.gasReactions ?? []).filter(r => selected ? r.requirements.some(v => v.gas.id === selected) || r.products.includes(selected) : !q || normalizeSearchText(JSON.stringify(r) + r.products.map(id => data?.gases.find(g => g.id === id)?.name).join(' ')).includes(normalizeSearchText(q))).map(r => <GasReaction key={r.id} reaction={r}/>)}</div></section>}
  </main>;
}
function ReferenceGroup({ id, title, count, number, rows, render }: { id: string; title: string; count: number; number: number; rows: ReferenceRow[]; render: (row: ReferenceRow) => React.ReactNode }) {
  const text = useText(); const [limit, setLimit] = useState(6); const [collapsed, setCollapsed] = useState(false);
  const anchor = `reference-group-${id}`;
  return <section className={`reference-group${id === 'ion' ? ' reference-group--ion' : ''}`} id={anchor} aria-labelledby={`${anchor}-title`}>
    <header className='reference-group-heading'><span className='reference-group-number'>{String(number).padStart(2, '0')}</span><h2 id={`${anchor}-title`}>{title} <span>{count}</span></h2><button type='button' aria-expanded={!collapsed} aria-controls={`${anchor}-body`} onClick={() => setCollapsed(v => !v)}>{collapsed ? text('Развернуть', 'Expand') : text('Свернуть', 'Collapse')} <span aria-hidden='true'>{collapsed ? '+' : '−'}</span></button></header>
    {!collapsed && <div id={`${anchor}-body`}><div className='catalog-grid'>{rows.slice(0, limit).map(render)}</div>{count > limit && <button type='button' className='btn reference-group-more' onClick={() => setLimit(v => v + 24)}>{text('Показать ещё', 'Show more')} · {count - limit}</button>}</div>}
  </section>;
}
function ItemSources({ entity }: { entity: ReferenceEntity }) {
  const { catalog } = useGameData(); const url = useUrl(); const text = useText();
  const crafts = catalog.encyclopedia?.crafting.filter(r => r.result?.id === entity.id) ?? [];
  return <div className='reference-links'><Link to={url.withSearchParams('/reference', new URLSearchParams({ entity: entity.id, ...Object.fromEntries(new URLSearchParams(url.items.split('?')[1])) }))}>{text('Источники и применение', 'Sources & uses')}</Link>{crafts.map(c => <Link key={c.id} to={url.withSearchParams(url.crafting, new URLSearchParams({ id: c.id }))}>{text('Крафт', 'Craft')}: {c.name}</Link>)}</div>;
}
function CraftDetails({ entry: r }: { entry: CraftEntry }) {
  const text = useText();
  return <><p className='catalog-badge'>{r.category}</p>{!r.reachable ? <p>{text('Путь к результату не найден; проверьте граф в исходниках.', 'No path to result found; check the source graph.')}</p> : <ol className='craft-steps'>{r.steps.map((s, i) => <li key={i}><strong>{s.name}</strong>{s.amount !== null && ` × ${s.amount}`}{s.kind === 'tool' && ` — ${text('инструмент, не расходуется', 'tool, not consumed')}`}{s.seconds !== null && ` · ${s.seconds} ${text('с', 's')}`}</li>)}</ol>}{r.conditions.length > 0 && <p>{text('Условия', 'Conditions')}: {r.conditions.map(c => { const key = c.split(' (')[0]; return conditionNames[key] ? text(...conditionNames[key]) + c.slice(key.length) : c; }).join(' · ')}</p>}</>;
}
const conditionNames: Record<string, [string,string]> = { MinSolution: ['Нужен раствор', 'Required solution'], EntityAnchored: ['Состояние крепления', 'Anchoring state'], AgainstWall: ['Рядом со стеной', 'Against a wall'], EmptyOrWindowValidInTile: ['Свободное место для окна', 'Valid window tile'], NoWindowsInTile: ['Без окон на тайле', 'No windows in tile'], TileType: ['Тип пола', 'Floor type'], MachineFrameComplete: ['Завершённая рама машины', 'Complete machine frame'], WallmountCondition: ['Монтаж на стене', 'Wall mount'], NoUnstackableInTile: ['Нет несовместимого устройства на тайле', 'No incompatible device in tile'], TileNotBlocked: ['Свободный тайл', 'Unblocked tile'], TileNotSpace: ['Не в космосе', 'Not space'], TileIsSubfloor: ['Открытый технический пол', 'Exposed subfloor'], TileIsWall: ['Стена', 'Wall'], Wallmount: ['Монтаж на стене', 'Wall mounting'] };
function LawDetails({ entry }: { entry: LawEntry }) {
  const text = useText();
  return <>{entry.ionWeight !== undefined && <p className='catalog-badge'>{text('Может заменить набор при ионном сбое', 'Possible replacement lawset during an ion storm')}</p>}{entry.category === 'ion' && <p>{text('Формы случайного шаблона', 'Random template forms')}</p>}<ol className='law-list'>{entry.laws.map((law, i) => <li key={i} value={law.order || i + 1}>{law.text}</li>)}</ol>{(entry.typeUsers?.length ?? 0) > 0 && <p className='law-type-users'>{text('При выборе типа борга: ', 'On selecting borg type: ')}{entry.typeUsers!.map(u => u.name).join(', ')}</p>}{entry.users.length > 0 && <details><summary>{text('Исходные носители', 'Initial providers')} ({entry.users.length})</summary><ul>{entry.users.map(u => <li key={u.id}>{u.name} <span className='catalog-id'>{u.id}</span></li>)}</ul></details>}</>;
}
function GasDetails({ gas }: { gas: GasEntry }) {
  const text = useText(); const { catalog } = useGameData();
  const reactions = catalog.encyclopedia?.gasReactions.filter(r => r.products.includes(gas.id)) ?? [];
  return <>{gas.reagent && <p><ResourceLink kind='reagent' id={gas.reagent}>{text('Реагент: химические рецепты и свойства', 'Reagent: chemical recipes & properties')}</ResourceLink></p>}<dl className='reference-stats'><div><dt>{text('Молярная теплоёмкость', 'Molar heat capacity')}</dt><dd>{gas.heatCapacity} J/(mol·K)</dd></div><div><dt>{text('Молярная масса', 'Molar mass')}</dt><dd>{gas.molarMass} g/mol</dd></div></dl><p>{text('Реакции получения', 'Production reactions')}: {reactions.map(r => r.name).join(', ') || text('В этой сборке нет атмосферной реакции получения. Газ может поступать из баллонов, атмосферы, устройств или других механик.', 'No atmospheric production reaction in this build. May be supplied by canisters, atmospheres, devices or other mechanics.')}</p></>;
}
function GasReaction({ reaction: r }: { reaction: GasRecipe }) {
  const text = useText(); const { fork, allForks } = useFork(); const meta = allForks.find(f => f.id === fork)?.meta;
  return <article className='catalog-card gas-reaction'><h3>{r.name}</h3><span className='catalog-id'>{r.id}</span><p>{r.explanation || text('Описание эффекта ещё не разобрано.', 'Effect description not yet available.')}</p><h4>{text('Минимум для запуска', 'Minimum to start')}</h4><ul>{r.requirements.map(v => <li key={v.gas.id}>{v.gas.name}: ≥ {v.amount} mol</li>)}</ul><p>{text('Температура', 'Temperature')}: {r.minTemp ?? '—'} … {r.maxTemp ?? '∞'} K</p>{r.minEnergy !== null && <p>{text('Энергия', 'Energy')}: ≥ {r.minEnergy} J</p>}{meta && r.source && <a href={`https://github.com/${meta.repo}/blob/${meta.commit}/${r.source}`} target='_blank' rel='noreferrer'>{text('Формула в исходниках', 'Formula in source')}</a>}</article>;
}
