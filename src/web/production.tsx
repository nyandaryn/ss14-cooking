import { CatalogIcon } from './sprites/catalog';
import { EntitySprite } from './sprites';
import { uniqueVendors } from './related-resources';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ManufacturingRecipe, VendorEntry } from '../catalog-types';
import { ResourceLink } from './catalog-links';
import { useGameData } from './context';
import { useLang } from './i18n';
import { useUrl } from './url';
import { DepartmentHeading } from './department-heading';

const MachineIcon = ({ id }: { id: string }) => {
  const { entityMap } = useGameData();
  return entityMap.has(id) ? <EntitySprite id={id}/> : null;
};

export const ManufacturingCard = ({ recipe: r, machineId }: { recipe: ManufacturingRecipe; machineId?: string }) => {
  const { lang } = useLang(); const ru = lang === 'ru'; const url = useUrl();
  const machine = r.machines.find(m => m.machine.id === machineId);
  const materialsMultiplier = machine?.materialMultiplier ?? 1;
  return <article className='catalog-card'>
    <h2><Link to={url.withSearchParams(url.production, new URLSearchParams({ recipe: r.id, ...(machineId ? { machine: machineId } : {}) }))}><CatalogIcon kind={r.entityResult ? 'entity' : 'reagent'} id={r.entityResult ? r.result.id : r.reagentResults[0]?.reagent.id ?? ''}/>{r.result.name}</Link></h2>
    <p>{machine ? (ru ? 'Ресурсы' : 'Materials') : (ru ? 'Базовые материалы' : 'Base materials')}: {r.materials.map((m,i) => <span key={m.material.id}>{i > 0 && ', '}{m.entityId ? <ResourceLink kind='entity' id={m.entityId}>{m.material.name}</ResourceLink> : m.material.name}: {Math.ceil(m.amount * materialsMultiplier)}</span>)}</p>
    {r.time !== null && <p>{machine ? (ru ? 'Время' : 'Time') : (ru ? 'Базовое время' : 'Base time')}: {Number((r.time * (machine?.timeMultiplier ?? 1)).toFixed(2))} {ru ? 'сек' : 's'}</p>}
    <ul>{(machine ? [machine] : r.machines).map((m,i) => <li key={i}><MachineIcon id={m.machine.id}/> {m.machine.name} — {m.access === 'emagResearch' ? (ru ? 'эмаг и разблокировка рецепта' : 'emag and recipe unlock required') : m.access === 'emag' ? (ru ? 'после взлома (эмаг)' : 'emag required') : m.access === 'research' ? (ru ? 'нужно разблокировать рецепт' : 'recipe unlock required') : (ru ? 'доступен сразу' : 'available by default')}{!machine && m.materialMultiplier !== 1 && ` · ${ru ? 'материалы' : 'materials'} ×${m.materialMultiplier}`}{!machine && m.timeMultiplier !== 1 && ` · ${ru ? 'время' : 'time'} ×${m.timeMultiplier}`}</li>)}</ul>
    {r.technologies.length > 0 && <p>{ru ? 'Исследования для разблокировки' : 'Unlocking technologies'}: {r.technologies.map(t => t.name).join(', ')}</p>}
    {r.reagentResults?.map(p => <p key={p.reagent.id}><ResourceLink kind='reagent' id={p.reagent.id}>{p.reagent.name}</ResourceLink>: {p.amount} u</p>)}
    {r.entityResult && <ResourceLink kind='entity' id={r.result.id}>{ru ? 'Предмет и использование →' : 'Item and uses →'}</ResourceLink>}
  </article>;
};
export const VendorSource = ({ vendor: v }: { vendor: VendorEntry }) => {
  const { lang } = useLang(); const ru = lang === 'ru';
  const sections = [
    { access: 'startingInventory', title: ru ? 'Обычный ассортимент' : 'Standard stock', className: '' },
    { access: 'contrabandInventory', title: ru ? 'Контрабанда — взлом проводов' : 'Contraband — wire hacking', className: 'supply-section--contraband' },
    { access: 'emaggedInventory', title: ru ? 'После взлома — эмаг' : 'After hacking — emag', className: 'supply-section--emag' },
  ];
  return <article className='catalog-card'><h3 className='vendor-heading'><MachineIcon id={v.machine.id}/>{v.machine.name}</h3>
    {sections.map(section => {
      const items = v.items.filter(i => i.access === section.access);
      if (!items.length) return null;
      return <section key={section.access} className={`supply-section ${section.className}`}><h4>{section.title}</h4><ul>{items.map(i => <li key={i.entity.id}><ResourceLink kind='entity' id={i.entity.id}>{i.entity.name}</ResourceLink> — {i.amount} {ru ? 'шт.' : 'pcs'}</li>)}</ul></section>;
    })}
  </article>;
};
const MachineCard = ({ machine, recipes, access = '' }: { access?: string; machine: ManufacturingRecipe['machines'][number]['machine']; recipes: ManufacturingRecipe[] }) => {
  const { lang } = useLang(); const ru = lang === 'ru'; const url = useUrl();
  const sections = [
    { access: ['static'], title: ru ? 'Доступно сразу' : 'Available by default' },
    { access: ['research'], title: ru ? 'После исследования' : 'Research unlocks' },
    { access: ['emag', 'emagResearch'], title: ru ? 'После взлома (эмаг)' : 'After hacking (emag)' },
  ];
  return <article className='machine-detail'><h2 className='vendor-heading'><MachineIcon id={machine.id}/>{machine.name}</h2>
    {sections.filter(section => !access || section.access.includes(access)).map(section => {
      const items = recipes.filter(r => r.machines.some(m => m.machine.id === machine.id && section.access.includes(m.access))).sort((a,b) => a.result.name.localeCompare(b.result.name));
      if (!items.length) return null;
      return <section className={`machine-recipes-section ${section.access.includes('emag') ? 'supply-section--emag' : ''}`} key={section.access[0]}><h3>{section.title} <span className='catalog-id'>({items.length})</span></h3><div className='catalog-grid'>{items.map(r => <ManufacturingCard key={r.id} recipe={r} machineId={machine.id}/>)}</div></section>;
    })}
  </article>;
};

