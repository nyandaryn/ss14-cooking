import type { BorgCatalog, BorgChassisEntry, BorgTechnology } from '../borg-types';
import type { ManufacturingRecipe } from '../catalog-types';

const GenericTag = 'BorgModuleGeneric';

/** Tech-tree columns, left to right: how early a crew can get the module. */
export const BorgColumns = ['default', 'fabricator', 'tier1', 'tier2', 'tier3', 'emag', 'none'] as const;
export type BorgColumn = typeof BorgColumns[number];

export interface BorgModuleSource {
  readonly column: Exclude<BorgColumn, 'default'>;
  /** Technologies that unlock the recipe, cheapest tier first. */
  readonly technologies: readonly BorgTechnology[];
  readonly recipes: readonly ManufacturingRecipe[];
}

/** ID of the generic-module branch; `generic` is taken by the generic chassis. */
export const SharedBranchId = 'shared';

export interface BorgBranch {
  /** {@link SharedBranchId} for the generic-module branch, otherwise the chassis ID. */
  readonly id: string;
  readonly chassis: BorgChassisEntry | null;
  readonly columns: Readonly<Record<BorgColumn, readonly string[]>>;
}

const StationOrder = ['generic', 'engineering', 'mining', 'medical', 'janitor', 'service', 'security', 'peace', 'clown'];

export type BorgFaction = 'syndicate' | 'ert' | 'pirate' | 'xenoborg' | 'other';
const FactionOrder: readonly BorgFaction[] = ['syndicate', 'ert', 'pirate', 'xenoborg', 'other'];

/** Who fields a non-station chassis, judged by its prototype ID. */
export const chassisFaction = (c: BorgChassisEntry): BorgFaction | null =>
  c.kind === 'station' ? null :
  /Syndicate/.test(c.id) ? 'syndicate' :
  /ERT/.test(c.id) ? 'ert' :
  /Pirate/.test(c.id) ? 'pirate' :
  /Xenoborg|Mothership/.test(c.id) ? 'xenoborg' :
  'other';

/** Where a module comes from, judged by its exosuit fabricator recipes. */
export const borgModuleSources = (
  catalog: BorgCatalog,
  manufacturing: readonly ManufacturingRecipe[]
): Map<string, BorgModuleSource> => {
  const techs = new Map(catalog.technologies.map(t => [t.id, t]));
  const result = new Map<string, BorgModuleSource>();
  for (const module of catalog.modules) {
    const recipes = manufacturing.filter(r => r.entityResult && r.result.id === module.id);
    const access = new Set(recipes.flatMap(r => r.machines.map(m => m.access)));
    const technologies = [...new Map(recipes.flatMap(r => r.technologies)
      .map(t => [t.id, techs.get(t.id) ?? { ...t, tier: 1, discipline: '' }])).values()]
      .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
    let column: BorgModuleSource['column'] = 'none';
    if (access.has('static')) column = 'fabricator';
    else if (access.has('research') && technologies.length) {
      const tier = technologies[0].tier;
      column = tier <= 1 ? 'tier1' : tier === 2 ? 'tier2' : 'tier3';
    } else if (access.has('emag') || access.has('emagResearch')) column = 'emag';
    result.set(module.id, { column, technologies, recipes });
  }
  return result;
};

const emptyColumns = (): Record<BorgColumn, string[]> =>
  Object.fromEntries(BorgColumns.map(c => [c, []])) as unknown as Record<BorgColumn, string[]>;

/**
 * One branch for the modules every station chassis accepts, then one per
 * chassis. A chassis branch holds its default loadout plus the modules only
 * its whitelist accepts; generic modules stay in the shared branch so they are
 * not repeated nine times.
 */
export const buildBorgBranches = (
  catalog: BorgCatalog,
  sources: ReadonlyMap<string, BorgModuleSource>,
  collator: Intl.Collator
): BorgBranch[] => {
  const byName = (a: string, b: string) => {
    const ma = catalog.modules.find(m => m.id === a), mb = catalog.modules.find(m => m.id === b);
    return collator.compare(ma?.name ?? a, mb?.name ?? b);
  };
  const place = (columns: Record<BorgColumn, string[]>, id: string) => {
    columns[sources.get(id)?.column ?? 'none'].push(id);
  };
  const known = new Set(catalog.modules.map(m => m.id));

  const generic = emptyColumns();
  for (const m of catalog.modules) if (m.tags.includes(GenericTag)) place(generic, m.id);

  const chassis = [...catalog.chassis].sort((a, b) =>
    (a.kind === b.kind ? 0 : a.kind === 'station' ? -1 : 1) ||
    (a.kind === 'station' ? rank(a.id) - rank(b.id) : FactionOrder.indexOf(chassisFaction(a)!) - FactionOrder.indexOf(chassisFaction(b)!)) ||
    collator.compare(a.name, b.name)
  );
  const branches: BorgBranch[] = [];
  if (BorgColumns.some(c => generic[c].length)) {
    for (const c of BorgColumns) generic[c].sort(byName);
    branches.push({ id: SharedBranchId, chassis: null, columns: generic });
  }
  for (const c of chassis) {
    const columns = emptyColumns();
    const defaults = c.defaultModules.filter(id => known.has(id));
    columns.default.push(...new Set(defaults));
    for (const m of catalog.modules) {
      if (defaults.includes(m.id) || m.tags.includes(GenericTag)) continue;
      if (m.tags.some(tag => c.whitelist.includes(tag))) place(columns, m.id);
    }
    for (const col of BorgColumns) if (col !== 'default') columns[col].sort(byName);
    branches.push({ id: c.id, chassis: c, columns });
  }
  return branches;
};

