import { CatalogRef } from './catalog-types';
export interface ReferenceEntity extends CatalogRef {
  description: string; categories: string[]; group?: string;
  stats: { label: string; value: string }[];
}
export interface CraftEntry extends CatalogRef {
  description: string; category: string; result: CatalogRef | null;
  start: string; target: string; conditions: string[];
  steps: { name: string; amount: number | null; seconds: number | null; kind: string }[];
  reachable: boolean;
}
export interface LawEntry extends CatalogRef {
  category: string; ionWeight?: number; laws: { order: number; text: string }[]; users: CatalogRef[]; typeUsers?: CatalogRef[];
}
export interface GasEntry extends CatalogRef {
  description: string; color: string; heatCapacity: number; molarMass: number; reagent: string | null;
}
export interface GasRecipe extends CatalogRef {
  requirements: { gas: CatalogRef; amount: number }[];
  minTemp: number | null; maxTemp: number | null; minEnergy: number | null;
  effects: string[]; explanation: string; products: string[]; source: string;
}
export interface Encyclopedia {
  creatures: ReferenceEntity[]; items: ReferenceEntity[]; crafting: CraftEntry[];
  laws: LawEntry[]; gases: GasEntry[]; gasReactions: GasRecipe[];
}
