import {
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent,
  ReactElement,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router';
import type { BorgCatalog, BorgChassisEntry, BorgModuleEntry } from '../borg-types';
import {
  BorgBranch,
  BorgColumn,
  BorgFaction,
  BorgModuleSource,
  SharedBranchId,
  TreeLayout,
  TreeMetrics,
  TreeNode,
  borgModuleSources,
  buildBorgBranches,
  chassisFaction,
  layoutBorgTree,
} from './borg-tree';
import { ResourceLink } from './catalog-links';
import { useGameData } from './context';
import { DepartmentHeading } from './department-heading';
import { normalizeSearchText } from './helpers';
import { useLang } from './i18n';
import { CloseIcon } from './icons';
import { ManufacturingCard } from './production';
import { CatalogIcon } from './sprites/catalog';

type Text = (ru: string, en: string) => string;
const useText = (): Text => {
  const { lang } = useLang();
  return (ru, en) => lang === 'ru' ? ru : en;
};

const ColumnTitles: Record<BorgColumn, [ru: string, en: string, ruNote: string, enNote: string]> = {
  default: ['Встроенные', 'Built-in', 'стоят в шасси сразу', 'installed with the chassis'],
  fabricator: ['Фабрикатор', 'Fabricator', 'без исследований', 'no research needed'],
  tier1: ['Исследование I', 'Research I', 'технология 1-го уровня', 'tier 1 technology'],
  tier2: ['Исследование II', 'Research II', 'технология 2-го уровня', 'tier 2 technology'],
  tier3: ['Исследование III', 'Research III', 'технология 3-го уровня', 'tier 3 technology'],
  emag: ['Взлом', 'Emag', 'после эмага фабрикатора', 'after emagging the fabricator'],
  none: ['Особые', 'Special', 'не изготавливаются', 'not manufacturable'],
};

const TagNames: Record<string, [string, string]> = {
  BorgModuleGeneric: ['общие', 'generic'],
  BorgModuleEngineering: ['инженерные', 'engineering'],
  BorgModuleCargo: ['утилизаторские', 'salvage'],
  BorgModuleJanitor: ['уборочные', 'janitorial'],
  BorgModuleMedical: ['медицинские', 'medical'],
  BorgModuleService: ['сервисные', 'service'],
  BorgModuleSecurity: ['охранные', 'security'],
  BorgModuleScience: ['научные', 'science'],
  BorgModuleSyndicate: ['Синдиката', 'Syndicate'],
  BorgModuleSyndicateAssault: ['штурмовые Синдиката', 'Syndicate assault'],
  BorgModuleERT: ['ОБР', 'ERT'],
  BorgModulePirate: ['пиратские', 'pirate'],
  MothershipModule: ['ядра материнского корабля', 'mothership core'],
  XenoborgModuleGeneric: ['общие ксеноборгов', 'xenoborg generic'],
  XenoborgModuleEngi: ['ксеноборга-инженера', 'xenoborg engineer'],
  XenoborgModuleHeavy: ['ксеноборга-тяжеловеса', 'heavy xenoborg'],
  XenoborgModuleScout: ['ксеноборга-разведчика', 'xenoborg scout'],
  XenoborgModuleStealth: ['ксеноборга-стелса', 'stealth xenoborg'],
};

const FactionNames: Record<BorgFaction, [string, string]> = {
  syndicate: ['Синдикат', 'Syndicate'],
  ert: ['ОБР', 'ERT'],
  pirate: ['Пираты', 'Pirates'],
  xenoborg: ['Ксеноборги', 'Xenoborgs'],
  other: ['Особое', 'Special'],
};

const factionOf = (c: BorgChassisEntry, text: Text): string | null => {
  const faction = chassisFaction(c);
  return faction && text(...FactionNames[faction]);
};

/** Entity names are lower-case in game; chassis read as titles here. */
const title = (name: string) => name.charAt(0).toLocaleUpperCase() + name.slice(1);

type Selection = { kind: 'module' | 'chassis'; id: string } | null;

export const Cyborgs = (): ReactElement => {
  const { catalog } = useGameData();
  const text = useText();
  const borgs = catalog.borgs;
  return <main className='department department--cyborgs'>
    <DepartmentHeading
      code='05 / ROBOTICS'
      title={['Модули киборгов', 'Cyborg modules']}
      description={[
        'Дерево модулей по типам шасси: что стоит в шасси сразу, что печатается в фабрикаторе экзокостюмов и какие исследования открывают остальное.',
        'Module tree by chassis type: what each chassis starts with, what the exosuit fabricator prints and which research unlocks the rest.',
      ]}
    />
    {borgs?.chassis.length
      ? <BorgTree borgs={borgs}/>
      : <p className='catalog-empty'>{text('В этой сборке нет данных о киборгах.', 'No cyborg data in this build.')}</p>}
  </main>;
};

const BorgTree = ({ borgs }: { borgs: BorgCatalog }): ReactElement => {
  const { catalog } = useGameData();
  const { lang } = useLang();
  const text = useText();
  const [params, setParams] = useSearchParams();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [query, setQuery] = useState('');
  // -1 until Enter or the arrows jump to the first match.
  const [matchIndex, setMatchIndex] = useState(-1);

  const sources = useMemo(() => borgModuleSources(borgs, catalog.manufacturing), [borgs, catalog]);
  const branches = useMemo(() => buildBorgBranches(borgs, sources, new Intl.Collator(lang)), [borgs, sources, lang]);
  const layout = useMemo(() => layoutBorgTree(branches, collapsed), [branches, collapsed]);
  const modules = useMemo(() => new Map(borgs.modules.map(m => [m.id, m])), [borgs]);
  const chassis = useMemo(() => new Map(borgs.chassis.map(c => [c.id, c])), [borgs]);

  const selection: Selection = params.get('module') && modules.has(params.get('module')!)
    ? { kind: 'module', id: params.get('module')! }
    : params.get('chassis') && (chassis.has(params.get('chassis')!) || params.get('chassis') === SharedBranchId)
      ? { kind: 'chassis', id: params.get('chassis')! }
      : null;

  const select = useCallback((next: Selection) => setParams(p => {
    const result = new URLSearchParams(p);
    result.delete('module');
    result.delete('chassis');
    if (next) result.set(next.kind, next.id);
    return result;
  }, { replace: true }), [setParams]);

  const normalized = normalizeSearchText(query.trim());
  const matches = useMemo(() => {
    if (!normalized) return null;
    return new Set(borgs.modules
      .filter(m => normalizeSearchText([m.id, m.name, m.description, ...m.items.map(i => i.name)].join(' ')).includes(normalized))
      .map(m => m.id));
  }, [borgs, normalized]);
  const matchNodes = useMemo(() => matches ? layout.nodes.filter(n => n.kind === 'module' && matches.has(n.id)) : [], [layout, matches]);

  const view = usePanZoom(layout);

  const focusNode = useCallback((key: string) => {
    const node = layout.nodes.find(n => n.key === key);
    if (node) view.centerOn(node);
  }, [layout, view]);

  // Open a shared link on its node, once the tree is laid out.
  const initialFocus = useRef(selection);
  useEffect(() => {
    const target = initialFocus.current;
    initialFocus.current = null;
    if (!target) return;
    const node = layout.nodes.find(n => target.kind === 'module' ? n.kind === 'module' && n.id === target.id : n.kind === 'branch' && n.id === target.id);
    if (node) view.centerOn(node, false);
  }, []);

  const goToModule = (id: string) => {
    select({ kind: 'module', id });
    const node = layout.nodes.find(n => n.kind === 'module' && n.id === id);
    if (node) view.centerOn(node);
  };
  const goToChassis = (id: string) => {
    select({ kind: 'chassis', id });
    if (collapsed.has(id)) setCollapsed(prev => { const next = new Set(prev); next.delete(id); return next; });
    focusNode(`branch:${id}`);
  };

  const toggle = (id: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const stepMatch = (delta: number) => {
    if (!matchNodes.length) return;
    const from = matchIndex < 0 ? (delta > 0 ? -1 : 0) : matchIndex;
    const index = (from + delta + matchNodes.length) % matchNodes.length;
    setMatchIndex(index);
    view.centerOn(matchNodes[index]);
  };

  const relatedBranches = useMemo(() => {
    if (!selection) return new Set<string>();
    if (selection.kind === 'chassis') return new Set([selection.id]);
    return new Set(layout.nodes.filter(n => n.kind === 'module' && n.id === selection.id).map(n => n.branch));
  }, [selection?.kind, selection?.id, layout]);

  return <>
    <div className='catalog-controls borg-controls'>
      <input
        type='search'
        value={query}
        onChange={e => { setQuery(e.target.value); setMatchIndex(-1); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); stepMatch(e.shiftKey ? -1 : 1); } }}
        aria-label={text('Поиск модулей', 'Search modules')}
        placeholder={text('Модуль, инструмент или ID… (Enter — к следующему)', 'Module, tool or ID… (Enter for next)')}
      />
      {matches && <span className='borg-controls_count' role='status'>
        {text('Найдено', 'Found')}: {new Set(matchNodes.map(n => n.id)).size}
        {matchNodes.length > 1 && <>
          <button type='button' onClick={() => stepMatch(-1)} aria-label={text('Предыдущий', 'Previous')}>↑</button>
          <button type='button' onClick={() => stepMatch(1)} aria-label={text('Следующий', 'Next')}>↓</button>
        </>}
      </span>}
      <button type='button' onClick={() => setCollapsed(new Set())}>{text('Развернуть все', 'Expand all')}</button>
      <button type='button' onClick={() => setCollapsed(new Set(branches.map(b => b.id)))}>{text('Свернуть все', 'Collapse all')}</button>
    </div>
    <p className='catalog-note'>{text(
      'Перетаскивайте дерево зажатой левой кнопкой мыши (или пальцем), колесо мыши — масштаб. Клик по модулю или шасси открывает подробности. Общие модули подходят любому станционному шасси, поэтому вынесены в отдельную ветку.',
      'Drag the tree with the left mouse button (or a finger), use the wheel to zoom. Click a module or chassis for details. Generic modules fit every station chassis, so they have their own branch.'
    )}</p>
    <div className={selection ? 'borg-tree borg-tree--details' : 'borg-tree'} ref={view.viewportRef} tabIndex={0} aria-label={text('Дерево модулей киборгов', 'Cyborg module tree')}
      onPointerDown={view.onPointerDown} onPointerMove={view.onPointerMove} onPointerUp={view.onPointerUp} onPointerCancel={view.onPointerUp}
      onClickCapture={view.onClickCapture} onKeyDown={view.onKeyDown}
    >
      <div className='borg-tree_header' ref={view.headerRef} style={{ width: layout.width }}>
        {layout.columns.map(({ column, x }) => <div key={column} className={`borg-tree_column-label borg-tree_column-label--${column}`} style={{ left: x, width: TreeMetrics.nodeWidth }}>
          <strong>{text(ColumnTitles[column][0], ColumnTitles[column][1])}</strong>
          <span>{text(ColumnTitles[column][2], ColumnTitles[column][3])}</span>
        </div>)}
      </div>
      <div className='borg-tree_content' ref={view.contentRef} style={{ width: layout.width, height: layout.height }}>
        {layout.columns.map(({ column, x }) => <div key={column} className={`borg-tree_band borg-tree_band--${column}`} style={{ left: x - TreeMetrics.columnGap / 4, width: TreeMetrics.nodeWidth + TreeMetrics.columnGap / 2, height: layout.height }}/>)}
        <svg className='borg-tree_edges' width={layout.width} height={layout.height} aria-hidden='true'>
          {layout.edges.map(e => <path key={e.key} d={e.path} className={relatedBranches.has(e.branch) ? 'is-related' : undefined}/>)}
        </svg>
        {layout.nodes.map(node => <TreeNodeView
          key={node.key}
          node={node}
          branch={branches.find(b => b.id === node.branch)}
          module={modules.get(node.id)}
          source={sources.get(node.id)}
          selected={!!selection && (node.kind === 'module' ? selection.kind === 'module' && selection.id === node.id : node.kind === 'branch' && selection.kind === 'chassis' && selection.id === node.id)}
          related={node.kind === 'branch' && relatedBranches.has(node.id)}
          dimmed={!!matches && (node.kind !== 'module' || !matches.has(node.id))}
          collapsed={collapsed.has(node.id)}
          onSelect={() => node.kind === 'module' ? select({ kind: 'module', id: node.id }) : node.kind === 'branch' ? select({ kind: 'chassis', id: node.id }) : undefined}
          onToggle={() => toggle(node.id)}
        />)}
      </div>
      <div className='borg-tree_zoom' role='group' aria-label={text('Масштаб', 'Zoom')}>
        <button type='button' onClick={() => view.zoomBy(1 / 1.25)} aria-label={text('Уменьшить', 'Zoom out')}>−</button>
        <button type='button' onClick={() => view.reset()} title={text('Масштаб 100%', 'Reset to 100%')}>{view.zoomLabel}%</button>
        <button type='button' onClick={() => view.zoomBy(1.25)} aria-label={text('Увеличить', 'Zoom in')}>+</button>
        <button type='button' onClick={() => view.fit()}>{text('Всё дерево', 'Fit')}</button>
      </div>
      {selection && <aside className='borg-tree_details' aria-label={text('Подробности', 'Details')}>
        <button type='button' className='borg-tree_details-close' onClick={() => select(null)} aria-label={text('Закрыть', 'Close')}><CloseIcon/></button>
        {selection.kind === 'module'
          ? <ModuleDetails module={modules.get(selection.id)!} source={sources.get(selection.id)} borgs={borgs} onChassis={goToChassis}/>
          : <ChassisDetails id={selection.id} chassis={chassis.get(selection.id) ?? null} branch={branches.find(b => b.id === selection.id)} modules={modules} onModule={goToModule}/>}
      </aside>}
    </div>
  </>;
};

