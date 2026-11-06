// Strings shared across the app: loading/error states, header, settings,
// footer, generic buttons.

export const en = {
  siteTitle: 'SS14 Cookbook',
  sectionNavigation: 'Catalog sections',
  loading: 'Loading...',

  errors: {
    forkList: 'Something went wrong when loading the list of forks.',
    recipeData: 'Something went wrong when loading recipe data.',
    reloadHint: 'It may help to reload the page.',
    reportPrefix: 'If the problem persists, please ',
    reportLink: 'report it',
    reportSuffix: '.',
  },

  tabs: {
    allRecipes: 'Cooking',
    medicine: 'Medicine',
    botany: 'Botany', production: 'Production',
    drinks: 'Drinks',
    combinations: 'Combinations',
    menuPlanner: 'Menu Planner',
  },

  forkPrefix: 'Build: ',

  language: {
    label: 'Language:',
    switchTo: (name: string) => `Switch language to ${name}`,
  },

  settings: {
    button: 'Preferences',
    colorScheme: 'Colour scheme:',
    themeDark: 'Dark theme',
    themeLight: 'Light theme',
    temperatureUnit: 'Temperature unit:',
    kelvin: 'Kelvin (K)',
    celsius: 'Celsius (°C)',
    fahrenheit: 'Fahrenheit (°F)',
  },

  footer: {
    generatedPrefix: 'Recipes and names generated from ',
    generatedCommit: ' (commit ',
    generatedDate: (date: string) => `) on ${date}.`,
    basedOnPrefix: 'Based on ',
    basedOnSuffix: ' by Alice Heurlin / Arimah, licensed under AGPL-3.0.',
    spritesPrefix: 'Sprites were made by many contributors: ',
    spritesSuffix: '.',
    sourceCode: 'Source code',
  },

  close: 'Close',
  cancel: 'Cancel',
};

export type CommonMessages = typeof en;

export const ru: CommonMessages = {
  sectionNavigation: 'Разделы каталога',
  siteTitle: 'Кулинарная книга SS14',
  loading: 'Загрузка...',

  errors: {
    forkList: 'Не удалось загрузить список сборок.',
    recipeData: 'Не удалось загрузить данные рецептов.',
    reloadHint: 'Попробуйте перезагрузить страницу.',
    reportPrefix: 'Если ошибка повторяется, ',
    reportLink: 'сообщите о ней',
    reportSuffix: '.',
  },

  tabs: {
    allRecipes: 'Кулинария',
    medicine: 'Медицина',
    botany: 'Ботаника', production: 'Производство',
    drinks: 'Напитки',
    combinations: 'Комбинации',
    menuPlanner: 'Планировщик меню',
  },

  forkPrefix: 'Сборка: ',

  language: {
    label: 'Язык:',
    switchTo: (name: string) => `Переключить язык: ${name}`,
  },

  settings: {
    button: 'Настройки',
    colorScheme: 'Цветовая схема:',
    themeDark: 'Тёмная тема',
    themeLight: 'Светлая тема',
    temperatureUnit: 'Единицы температуры:',
    kelvin: 'Кельвины (K)',
    celsius: 'Градусы Цельсия (°C)',
    fahrenheit: 'Градусы Фаренгейта (°F)',
  },

  footer: {
    generatedPrefix: 'Рецепты и названия взяты из ',
    generatedCommit: ' (коммит ',
    generatedDate: (date: string) => `), обновлено ${date}.`,
    basedOnPrefix: 'Основано на ',
    basedOnSuffix: ' от Alice Heurlin / Arimah, лицензия AGPL-3.0.',
    spritesPrefix: 'Спрайты созданы многими авторами: ',
    spritesSuffix: '.',
    sourceCode: 'Исходный код',
  },

  close: 'Закрыть',
  cancel: 'Отмена',
};