const rank = (id: string) => {
  const i = StationOrder.indexOf(id);
  return i < 0 ? StationOrder.length : i;
};

/* ---------- Layout ---------- */

export const TreeMetrics = {
  rootWidth: 196,
  chassisWidth: 272,
  nodeWidth: 216,
  nodeHeight: 52,
  chassisHeight: 72,
  rowGap: 10,
  columnGap: 64,
  laneGap: 34,
  trunkGap: 44,
  headerHeight: 56,
  padding: 32,
} as const;

export interface TreeNode {
  readonly key: string;
  readonly kind: 'root' | 'branch' | 'module';
  /** Module or chassis ID; {@link SharedBranchId} for the generic-module branch. */
  readonly id: string;
  readonly branch: string;
  readonly column?: BorgColumn;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TreeEdge {
  readonly key: string;
  readonly branch: string;
  readonly path: string;
}

export interface TreeLayout {
  readonly nodes: readonly TreeNode[];
  readonly edges: readonly TreeEdge[];
  /** Visible module columns and their x positions. */
  readonly columns: readonly { column: BorgColumn; x: number }[];
  readonly width: number;
  readonly height: number;
}

/**
 * Lanes stacked top to bottom, one per branch, with modules in shared tier
 * columns. Lines: a trunk from the root to every branch, a spine through each
 * lane, and a bracket down each column of the lane.
 */
export const layoutBorgTree = (
  branches: readonly BorgBranch[],
  collapsed: ReadonlySet<string> = new Set()
): TreeLayout => {
  const M = TreeMetrics;
  const visibleColumns = BorgColumns.filter(c => branches.some(b => b.columns[c].length));
  const branchX = M.padding + M.rootWidth + M.trunkGap * 2;
  const firstColumnX = branchX + M.chassisWidth + M.columnGap;
  const columnX = new Map(visibleColumns.map((c, i) => [c, firstColumnX + i * (M.nodeWidth + M.columnGap)]));
  const nodes: TreeNode[] = [];
  const edges: TreeEdge[] = [];
  const row = M.nodeHeight + M.rowGap;
  const trunkX = M.padding + M.rootWidth + M.trunkGap;

  let y = M.padding + M.headerHeight;
  const rootY = y;
  const branchCenters: number[] = [];
  for (const branch of branches) {
    const isCollapsed = collapsed.has(branch.id);
    // The first module row and the branch card share a centre line: the spine.
    const spineY = y + M.chassisHeight / 2;
    const firstRowY = spineY - M.nodeHeight / 2;
    nodes.push({ key: `branch:${branch.id}`, kind: 'branch', id: branch.id, branch: branch.id, x: branchX, y, width: M.chassisWidth, height: M.chassisHeight });
    branchCenters.push(spineY);
    let laneBottom = y + M.chassisHeight;
    if (!isCollapsed) {
      let lastColumnX: number | null = null;
      for (const column of visibleColumns) {
        const ids = branch.columns[column];
        if (!ids.length) continue;
        const x = columnX.get(column)!;
        lastColumnX = x;
        ids.forEach((id, i) => {
          const nodeY = firstRowY + i * row;
          nodes.push({ key: `${branch.id}:${column}:${id}`, kind: 'module', id, branch: branch.id, column, x, y: nodeY, width: M.nodeWidth, height: M.nodeHeight });
          laneBottom = Math.max(laneBottom, nodeY + M.nodeHeight);
        });
        if (ids.length > 1) {
          const bx = x - M.columnGap / 2;
          const lastY = firstRowY + (ids.length - 1) * row + M.nodeHeight / 2;
          const ticks = ids.slice(1).map((_, i) => {
            const ty = firstRowY + (i + 1) * row + M.nodeHeight / 2;
            return `M${bx},${ty - 8} q0,8 8,8 H${x}`;
          }).join(' ');
          edges.push({ key: `bracket:${branch.id}:${column}`, branch: branch.id, path: `M${bx},${spineY} V${lastY - 8} ${ticks}` });
        }
      }
      if (lastColumnX !== null) {
        edges.push({ key: `spine:${branch.id}`, branch: branch.id, path: `M${branchX + M.chassisWidth},${spineY} H${lastColumnX}` });
      }
    }
    y = laneBottom + M.laneGap;
  }

  const rootHeight = M.chassisHeight;
  nodes.unshift({ key: 'root', kind: 'root', id: 'root', branch: '', x: M.padding, y: rootY, width: M.rootWidth, height: rootHeight });
  if (branchCenters.length) {
    const rootCenter = rootY + rootHeight / 2;
    const last = branchCenters[branchCenters.length - 1];
    edges.push({ key: 'trunk', branch: '', path: `M${M.padding + M.rootWidth},${rootCenter} H${trunkX} V${last - 12}` });
    branchCenters.forEach((cy, i) => {
      const path = i === 0
        ? `M${trunkX},${cy} H${branchX}`
        : `M${trunkX},${cy - 12} q0,12 12,12 H${branchX}`;
      edges.push({ key: `trunk:${branches[i].id}`, branch: branches[i].id, path });
    });
  }

  const lastColumn = visibleColumns.length ? columnX.get(visibleColumns[visibleColumns.length - 1])! + M.nodeWidth : branchX + M.chassisWidth;
  return {
    nodes,
    edges,
    columns: visibleColumns.map(column => ({ column, x: columnX.get(column)! })),
    width: lastColumn + M.padding,
    height: y - M.laneGap + M.padding,
  };
};