interface TreeNodeViewProps {
  node: TreeNode;
  branch: BorgBranch | undefined;
  module: BorgModuleEntry | undefined;
  source: BorgModuleSource | undefined;
  selected: boolean;
  related: boolean;
  dimmed: boolean;
  collapsed: boolean;
  onSelect: () => void;
  onToggle: () => void;
}

const TreeNodeView = ({ node, branch, module, source, selected, related, dimmed, collapsed, onSelect, onToggle }: TreeNodeViewProps): ReactElement => {
  const text = useText();
  const { catalog } = useGameData();
  const style = { left: node.x, top: node.y, width: node.width, height: node.height };
  const cls = (base: string) => [base, selected && 'is-selected', related && 'is-related', dimmed && 'is-dimmed'].filter(Boolean).join(' ');

  if (node.kind === 'root') {
    const sprite = catalog.borgs?.chassis.find(c => c.id === 'generic')?.entity ?? 'BorgChassisSelectable';
    return <div className={cls('borg-node borg-node--root')} style={style}>
      <span className='borg-node_icon borg-node_icon--large'><CatalogIcon id={sprite}/></span>
      <span className='borg-node_text'>
        <span className='borg-node_name'>{text('Киборг', 'Cyborg')}</span>
        <span className='borg-node_meta'>{text('эндоскелет → шасси → модули', 'endoskeleton → chassis → modules')}</span>
      </span>
    </div>;
  }

  if (node.kind === 'branch') {
    const c = branch?.chassis ?? null;
    const count = branch ? Object.values(branch.columns).reduce((n, ids) => n + ids.length, 0) : 0;
    const faction = c && factionOf(c, text);
    const genericIcon = branch?.columns.default[0] ?? branch?.columns.fabricator[0] ?? Object.values(branch?.columns ?? {}).flat()[0];
    return <div className={cls(`borg-node borg-node--branch${c ? ` borg-node--${c.kind}` : ' borg-node--generic'}`)} style={style}>
      <button type='button' className='borg-node_main' onClick={onSelect}>
        <span className='borg-node_icon borg-node_icon--large'><CatalogIcon id={c ? c.entity : genericIcon ?? ''}/></span>
        <span className='borg-node_text'>
          <span className='borg-node_name'>{c ? title(c.name) : text('Общие модули', 'Generic modules')}</span>
          <span className='borg-node_meta'>{c
            ? <>{faction && <span className='borg-node_badge'>{faction}</span>}{c.slots != null ? text(`слотов: ${c.slots}`, `${c.slots} slots`) : null}</>
            : text('для любого станционного шасси', 'fit every station chassis')}</span>
        </span>
      </button>
      <button type='button' className='borg-node_toggle' onClick={onToggle} aria-expanded={!collapsed}
        aria-label={collapsed ? text('Развернуть ветку', 'Expand branch') : text('Свернуть ветку', 'Collapse branch')}
        title={collapsed ? text(`Развернуть (${count})`, `Expand (${count})`) : text('Свернуть', 'Collapse')}
      >{collapsed ? `+${count}` : '−'}</button>
    </div>;
  }

  const meta = node.column === 'default'
    ? (source?.column === 'none' ? text('только встроенный', 'built-in only') : text('можно и изготовить', 'also manufacturable'))
    : source?.technologies.length && node.column?.startsWith('tier') ? source.technologies[0].name
    : node.column === 'emag' ? text('фабрикатор после эмага', 'emagged fabricator')
    : node.column === 'fabricator' ? text('фабрикатор экзокостюмов', 'exosuit fabricator')
    : text('аплинк, спавн, роли', 'uplink, spawn, roles');
  return <button type='button' className={cls(`borg-node borg-node--module borg-node--${node.column}`)} style={style} onClick={onSelect} title={module?.name}>
    <span className='borg-node_icon'><CatalogIcon id={node.id}/></span>
    <span className='borg-node_text'>
      <span className='borg-node_name'>{module?.name ?? node.id}</span>
      <span className='borg-node_meta'>{meta}</span>
    </span>
  </button>;
};