export const Production = () => {
  const { catalog } = useGameData(); const { lang } = useLang(); const ru = lang === 'ru'; const url = useUrl();
  const [params] = useSearchParams(); const selected = params.get('recipe'); const machine = params.get('machine') ?? '';
  useEffect(() => { setSearch(''); setAccess(''); window.scrollTo(0, 0); }, [machine, selected, params.get('view')]);
  const [search, setSearch] = useState(''); const [access, setAccess] = useState(''); const [limit, setLimit] = useState(60);
  const vending = params.get('view') === 'vending';
  const machines = [...new Map((catalog.manufacturing ?? []).flatMap(r => r.machines.map(m => [m.machine.id, m.machine] as const))).values()].sort((a,b) => a.name.localeCompare(b.name));
  const needle = search.toLocaleLowerCase();
  const recipes = (catalog.manufacturing ?? []).filter(r => selected ? r.id === selected : (`${r.result.name} ${r.id}`.toLocaleLowerCase().includes(needle) || r.machines.some(m => `${m.machine.name} ${m.machine.id}`.toLocaleLowerCase().includes(needle))) && r.machines.some(m => (!machine || m.machine.id === machine) && (!access || (m.access === access || (access === 'emag' && m.access === 'emagResearch')))));
  const vendors = uniqueVendors((catalog.vending ?? []).map(v => ({ ...v, items: v.machine.name.toLocaleLowerCase().includes(needle) ? v.items : v.items.filter(i => `${i.entity.name} ${i.entity.id}`.toLocaleLowerCase().includes(needle)) })).filter(v => v.items.length));
  const machineCards = machines.filter(m => (!machine || m.id === machine)).map(m => ({ machine: m, recipes: recipes.filter(r => r.machines.some(v => v.machine.id === m.id && (!access || v.access === access || (access === 'emag' && v.access === 'emagResearch')))) })).filter(m => m.recipes.length);
  return <main className='department'><DepartmentHeading code='FAB / SUPPLY' title={['Производство и снабжение', 'Production and supplies']} description={['Автолаты, фабрикаторы и ассортимент вендоматов выбранной сборки.', 'Lathes, fabricators and vending machine inventories in the selected build.']}/>
    <nav><Link to={url.production}>{ru ? 'Станки' : 'Fabricators'}</Link> · <Link to={url.withSearchParams(url.production, 'view=vending')}>{ru ? 'Вендоматы' : 'Vending machines'}</Link></nav>
    {!selected && <div className='production-filters'><input aria-label={ru ? 'Поиск предмета' : 'Search items'} placeholder={ru ? (machine || vending ? 'Название или ID предмета…' : 'Станок или предмет…') : (machine || vending ? 'Item name or ID…' : 'Machine or item…')} value={search} onChange={e => {setSearch(e.target.value);setLimit(60);}}/>{!vending && machine && <><select aria-label={ru ? 'Доступность' : 'Availability'} value={access} onChange={e => {setAccess(e.target.value);setLimit(60);}}><option value=''>{ru ? 'Любая доступность' : 'Any availability'}</option><option value='static'>{ru ? 'Обычные' : 'Standard'}</option><option value='emag'>{ru ? 'Взломанные' : 'Hacked'}</option><option value='research'>{ru ? 'Разблокируемые' : 'Unlockable'}</option></select></>}</div>}
    {(selected || machine) && <p><Link to={selected && machine ? url.withSearchParams(url.production, new URLSearchParams({ machine })) : url.production}>{ru ? (selected && machine ? '← К станку' : '← Выбрать другой станок') : (selected && machine ? '← Back to machine' : '← Choose another machine')}</Link></p>}
    <p>{ru ? 'Найдено' : 'Found'}: {vending ? vendors.length : selected || machine ? recipes.length : machineCards.length}</p>
    <div className='catalog-grid'>{vending ? vendors.slice(0,limit).map(v => <VendorSource key={v.machine.id} vendor={v}/>) : selected ? recipes.map(r => <ManufacturingCard key={r.id} recipe={r} machineId={machine}/>) : machine ? null : machineCards.map(m => <Link className='catalog-card machine-choice' key={m.machine.id} to={url.withSearchParams(url.production, new URLSearchParams({ machine: m.machine.id }))}><h2 className='vendor-heading'><MachineIcon id={m.machine.id}/>{m.machine.name}</h2><p>{ru ? 'Рецептов' : 'Recipes'}: {m.recipes.length}</p><span>{ru ? 'Посмотреть изделия и ресурсы →' : 'View items and materials →'}</span></Link>)}</div>
    {!vending && !selected && machine && (machineCards.length ? machineCards.map(m => <MachineCard key={m.machine.id} {...m} access={access}/>) : <p>{ru ? 'Станок или рецепты не найдены.' : 'Machine or recipes not found.'}</p>)}
    {vending && vendors.length > limit && <button onClick={() => setLimit(limit + 60)}>{ru ? 'Показать ещё' : 'Show more'}</button>}
  </main>;
};
