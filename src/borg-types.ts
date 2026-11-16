import { CatalogRef } from './catalog-types';

/** Module tag every station chassis accepts. */
export const GenericBorgModuleTag = 'BorgModuleGeneric';

export interface BorgChassisEntry extends CatalogRef {
  /** Entity whose sprite and page represent the chassis. */
  entity: string;
  description: string;
  /** Station chassis are picked by a crew cyborg; special ones belong to antagonists and teams. */
  kind: 'station' | 'special';
  /** Module tags the chassis accepts. */
  whitelist: string[];
  /** Modules installed when the chassis is built or selected. */
  defaultModules: string[];
  /** Free slots beyond the default modules, when the game defines it that way. */
  extraSlots: number | null;
  /** Total module slots. */
  slots: number | null;
}

export interface BorgModuleEntry extends CatalogRef {
  description: string;
  /** Tags that decide which chassis accept the module. */
  tags: string[];
  /** Items the module puts into the cyborg's hands. */
  items: CatalogRef[];
}

export interface BorgTechnology extends CatalogRef {
  tier: number;
  discipline: string;
}

export interface BorgCatalog {
  chassis: BorgChassisEntry[];
  modules: BorgModuleEntry[];
  /** Technologies that unlock module recipes, with their research tier. */
  technologies: BorgTechnology[];
}
