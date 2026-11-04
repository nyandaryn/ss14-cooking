// Recipe list, recipe cards, filters, recipe explorer, food sequences
// (combinations), temperatures.

import { pluralEn, pluralRu } from '../plural';

/** Display methods that have their own filter button / summary. */
type MethodKey =
  | 'microwave'
  | 'heat'
  | 'deepFry'
  | 'mix'
  | 'cut'
  | 'roll'
  | 'construct';

type IngredientModeKey = 'all' | 'any' | 'only';

export interface NoResultsParams {
  /** Summaries of the selected special properties (`Trait.filterSummary`). */
  readonly specialSummaries: readonly string[];
  /** Names of the selected special properties (`Trait.filterName`). */
  readonly specialNames: readonly string[];
  /** Already-described methods, from `methodSummaries`/`microwaveSubtypes`. */
  readonly methods: readonly string[];
  /** Trimmed search query, or null if not searching. */
  readonly search: string | null;
  /** Ingredient mode, or null if no ingredients are selected. */
  readonly mode: IngredientModeKey | null;
}

export interface FilterDescriptionParams {
  readonly methods: number;
  readonly ingredients: number;
  readonly mode: IngredientModeKey;
  readonly specials: number;
}

const joinNatural = (
  items: readonly string[],
  sep: string,
  lastSep: string
): string =>
  items.length <= 1
    ? items.join('')
    : items.slice(0, -1).join(sep) + lastSep + items[items.length - 1];

const listAndEn = (items: readonly string[]) => joinNatural(items, ', ', ' and ');
const listOrEn = (items: readonly string[]) => joinNatural(items, ', ', ' or ');
const listAndRu = (items: readonly string[]) => joinNatural(items, ', ', ' и ');
const listOrRu = (items: readonly string[]) => joinNatural(items, ', ', ' или ');

