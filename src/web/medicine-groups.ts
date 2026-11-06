import type { CatalogReagent } from '../catalog-types';

/** Main gameplay purpose, based on the reagent descriptions in both source builds.
 * Tiers are navigation labels: broad first-line medicines precede specialized ones.
 * Match prototype IDs, never translated names; fork-only entries simply stay absent.
 */
export const medicineGroups = [
  { id: 'brute', title: ['Механические / физические повреждения', 'Brute / physical damage'], basic: ['Bicaridine'], advanced: ['Bruizine', 'Lacerinol', 'Puncturase', 'LustSalicylicAcid', 'PolypyryliumOligomers'] },
  { id: 'burn', title: ['Ожоги, холод и кислота', 'Burns, cold & caustic damage'], basic: ['Kelotane', 'Siderlac'], advanced: ['Dermaline', 'Pyrazine', 'Insuzine', 'Sigynate', 'Leporazine', 'Ignisol', 'LustOxanderm'] },
  { id: 'poison', title: ['Отравления и детоксикация', 'Poison & detoxification'], basic: ['Dylovene', 'Stellibinin', 'Ethylredoxrazine', 'Ipecac'], advanced: ['Diphenhydramine', 'Ultravasculine', 'Haloperidol'] },
  { id: 'airloss', title: ['Удушье и кислородное голодание', 'Asphyxiation & oxygen deprivation'], basic: ['Dexalin'], advanced: ['DexalinPlus', 'LustThyreostate'] },
  { id: 'blood', title: ['Кровопотеря и свёртывание крови', 'Blood loss & clotting'], basic: ['Saline', 'PulpedBananaPeel'], advanced: ['TranexamicAcid', 'HemostaticPowder', 'LustArtiplasm', 'Heparin'] },
  { id: 'radiation', title: ['Радиация', 'Radiation'], basic: ['Hyronalin', 'PotassiumIodide'], advanced: ['Arithrazine', 'Retroindralyne'] },
  { id: 'cellular', title: ['Клеточные повреждения', 'Cellular damage'], basic: [], advanced: ['Phalanximine', 'LustGenocillin'] },
  { id: 'cryo', title: ['Криогенные препараты', 'Cryogenic medicine'], basic: ['Cryoxadone'], advanced: ['Doxarubixadone', 'Opporozidone', 'Arcryox', 'Aloxadone', 'H-32', 'Antidon', 'Brutedon', 'Celliminol', 'Nutricryokomp'] },
  { id: 'emergency', title: ['Стабилизация и комплексное лечение', 'Stabilization & general healing'], basic: ['Inaprovaline', 'Tricordrazine'], advanced: ['Epinephrine', 'Omnizine', 'ApotheosoticEnzymes'] },
  { id: 'neurological', title: ['Мозг, зрение и нервная система', 'Brain, eyes & nervous system'], basic: ['Oculine'], advanced: ['Mannitol', 'Psicodine', 'Synaptizine', 'Ethyloxyephedrine', 'Diphenylmethylamine', 'Cognizine', 'Miniozine'] },
  { id: 'infection', title: ['Инфекции', 'Infections'], basic: ['Ambuzol'], advanced: ['AmbuzolPlus'] },
  { id: 'pressure', title: ['Защита от давления', 'Pressure protection'], basic: ['Barozine'], advanced: ['BarozinePlus'] },
  { id: 'narcotics', title: ['Наркотики', 'Narcotics'], basic: [], advanced: [] },
  { id: 'other', title: ['Прочее', 'Other chemistry'], basic: ['Cryptobiolin', 'Lipozine', 'Holywater', 'Unholywater'], advanced: ['ApotheosoticExtract', 'ReagentArrows'] },
] as const;

export const medicineClassification = (id: string, sourceGroup?: string) => {
  if (sourceGroup === 'Narcotics') return { group: 'narcotics' as const, tier: 'basic' as const };
  for (const group of medicineGroups) {
    if ((group.basic as readonly string[]).includes(id)) return { group: group.id, tier: 'basic' as const };
    if ((group.advanced as readonly string[]).includes(id)) return { group: group.id, tier: 'advanced' as const };
  }
  // Keep newly added source reagents discoverable until their purpose is reviewed.
  return { group: 'other' as const, tier: 'basic' as const };
};

export const groupMedicines = (reagents: readonly CatalogReagent[], selected = '') => medicineGroups
  .filter(g => !selected || g.id === selected)
  .map(g => ({ ...g,
    basicItems: reagents.filter(r => { const c = medicineClassification(r.id, r.group); return c.group === g.id && c.tier === 'basic'; }),
    advancedItems: reagents.filter(r => { const c = medicineClassification(r.id, r.group); return c.group === g.id && c.tier === 'advanced'; }),
  }))
  .filter(g => g.basicItems.length + g.advancedItems.length > 0);