const ModuleDetails = ({ module: m, source, borgs, onChassis }: {
  module: BorgModuleEntry; source: BorgModuleSource | undefined; borgs: BorgCatalog; onChassis: (id: string) => void;
}): ReactElement => {
  const text = useText();
  const fits = borgs.chassis.filter(c => m.tags.some(tag => c.whitelist.includes(tag)));
  const builtIn = borgs.chassis.filter(c => c.defaultModules.includes(m.id));
  const chip = (c: BorgChassisEntry) => <li key={c.id}><button type='button' className='borg-chip' onClick={() => onChassis(c.id)}><CatalogIcon id={c.entity}/>{title(c.name)}</button></li>;
  return <article>
    <div className='borg-details_heading'>
      <span className='borg-node_icon borg-node_icon--large'><CatalogIcon id={m.id}/></span>
      <div><h2>{m.name}</h2><span className='catalog-id'>{m.id}</span></div>
    </div>
    {m.description && <p>{m.description}</p>}
    <p className='borg-details_tags'>{m.tags.map(tag => <span key={tag} className='catalog-badge'>{tagName(tag, text)}</span>)}</p>

    {m.items.length > 0 && <section><h3>{text('Даёт в руки', 'Provides')}</h3>
      <ul className='borg-details_items'>{m.items.map(i => <li key={i.id}><ResourceLink kind='entity' id={i.id}>{i.name}</ResourceLink></li>)}</ul>
    </section>}

    <section><h3>{text('Как получить', 'How to get')}</h3>
      {source?.technologies.map(t => <p key={t.id} className='borg-details_tech'>
        <span className='catalog-badge'>{text(`ур. ${t.tier}`, `tier ${t.tier}`)}</span> {t.name}{t.discipline && <span className='catalog-note'> · {t.discipline}</span>}
      </p>)}
      {source?.recipes.length
        ? source.recipes.map(r => <ManufacturingCard key={r.id} recipe={r}/>)
        : <p className='catalog-note'>{builtIn.length
          ? text('В фабрикаторе не печатается: модуль стоит в шасси с самого начала.', 'Not printable: the module comes installed in the chassis.')
          : text('В фабрикаторе не печатается: выдаётся особым ролям, через аплинк или появляется на карте.', 'Not printable: it comes with special roles, from an uplink or spawns on the map.')}</p>}
    </section>

    {builtIn.length > 0 && <section><h3>{text('Встроен в шасси', 'Built into')}</h3><ul className='borg-chips'>{builtIn.map(chip)}</ul></section>}
    {fits.length > 0 && <section><h3>{text('Можно установить в', 'Fits')}</h3><ul className='borg-chips'>{fits.map(chip)}</ul></section>}
  </article>;
};