export const en = {
  // --- Recipe list ---
  sortDefault: 'Default order',
  sortAlpha: 'Alphabetic',
  groupByMethod: 'Group by method',
  favoritesFirst: 'Favourites first',
  searchLabel: 'Search recipes by name',
  searchPlaceholder: 'Search recipes by name...',
  filterButton: 'Filter',
  filterButtonTooltip: 'Filter by ingredient or method',
  clearFilter: 'Clear filter',

  resultAll: (total: number) =>
    `Showing all ${total} ${pluralEn(total, 'recipe', 'recipes')}.`,
  resultSome: (count: number, total: number) =>
    `Showing ${count} of ${total} ${pluralEn(total, 'recipe', 'recipes')}.`,

  /** Describes a method for the "couldn't find any X" message. */
  methodSummaries: {
    microwave: 'microwave recipes',
    heat: 'heating recipes',
    deepFry: 'deep-frying recipes',
    mix: 'reactions',
    cut: 'cutting recipes',
    roll: 'rolling pin recipes',
    construct: 'general recipes',
  } as Record<MethodKey, string>,
  /** Describes selected microwave subtypes (their `filterSummary`s). */
  microwaveSubtypes: (summaries: readonly string[]) =>
    `${listOrEn(summaries)} recipes`,

  noResults: (p: NoResultsParams): string => {
    let message = 'Couldn’t find any ';
    if (p.specialSummaries.length > 0) {
      message += listAndEn(p.specialSummaries) + ' ';
    }
    message += p.methods.length > 0 ? listOrEn(p.methods) : 'recipes';
    if (p.search) {
      message += ` with ‘${p.search}’ in the name`;
    }
    switch (p.mode) {
      case 'all':
        message += ' that contain all the selected ingredients';
        break;
      case 'any':
        message += ' that contain any of the selected ingredients';
        break;
      case 'only':
        message += ' made from only the selected ingredients';
        break;
    }
    return message + '.';
  },

  filterDescription: (p: FilterDescriptionParams): string => {
    const parts: string[] = [];
    if (p.methods > 0) {
      parts.push(
        p.methods === 1
          ? 'one preparation method'
          : `${p.methods} preparation methods`
      );
    }
    if (p.ingredients > 0) {
      const n = p.ingredients;
      switch (p.mode) {
        case 'all':
          parts.push(n === 1
            ? 'recipes using the selected ingredient'
            : `recipes using all ${n} selected ingredients`);
          break;
        case 'any':
          parts.push(n === 1
            ? 'recipes using the selected ingredient'
            : `recipes using any of the ${n} selected ingredients`);
          break;
        case 'only':
          parts.push(n === 1
            ? 'recipes made from only the selected ingredient'
            : `recipes made from only the ${n} selected ingredients`);
          break;
      }
    }
    if (p.specials > 0) {
      parts.push(
        p.specials === 1
          ? 'one special property'
          : `${p.specials} special properties`
      );
    }
    return `Filtering by ${listAndEn(parts)}`;
  },

  ingredientSuggestions: 'Filter by ingredient:',

  // --- Filter editor ---
  preparationMethod: 'Preparation method:',
  /** Filter button labels per method. */
  methodLabels: {
    microwave: 'Microwave',
    heat: 'Heat',
    deepFry: 'Deep fry',
    mix: 'Mix',
    cut: 'Cut',
    roll: 'Roll',
    construct: 'General',
  } as Record<MethodKey, string>,
  /** Alt text for the method sprites (the tool/machine shown). */
  methodAlts: {
    microwave: 'microwave',
    heat: 'grill',
    deepFry: 'deep fryer',
    mix: 'beaker',
    cut: 'knife',
    roll: 'rolling pin',
    construct: '',
  } as Record<MethodKey, string>,
  hideRarelyUsed: 'Hide rarely used ingredients',
  hideRarelyUsedTooltip: 'Hides ingredients that are only used in a single recipe. You can still find all ingredients by name.',
  solidIngredients: 'Solid ingredients:',
  reagentIngredients: 'Reagent ingredients:',
  noIngredientsMatching: 'Couldn’t find any ingredients matching ',
  noReagentsMatching: 'Couldn’t find any reagents matching ',
  showRecipesWith: 'Show recipes with:',
  modeAll: 'All of the selected ingredients',
  modeAny: 'Any of the selected ingredients',
  modeOnly: 'Only the selected ingredients',
  group: 'Group:',
  groupTooltip: 'These groups are taken from the game data and are not always correct or intuitive. Each recipe belongs to exactly one group.',
  specialProperty: 'Special property:',
  selectedCount: (n: number) => `${n} selected`,
  searchIngredients: 'Search ingredients...',
  collapseList: 'Collapse list',
  expandList: 'Expand list',
  clearSelectedIngredients: 'Clear selected ingredients',
  copyLinkTo: 'Copy link to:',
  linkCopied: 'Link copied to clipboard!',
  linkFilter: 'Filter',
  linkSearch: 'Search',
  linkFilterAndSearch: 'Filter + search',
  exportedFilter: 'Exported filter',
  exportedSearch: 'Exported search',
  exportedFilterAndSearch: 'Exported filter + search',

  // --- Recipe card ---
  foodSequenceStartTooltip:
    'You can put other foods inside this one.\n' +
    'Click to see what can be put inside it.',
  canPutInside: 'You can put this food inside:',
  canFinishOff: 'This food can finish off:',
  exploreRelated: 'Explore related recipes',
  closeExplorer: 'Close recipe explorer',
  makesQty: (n: number) => `This recipe makes ${n}.`,
  /** Reagent amount, e.g. "5u". `amount` is already formatted. */
  units: (amount: string) => `${amount}u`,
  /**
   * Prefix before a solid ingredient's name, e.g. "2 " in "2 tomato".
   * `qty` is already formatted.
   */
  solidQty: (n: number, qty: string) => `${qty} `,
  reagentResultTooltip: (qty: string, name: string) =>
    `The recipe makes ${qty} ${name} with the amounts shown. You can make larger or smaller batches as long as the ratio stays the same.`,
  catalyst: 'catalyst',
  catalystTooltip: (name: string) =>
    `You won’t lose any of the ${name} when making this recipe.`,
  commonSources: 'Common sources:',

  // --- Method (bottom of the recipe card) ---
  seconds: (n: string) => `${n} sec`,
  cook: 'Cook',
  mix: 'Mix',
  deepFry: 'Deep fry',
  above: 'above ',
  below: 'below ',

  // --- Construction steps ---
  stepTake: 'Take ',
  stepFinishWith: 'Finish with ',
  stepFinishWithOneOf: 'Finish with one of:',
  stepMix: 'Mix:',
  /**
   * "Add" step text. `multiple` = the step accepts any of several entities
   * (they're listed after the text).
   */
  stepAdd: (
    min: number | undefined,
    max: number | undefined,
    multiple: boolean
  ): string => {
    let text: string;
    if (min) {
      text = max ? `Add ${min} to ${max}` : `Add ${min} or more`;
    } else if (max) {
      text = `Add up to ${max}`;
    } else {
      text = 'Add';
    }
    if (multiple) {
      text += min || max ? ' of any of:' : ' any of:';
    }
    return text;
  },
  stepAddReagent: 'Add ',
  stepHeatTo: 'Heat it to ',
  stepHeatBetween: 'Heat it to between ',
  stepHeatBetweenAnd: ' and ',
  stepSimple: {
    cut: 'Cut it',
    roll: 'Roll it',
    shake: 'Shake it',
    stir: 'Stir it',
  } as Record<'cut' | 'roll' | 'shake' | 'stir', string>,
  stepAlsoMakes: 'Also makes ',
  stepAlsoMakesList: 'Also makes:',

  // --- Recipe explorer ---
  explorerLabel: 'Recipe explorer',
  madeWith: 'Made with',
  usedIn: 'Used in',

  // --- Food sequences (combinations) ---
  foodSeqIntroBefore: 'Some foods can have items, usually foods, inserted into them – or, in the case of burger buns, put on them. Hold the ingredient in hand and click the receiver. In some places this system is referred to as ',
  foodSeqIntroTerm: 'food sequences',
  foodSeqIntroAfter: '.',
  foodSeqAccepts: (max: number) => ` accepts up to ${max} of:`,
  foodSeqFinishedWith: 'and can be finished with one of:',
};

