// Menu planner: list, view, editor, ingredients, import dialog.

import { pluralEn, pluralRu } from '../plural';

export const en = {
  untitledMenu: '(untitled menu)',
  notFound: 'Menu not found',
  backToListing: 'Back to listing',

  list: {
    emptyTitle: 'No saved menus',
    emptyText: 'A menu is a collection of recipes and ingredients. Plan your food around a theme, gather up your favourite recipes, or just get a list of produce to grow.',
    createFirst: 'Create your first menu',
    createNew: 'Create new menu',
    editMenu: 'Edit menu',
    noRecipes: '(No recipes)',
    andMore: (n: number) => `and ${n} more ${pluralEn(n, 'recipe', 'recipes')}`,
    importErrorPrefix: 'The page address contains a menu to import, but something went wrong when reading it. Please make sure you have the ',
    importErrorEntire: 'entire',
    importErrorSuffix: ' address. If it still doesn’t work, please report the error!',
  },

  view: {
    edit: 'Edit',
    export: 'Export',
    exportedMenu: 'Exported menu',
    linkCopied: 'Link copied to clipboard!',
    privateNotice: 'Your menu is private. Export to share it with others.',
    ingredients: 'Ingredients',
    recipes: 'Recipes',
  },

  warning: {
    differentFork: (forkName: string) =>
      `This menu was made for a different build (${forkName}). Recipes and ingredients may be different. `,
    forkNotAvailable: 'not available',
    unavailableRecipes: (n: number) =>
      `${n} ${pluralEn(n, 'recipe is', 'recipes are')} unavailable.`,
  },

  editor: {
    nameLabel: 'Name:',
    namePlaceholder: (example: string) => `E.g.: ${example}`,
    exampleNames: [
      'Favourite recipes',
      'Ultimate Cake Collection',
      'Burgers and Pizzas',
      'Soups, Stews, Salads and Stuff',
      'Assorted basics',
      'I have no botanist and I must cook',
    ] as readonly string[],
    unsavedChangesPrompt: 'You have unsaved changes. Discard?',
    save: 'Save',
    saveTooltip: 'Save the menu and close the editor',
    discard: 'Discard',
    discardNewTooltip: 'Discard everything and return to the list',
    discardTooltip: 'Discard all changes and close the editor',
    delete: 'Delete',
    deleteTooltip: 'Delete the menu',
  },

  discardDialog: {
    title: 'Unsaved changes',
    body: 'What do you want to do with your changes?',
    stay: 'Stay here',
    save: 'Save changes',
    discard: 'Discard',
  },

  selected: {
    title: 'Selected Recipes',
    searchPlaceholder: 'Find new recipes by name',
    empty: 'The menu is currently empty. Search for recipes above to add them!',
    moveUp: 'Move up',
    moveDown: 'Move down',
    moreResults: 'More results...',
    noMatchesPrefix: 'Couldn’t find any new recipes with ',
    noMatchesSuffix: ' in the name.',
    addRecipe: 'Add recipe to menu',
    removeRecipe: 'Remove recipe from menu',
  },

  ingredients: {
    title: 'Recipe ingredients',
    description: 'These ingredients are used by at least one selected recipe.',
    precursorsTitle: 'Ingredients of ingredients',
    precursorsDescription: 'These are ingredients for other ingredients, not directly used by any recipe in the menu.',
    emptyText1: 'When you add recipes to the menu, their ingredients will show up here. This list will also include ingredients used in recipes for other ingredients.',
    emptyText2: 'You can hide ingredients you don’t want to see, and add their recipes (when available) to your menu.',
    sourceOf: (names: string) => `Source of: ${names}`,
    usedBy: (names: string) => `Used by: ${names}`,
    hide: 'Hide this ingredient',
    show: 'Show this ingredient',
    addRecipeN: (n: number) => `Add recipe ${n} for this ingredient to the menu`,
    addTheRecipe: 'Add the recipe for this ingredient to the menu',
    addThisRecipe: 'Add this recipe to the menu.',
  },

  importDialog: {
    title: 'Import menu',
    alreadyHave: 'It looks like you already have this menu. How would you like to proceed?',
    createNew: 'Create a new menu',
    createNewDescPrefix: 'The menu will be imported as ',
    createNewDescSuffix: '.',
    overwrite: 'Overwrite the existing menu',
    overwriteDesc: 'The existing menu will be completely replaced.',
    cannotUndo: 'This cannot be undone.',
    doNothing: 'Do nothing',
    doNothingDesc: 'Close this dialog and don’t import the menu.',
  },
};

export type MenuMessages = typeof en;