const ChassisDetails = ({ id, chassis: c, branch, modules, onModule }: {
  id: string; chassis: BorgChassisEntry | null; branch: BorgBranch | undefined;
  modules: ReadonlyMap<string, BorgModuleEntry>; onModule: (id: string) => void;
}): ReactElement => {
  const text = useText();
  const list = (ids: readonly string[]) => <ul className='borg-chips'>{ids.map(mid => <li key={mid}>
    <button type='button' className='borg-chip' onClick={() => onModule(mid)}><CatalogIcon id={mid}/>{modules.get(mid)?.name ?? mid}</button>
  </li>)}</ul>;
  if (!c) {
    const all = branch ? Object.values(branch.columns).flat() : [];
    return <article>
      <div className='borg-details_heading'><div><h2>{text('Общие модули', 'Generic modules')}</h2><span className='catalog-id'>{id}</span></div></div>
      <p>{text('Подходят любому станционному шасси и многим шасси Синдиката. В ветках шасси они не повторяются, кроме встроенных.', 'Fit every station chassis and many Syndicate ones. Chassis branches do not repeat them, except as built-in modules.')}</p>
      {list(all)}
    </article>;
  }
  const faction = factionOf(c, text);
  return <article>
    <div className='borg-details_heading'>
      <span className='borg-node_icon borg-node_icon--large'><CatalogIcon id={c.entity}/></span>
      <div><h2>{title(c.name)}</h2><span className='catalog-id'>{c.entity}</span></div>
      {faction && <span className='catalog-badge'>{faction}</span>}
    </div>
    {c.description && <p>{c.description}</p>}
    <p>{c.extraSlots != null
      ? text(`Слоты модулей: ${c.slots} — ${c.defaultModules.length} встроенных и ${c.extraSlots} свободных.`, `Module slots: ${c.slots} — ${c.defaultModules.length} built-in and ${c.extraSlots} free.`)
      : c.slots != null ? text(`Слоты модулей: ${c.slots}.`, `Module slots: ${c.slots}.`) : null}</p>
    <p className='borg-details_tags'>{text('Принимает модули', 'Accepts modules')}: {c.whitelist.map(tag => <span key={tag} className='catalog-badge'>{tagName(tag, text)}</span>)}</p>
    {c.defaultModules.length > 0 && <section><h3>{text('Встроенные модули', 'Built-in modules')}</h3>{list(c.defaultModules.filter(mid => modules.has(mid)))}</section>}
    {branch && <section><h3>{text('Модули только для этого шасси', 'Chassis-specific modules')}</h3>
      {Object.entries(branch.columns).filter(([col]) => col !== 'default').flatMap(([, ids]) => ids).length
        ? list(Object.entries(branch.columns).filter(([col]) => col !== 'default').flatMap(([, ids]) => ids))
        : <p className='catalog-note'>{text('Нет: шасси использует общие модули.', 'None: the chassis uses generic modules.')}</p>}
    </section>}
  </article>;
};