export type RecipesMessages = typeof en;

export const ru: RecipesMessages = {
  // --- Recipe list ---
  sortDefault: 'По умолчанию',
  sortAlpha: 'По алфавиту',
  groupByMethod: 'Группировать по способу',
  favoritesFirst: 'Сначала избранное',
  searchLabel: 'Поиск рецептов по названию',
  searchPlaceholder: 'Поиск рецептов по названию...',
  filterButton: 'Фильтр',
  filterButtonTooltip: 'Фильтр по ингредиентам и способу приготовления',
  clearFilter: 'Сбросить фильтр',

  resultAll: (total: number) => `Всего рецептов: ${total}.`,
  resultSome: (count: number, total: number) =>
    `Найдено рецептов: ${count} из ${total}.`,

  methodSummaries: {
    microwave: 'рецептов для микроволновки',
    heat: 'рецептов на гриле',
    deepFry: 'рецептов во фритюре',
    mix: 'реакций',
    cut: 'рецептов с нарезкой',
    roll: 'рецептов со скалкой',
    construct: 'прочих рецептов',
  },
  microwaveSubtypes: (summaries: readonly string[]) =>
    `рецептов ${listOrRu(summaries)}`,

  noResults: (p: NoResultsParams): string => {
    let message = 'Не найдено ';
    message += p.methods.length > 0 ? listOrRu(p.methods) : 'рецептов';
    if (p.specialNames.length > 0) {
      message += `, отмеченных как ${listAndRu(p.specialNames.map(n => `«${n}»`))}`;
    }
    if (p.search) {
      message += `, в названии которых есть «${p.search}»`;
    }
    switch (p.mode) {
      case 'all':
        message += ', содержащих все выбранные ингредиенты';
        break;
      case 'any':
        message += ', содержащих хотя бы один из выбранных ингредиентов';
        break;
      case 'only':
        message += ', приготовленных только из выбранных ингредиентов';
        break;
    }
    return message + '.';
  },

  filterDescription: (p: FilterDescriptionParams): string => {
    const parts: string[] = [];
    if (p.methods > 0) {
      parts.push(`${p.methods} ${pluralRu(
        p.methods,
        'способ приготовления',
        'способа приготовления',
        'способов приготовления'
      )}`);
    }
    if (p.ingredients > 0) {
      const n = p.ingredients;
      switch (p.mode) {
        case 'all':
          parts.push(n === 1
            ? 'рецепты с выбранным ингредиентом'
            : `рецепты со всеми выбранными ингредиентами (${n})`);
          break;
        case 'any':
          parts.push(n === 1
            ? 'рецепты с выбранным ингредиентом'
            : `рецепты с любым из выбранных ингредиентов (${n})`);
          break;
        case 'only':
          parts.push(n === 1
            ? 'рецепты только из выбранного ингредиента'
            : `рецепты только из выбранных ингредиентов (${n})`);
          break;
      }
    }
    if (p.specials > 0) {
      parts.push(`${p.specials} ${pluralRu(
        p.specials,
        'особое свойство',
        'особых свойства',
        'особых свойств'
      )}`);
    }
    return `Фильтр: ${listAndRu(parts)}`;
  },

  ingredientSuggestions: 'Фильтр по ингредиенту:',

  // --- Filter editor ---
  preparationMethod: 'Способ приготовления:',
  methodLabels: {
    microwave: 'Микроволновка',
    heat: 'Обжарить',
    deepFry: 'Фритюр',
    mix: 'Смешать',
    cut: 'Нарезать',
    roll: 'Раскатать',
    construct: 'Прочее',
  },
  methodAlts: {
    microwave: 'микроволновка',
    heat: 'электрогриль',
    deepFry: 'фритюрница',
    mix: 'мензурка',
    cut: 'кухонный нож',
    roll: 'скалка',
    construct: '',
  },
  hideRarelyUsed: 'Скрыть редкие ингредиенты',
  hideRarelyUsedTooltip: 'Скрывает ингредиенты, которые нужны только в одном рецепте. Их всё равно можно найти поиском по названию.',
  solidIngredients: 'Твёрдые ингредиенты:',
  reagentIngredients: 'Реагенты:',
  noIngredientsMatching: 'Не найдено ингредиентов по запросу ',
  noReagentsMatching: 'Не найдено реагентов по запросу ',
  showRecipesWith: 'Показывать рецепты:',
  modeAll: 'Со всеми выбранными ингредиентами',
  modeAny: 'С любым из выбранных ингредиентов',
  modeOnly: 'Только из выбранных ингредиентов',
  group: 'Группа:',
  groupTooltip: 'Группы взяты из игровых данных и не всегда точны или логичны. Каждый рецепт входит ровно в одну группу.',
  specialProperty: 'Особые свойства:',
  selectedCount: (n: number) => `выбрано: ${n}`,
  searchIngredients: 'Поиск ингредиентов...',
  collapseList: 'Свернуть список',
  expandList: 'Развернуть список',
  clearSelectedIngredients: 'Сбросить выбранные ингредиенты',
  copyLinkTo: 'Скопировать ссылку на:',
  linkCopied: 'Ссылка скопирована!',
  linkFilter: 'Фильтр',
  linkSearch: 'Поиск',
  linkFilterAndSearch: 'Фильтр + поиск',
  exportedFilter: 'Ссылка на фильтр',
  exportedSearch: 'Ссылка на поиск',
  exportedFilterAndSearch: 'Ссылка на фильтр и поиск',

  // --- Recipe card ---
  foodSequenceStartTooltip:
    'В это блюдо можно положить другую еду.\n' +
    'Нажмите, чтобы посмотреть, что именно.',
  canPutInside: 'Эту еду можно положить в:',
  canFinishOff: 'Этой едой можно завершить:',
  exploreRelated: 'Связанные рецепты',
  closeExplorer: 'Закрыть связанные рецепты',
  makesQty: (n: number) => `Рецепт даёт ${n}\xA0шт.`,
  units: (amount: string) => `${amount}\xA0ед.`,
  // Game names can't be declined ("2 плитка шоколада"), so use "2 × …".
  solidQty: (n: number, qty: string) => n === 1 ? `${qty} ` : `${qty}\xA0×\xA0`,
  reagentResultTooltip: (qty: string, name: string) =>
    `Из указанных количеств получается ${qty} реагента «${name}». Можно готовить порцию больше или меньше, если сохранять пропорции.`,
  catalyst: 'катализатор',
  catalystTooltip: (name: string) =>
    `Реагент «${name}» не расходуется при приготовлении.`,
  commonSources: 'Где взять:',

  // --- Method (bottom of the recipe card) ---
  seconds: (n: string) => `${n}\xA0сек`,
  cook: 'Приготовить',
  mix: 'Смешать',
  deepFry: 'Фритюр',
  above: 'выше ',
  below: 'ниже ',

  // --- Construction steps ---
  stepTake: 'Возьмите ',
  stepFinishWith: 'В конце добавьте ',
  stepFinishWithOneOf: 'В конце добавьте одно из:',
  stepMix: 'Смешайте:',
  stepAdd: (
    min: number | undefined,
    max: number | undefined,
    multiple: boolean
  ): string => {
    let text: string;
    if (min) {
      text = max ? `Добавьте от ${min} до ${max}` : `Добавьте ${min} или больше`;
    } else if (max) {
      text = `Добавьте до ${max}`;
    } else {
      text = 'Добавьте';
    }
    if (multiple) {
      text += min || max ? ' из любых:' : ' любое из:';
    }
    return text;
  },
  stepAddReagent: 'Добавьте ',
  stepHeatTo: 'Нагрейте до ',
  stepHeatBetween: 'Нагрейте до температуры от ',
  stepHeatBetweenAnd: ' до ',
  stepSimple: {
    cut: 'Нарежьте',
    roll: 'Раскатайте',
    shake: 'Взболтайте',
    stir: 'Размешайте',
  },
  stepAlsoMakes: 'Также получается ',
  stepAlsoMakesList: 'Также получается:',

  // --- Recipe explorer ---
  explorerLabel: 'Связанные рецепты',
  madeWith: 'Из чего',
  usedIn: 'Куда идёт',

  // --- Food sequences (combinations) ---
  foodSeqIntroBefore: 'В некоторые блюда можно добавлять другие предметы, обычно еду, — а на булочки для бургеров их можно класть сверху. Возьмите ингредиент в руку и нажмите на блюдо-основу. Иногда эту механику называют ',
  foodSeqIntroTerm: 'food sequences',
  foodSeqIntroAfter: '.',
  foodSeqAccepts: (max: number) => `: можно добавить до ${max}\xA0шт. из списка:`,
  foodSeqFinishedWith: 'А завершить можно одним из:',
};
