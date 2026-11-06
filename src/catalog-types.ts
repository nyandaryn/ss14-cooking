/** Localized reference, also used for prototypes outside the cooking sprite sheet. */
export interface CatalogRef { id: string; name: string }
export interface ReagentMetabolism { stage: string; rate: number; effects: Record<string, unknown>[] }
export interface CatalogReagent extends CatalogRef { description: string; color: string; group: string; metabolisms?: ReagentMetabolism[] }
export interface PlantEntry extends CatalogRef {
  products: CatalogRef[];
  mutations: CatalogRef[];
  seed: CatalogRef | null;
  harvest: string;
  tool: string | null;
  yield: number;
  potency: number;
  lifespan: number;
  maturation: number;
  production: number;
  chemicals: { reagent: CatalogRef; min: number; max: number; potencyDivisor: number; amount: number }[];
}
export interface ChemicalReaction {
  id: string;
  reactants: { reagent: CatalogRef; amount: number; catalyst: boolean }[];
  products: { reagent: CatalogRef; amount: number }[];
  minTemp: number | null;
  maxTemp: number | null;
  mixers: string[];
  hasOtherEffects: boolean;
}
export interface ManufacturingRecipe {
  id: string; result: CatalogRef; entityResult: boolean; reagentResults: { reagent: CatalogRef; amount: number }[]; materials: { material: CatalogRef; amount: number; entityId?: string }[]; time: number | null;
  machines: { machine: CatalogRef; access: "static" | "research" | "emag" | "emagResearch"; materialMultiplier: number; timeMultiplier: number }[];
  technologies: CatalogRef[];
}
export interface VendorEntry { machine: CatalogRef; items: { entity: CatalogRef; amount: number; access: string }[] }
export interface DepartmentCatalog {
  vending: VendorEntry[];
  manufacturing: ManufacturingRecipe[];
  extractions: { entity: CatalogRef; reagent: CatalogRef; method: 'grind' | 'juice'; amount: number }[];
  plants: PlantEntry[];
  reagents: CatalogReagent[];
  reactions: ChemicalReaction[];
  drinks: string[];
  medicine: string[];
  botanical: string[];
}