const tagName = (tag: string, text: Text) => {
  const name = TagNames[tag];
  return name ? text(name[0], name[1]) : tag;
};

/* ---------- Pan & zoom ---------- */

const MinScale = 0.15;
const MaxScale = 1.75;
/** How far the tree may be pulled past its side edges. */
const Slack = 48;

/** A smaller tree stays inside the viewport; a larger one cannot leave a gap at its edges. */
const clampPan = (pos: number, content: number, viewport: number, slack: number) =>
  content <= viewport
    ? Math.min(viewport - content, Math.max(0, pos))
    : Math.min(slack, Math.max(viewport - content - slack, pos));

interface PanZoom {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  headerRef: RefObject<HTMLDivElement | null>;
  zoomLabel: number;
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
  onClickCapture: (e: ReactMouseEvent) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  zoomBy: (factor: number) => void;
  reset: () => void;
  fit: () => void;
  centerOn: (node: TreeNode, animate?: boolean) => void;
}

/**
 * Transform-based panning: the content moves under a fixed viewport, the
 * column header follows horizontally only. Updates go straight to the DOM so
 * dragging does not re-render the tree.
 */
const usePanZoom = (layout: TreeLayout): PanZoom => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const view = useRef({ x: 0, y: 0, scale: 1 });
  const [zoomLabel, setZoomLabel] = useState(100);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; dist: number; scale: number } | null>(null);
  const suppressClick = useRef(false);
  const size = useRef({ width: layout.width, height: layout.height });
  size.current = { width: layout.width, height: layout.height };

  const apply = useCallback((animate = false) => {
    const viewport = viewportRef.current, content = contentRef.current, header = headerRef.current;
    if (!viewport || !content || !header) return;
    const v = view.current;
    const w = size.current.width * v.scale, h = size.current.height * v.scale;
    v.x = clampPan(v.x, w, viewport.clientWidth, Slack);
    v.y = clampPan(v.y, h, viewport.clientHeight, 0);
    viewport.classList.toggle('is-animating', animate);
    content.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;
    header.style.transform = `translate(${v.x}px, 0) scale(${v.scale})`;
    header.classList.toggle('is-floating', v.y < -TreeMetrics.padding * v.scale);
    setZoomLabel(Math.round(v.scale * 100));
  }, []);

  const zoomAt = useCallback((cx: number, cy: number, scale: number, animate = false) => {
    const v = view.current;
    const next = Math.min(MaxScale, Math.max(MinScale, scale));
    v.x = cx - (cx - v.x) * next / v.scale;
    v.y = cy - (cy - v.y) * next / v.scale;
    v.scale = next;
    apply(animate);
  }, [apply]);

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const v = view.current;
    // The whole tree, both ways: an overview to zoom into with the wheel.
    v.scale = Math.min(1, Math.max(MinScale, Math.min(
      (viewport.clientWidth - 16) / size.current.width,
      (viewport.clientHeight - 8) / size.current.height)));
    v.x = (viewport.clientWidth - size.current.width * v.scale) / 2;
    v.y = 0;
    apply(true);
  }, [apply]);

  // First paint: fit the width, but keep labels readable.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    view.current.scale = Math.min(1, Math.max(0.6, (viewport.clientWidth - 16) / size.current.width));
    view.current.x = 8;
    apply();
  }, [apply]);
  // Collapsing branches changes the size; keep the view in bounds.
  useEffect(() => apply(), [layout, apply]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as Element).closest('.borg-tree_details')) return;
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, view.current.scale * Math.exp(-delta * 0.0015));
    };
    const onResize = () => apply();
    // Focus (Tab) and scrollIntoView still scroll an overflow: hidden box.
    // Turn that into a pan, so the focused node comes into view properly.
    const onScroll = () => {
      if (!viewport.scrollTop && !viewport.scrollLeft) return;
      view.current.x -= viewport.scrollLeft;
      view.current.y -= viewport.scrollTop;
      viewport.scrollTop = 0;
      viewport.scrollLeft = 0;
      apply();
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);
    return () => {
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [zoomAt, apply]);

  const isControl = (target: EventTarget) => (target as Element).closest('.borg-tree_zoom, .borg-tree_details, input, select, textarea');

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isControl(e.target)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = [...pointers.current.values()];
    const v = view.current;
    if (points.length === 1) {
      gesture.current = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, moved: false, dist: 0, scale: v.scale };
    } else if (points.length === 2 && gesture.current) {
      gesture.current = { ...gesture.current, moved: true, dist: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), scale: v.scale };
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const points = [...pointers.current.values()];
    if (points.length >= 2) {
      const rect = viewportRef.current!.getBoundingClientRect();
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (g.dist > 0) zoomAt((points[0].x + points[1].x) / 2 - rect.left, (points[0].y + points[1].y) / 2 - rect.top, g.scale * dist / g.dist);
      return;
    }
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) > 4) {
      g.moved = true;
      viewportRef.current!.setPointerCapture(e.pointerId);
      viewportRef.current!.classList.add('is-dragging');
    }
    if (g.moved) {
      view.current.x = g.vx + dx;
      view.current.y = g.vy + dy;
      apply();
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (pointers.current.size === 0) {
      if (gesture.current?.moved) suppressClick.current = true;
      gesture.current = null;
      viewportRef.current?.classList.remove('is-dragging');
    } else if (gesture.current) {
      // One finger left after a pinch: continue as a pan from here.
      const [p] = pointers.current.values();
      gesture.current = { ...gesture.current, x: p.x, y: p.y, vx: view.current.x, vy: view.current.y, dist: 0 };
    }
  };

  const onClickCapture = (e: ReactMouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = 80;
    const v = view.current;
    const viewport = viewportRef.current!;
    switch (e.key) {
      case 'ArrowLeft': v.x += step; break;
      case 'ArrowRight': v.x -= step; break;
      case 'ArrowUp': v.y += step; break;
      case 'ArrowDown': v.y -= step; break;
      case '+': case '=': zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, v.scale * 1.25, true); e.preventDefault(); return;
      case '-': zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, v.scale / 1.25, true); e.preventDefault(); return;
      case '0': fit(); e.preventDefault(); return;
      default: return;
    }
    e.preventDefault();
    apply(true);
  };

  const zoomBy = (factor: number) => {
    const viewport = viewportRef.current;
    if (viewport) zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, view.current.scale * factor, true);
  };
  const reset = () => {
    const viewport = viewportRef.current;
    if (viewport) zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, 1, true);
  };

  const centerOn = useCallback((node: TreeNode, animate = true) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const v = view.current;
    if (v.scale < 0.75) v.scale = 0.9;
    // Leave room for the details panel on wide screens.
    const panel = viewport.querySelector<HTMLElement>('.borg-tree_details');
    const free = panel && viewport.clientWidth > 900 ? viewport.clientWidth - panel.offsetWidth - 16 : viewport.clientWidth;
    v.x = free / 2 - (node.x + node.width / 2) * v.scale;
    v.y = viewport.clientHeight / 2 - (node.y + node.height / 2) * v.scale;
    apply(animate);
  }, [apply]);

  return {
    viewportRef, contentRef, headerRef, zoomLabel,
    onPointerDown, onPointerMove, onPointerUp, onClickCapture, onKeyDown,
    zoomBy, reset, fit, centerOn,
  };
};