export const ru: MenuMessages = {
  untitledMenu: '(меню без названия)',
  notFound: 'Меню не найдено',
  backToListing: 'К списку меню',

  list: {
    emptyTitle: 'Нет сохранённых меню',
    emptyText: 'Меню — это подборка рецептов и ингредиентов. Соберите блюда на одну тему, сохраните любимые рецепты или просто получите список того, что нужно вырастить.',
    createFirst: 'Создать первое меню',
    createNew: 'Создать меню',
    editMenu: 'Редактировать меню',
    noRecipes: '(нет рецептов)',
    andMore: (n: number) =>
      `и ещё ${n} ${pluralRu(n, 'рецепт', 'рецепта', 'рецептов')}`,
    importErrorPrefix: 'В адресе страницы есть меню для импорта, но его не удалось прочитать. Убедитесь, что скопирован ',
    importErrorEntire: 'весь',
    importErrorSuffix: ' адрес. Если это не помогает, сообщите об ошибке!',
  },

  view: {
    edit: 'Изменить',
    export: 'Экспорт',
    exportedMenu: 'Экспортированное меню',
    linkCopied: 'Ссылка скопирована!',
    privateNotice: 'Меню видно только вам. Чтобы поделиться им, экспортируйте его.',
    ingredients: 'Ингредиенты',
    recipes: 'Рецепты',
  },

  warning: {
    differentFork: (forkName: string) =>
      `Это меню создано для другой сборки (${forkName}). Рецепты и ингредиенты могут отличаться. `,
    forkNotAvailable: 'недоступна',
    unavailableRecipes: (n: number) =>
      `${pluralRu(n, 'Недоступен', 'Недоступно', 'Недоступно')} ${n} ${pluralRu(n, 'рецепт', 'рецепта', 'рецептов')}.`,
  },

  editor: {
    nameLabel: 'Название:',
    namePlaceholder: (example: string) => `Например: ${example}`,
    exampleNames: [
      'Любимые рецепты',
      'Коллекция тортов',
      'Бургеры и пиццы',
      'Супы, рагу, салаты и всякое',
      'Базовый набор',
      'Ботаника нет, а готовить надо',
    ],
    unsavedChangesPrompt: 'Есть несохранённые изменения. Отменить их?',
    save: 'Сохранить',
    saveTooltip: 'Сохранить меню и закрыть редактор',
    discard: 'Отменить',
    discardNewTooltip: 'Отменить всё и вернуться к списку',
    discardTooltip: 'Отменить все изменения и закрыть редактор',
    delete: 'Удалить',
    deleteTooltip: 'Удалить меню',
  },

  discardDialog: {
    title: 'Несохранённые изменения',
    body: 'Что сделать с изменениями?',
    stay: 'Остаться',
    save: 'Сохранить',
    discard: 'Отменить изменения',
  },

  selected: {
    title: 'Выбранные рецепты',
    searchPlaceholder: 'Найти рецепты по названию',
    empty: 'Меню пока пустое. Найдите рецепты в поиске выше, чтобы добавить их!',
    moveUp: 'Переместить выше',
    moveDown: 'Переместить ниже',
    moreResults: 'Ещё результаты...',
    noMatchesPrefix: 'Не найдено новых рецептов с «',
    noMatchesSuffix: '» в названии.',
    addRecipe: 'Добавить рецепт в меню',
    removeRecipe: 'Убрать рецепт из меню',
  },

  ingredients: {
    title: 'Ингредиенты рецептов',
    description: 'Эти ингредиенты нужны хотя бы одному выбранному рецепту.',
    precursorsTitle: 'Ингредиенты для ингредиентов',
    precursorsDescription: 'Из них готовят другие ингредиенты; сами рецепты меню их напрямую не используют.',
    emptyText1: 'Когда вы добавите рецепты в меню, здесь появятся их ингредиенты — включая те, из которых готовят другие ингредиенты.',
    emptyText2: 'Ненужные ингредиенты можно скрыть, а их рецепты (если они есть) — добавить в меню.',
    sourceOf: (names: string) => `Источник: ${names}`,
    usedBy: (names: string) => `Используется в: ${names}`,
    hide: 'Скрыть ингредиент',
    show: 'Показать ингредиент',
    addRecipeN: (n: number) => `Добавить в меню рецепт №${n} для этого ингредиента`,
    addTheRecipe: 'Добавить в меню рецепт этого ингредиента',
    addThisRecipe: 'Добавить этот рецепт в меню.',
  },

  importDialog: {
    title: 'Импорт меню',
    alreadyHave: 'Похоже, это меню у вас уже есть. Что сделать?',
    createNew: 'Создать новое меню',
    createNewDescPrefix: 'Меню будет импортировано как ',
    createNewDescSuffix: '.',
    overwrite: 'Заменить существующее меню',
    overwriteDesc: 'Существующее меню будет полностью заменено.',
    cannotUndo: 'Это нельзя отменить.',
    doNothing: 'Ничего не делать',
    doNothingDesc: 'Закрыть окно без импорта меню.',
  },
};
