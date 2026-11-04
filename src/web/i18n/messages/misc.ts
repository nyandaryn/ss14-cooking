// Data import/export (migration), canonical redirect, notices, attributions,
// privacy policy, favourites, clipboard, confirm buttons, routes.

export const en = {
  migrate: {
    howDidYouGetHere: 'Hey, how did you get here?',
    noTarget: 'The server has no configured address to migrate to.',
    nothingToDo: 'There is nothing further to do here. :)',
    onCanonical: 'Visit the old address if you want to migrate saved data (menus and favourite recipes).',
    offer: 'If you want to migrate your data to the new cookbook, you may do so:',
    exportLink: 'Export saved data',
    continueToCookbook: 'Continue to cookbook',
  },

  export: {
    notAvailablePrefix: 'Data exports are not available: no ',
    notAvailableSuffix: ' is configured.',
    ownerHintPrefix: 'If you are the owner of this cookbook, see ',
    ownerHintSuffix: ' for information on how to enable redirects and exports.',
    alreadyCanonical: 'You’re already on the correct page!',
    visitOld: 'Please visit the old cookbook if you wish to export your data.',
    preparing: 'Preparing export...',
    noData: 'You don’t appear to have any data to export!',
    ready: 'Export ready. Redirecting to the new address...',
    notRedirected: 'If you don’t get redirected automatically in a few seconds, click here:',
    continue: 'Continue with export',
    error: 'Something went wrong when preparing your data.',
    failedKeys: 'The following data could not be exported: ',
    continueManually: 'You can continue manually if you wish:',
    continuePartial: 'Continue with partial export',
  },

  import: {
    importing: 'Importing...',
    missingData: 'Hmmm, looks like the URL doesn’t contain any importable data.',
    missingDataHint: 'You can go back and retry the export. If it still doesn’t work, please report the error.',
    success: 'Everything was imported successfully!',
    reloadToSee: 'You may need to reload the page to see the change.',
    untrusted: 'Couldn’t verify this data came from a trusted source.',
    untrustedFrom: (hosts: string) =>
      `It was not possible to verify that this request came from ${hosts}.`,
    /** Last separator when listing trusted hosts: "a, b or c". */
    listOr: ' or ',
    noTrustedSources: 'This website has no trusted sources configured.',
    warning1: 'If you did not initiate the migration or get a link from a trusted friend, you should probably abort.',
    warning2Prefix: 'If you continue with the import, ',
    warning2Strong: 'existing data will be overwritten',
    warning2Suffix: '.',
    warning3: 'Proceed with the import at your own risk.',
    importAnyway: 'Import data anyway',
    abort: 'Abort import',
    error: 'Something went wrong when importing your data.',
    errorMessage: 'The error message was: ',
    badFormat: 'The provided data is not in the right format.',
    failedKeys: 'The following data could not be imported: ',
    importedKeys: 'The following data was imported successfully: ',
    reloadToRetry: 'It may help to reload the page to try again.',
    reloadPage: 'Reload page',
  },

  notices: {
    dismiss: 'Dismiss',
  },

  attributions: {
    showLink: 'Show sprite credits and licenses',
    title: 'Sprite credits',
    disclaimerPrefix: 'Clickable links in the',
    disclaimerField: 'Copyright',
    disclaimerSuffix: 'field are a best-faith interpretation and not guaranteed to be correct.',
    path: 'Path:',
    license: 'License:',
    copyright: 'Copyright:',
  },

  redirect: {
    title: 'The Cookbook Has Moved!',
    body1: 'It’s about time the cookbook got a proper domain name, isn’t it? That’s why it’s been moved to a new URL! From now on, you can find the cookbook here:',
    body2: 'Don’t forget to update your bookmark!',
    body3: 'The old version will no longer be updated.',
    dataNotice: 'It looks like you’ve used the cookbook before. You have some saved data (menus and/or favourite recipes). Would you like to migrate your data now?',
    migrateButton: 'Migrate my data',
  },

  privacy: {
    link: 'Privacy policy',
    title: 'Privacy policy',
  },

  favorites: {
    add: 'Mark as favourite',
    remove: 'Remove from favourites',
  },

  clipboard: {
    copied: 'Copied to clipboard!',
    dialogTitle: 'Copy to clipboard',
    manualCopy: 'The text below couldn’t be copied to your clipboard. You will need to copy it manually.',
    copy: 'Copy',
    copiedShort: 'Copied to clipboard.',
    failed: 'Could not copy to clipboard.',
  },

  confirm: {
    hold: 'Press and hold to confirm',
    release: 'Release to confirm',
  },
};

export type MiscMessages = typeof en;

export const ru: MiscMessages = {
  migrate: {
    howDidYouGetHere: 'Как вы сюда попали?',
    noTarget: 'Для этого сервера не настроен адрес для переноса данных.',
    nothingToDo: 'Здесь больше нечего делать. :)',
    onCanonical: 'Чтобы перенести сохранённые данные (меню и избранные рецепты), откройте старый адрес.',
    offer: 'Если хотите перенести свои данные в новую кулинарную книгу, это можно сделать здесь:',
    exportLink: 'Экспортировать сохранённые данные',
    continueToCookbook: 'Перейти к кулинарной книге',
  },

  export: {
    notAvailablePrefix: 'Экспорт данных недоступен: не настроен ',
    notAvailableSuffix: '.',
    ownerHintPrefix: 'Если вы владелец этого сайта, загляните в ',
    ownerHintSuffix: ' — там описано, как включить переадресацию и экспорт.',
    alreadyCanonical: 'Вы уже на нужной странице!',
    visitOld: 'Чтобы экспортировать данные, откройте старую версию кулинарной книги.',
    preparing: 'Готовим экспорт...',
    noData: 'Похоже, у вас нет данных для экспорта.',
    ready: 'Экспорт готов. Переходим на новый адрес...',
    notRedirected: 'Если переход не произошёл автоматически через несколько секунд, нажмите сюда:',
    continue: 'Продолжить экспорт',
    error: 'При подготовке данных что-то пошло не так.',
    failedKeys: 'Не удалось экспортировать следующие данные: ',
    continueManually: 'При желании можно продолжить вручную:',
    continuePartial: 'Продолжить с частичным экспортом',
  },

  import: {
    importing: 'Импорт...',
    missingData: 'Хм, похоже, в ссылке нет данных для импорта.',
    missingDataHint: 'Вернитесь назад и повторите экспорт. Если это не поможет — сообщите об ошибке.',
    success: 'Всё успешно импортировано!',
    reloadToSee: 'Возможно, понадобится перезагрузить страницу, чтобы увидеть изменения.',
    untrusted: 'Не удалось убедиться, что данные получены из надёжного источника.',
    untrustedFrom: (hosts: string) =>
      `Не удалось проверить, что запрос пришёл с ${hosts}.`,
    listOr: ' или ',
    noTrustedSources: 'Для этого сайта не настроены надёжные источники.',
    warning1: 'Если вы не начинали перенос сами и не получили ссылку от человека, которому доверяете, лучше отменить импорт.',
    warning2Prefix: 'Если продолжить импорт, ',
    warning2Strong: 'текущие данные будут перезаписаны',
    warning2Suffix: '.',
    warning3: 'Продолжайте на свой страх и риск.',
    importAnyway: 'Всё равно импортировать',
    abort: 'Отменить импорт',
    error: 'При импорте данных что-то пошло не так.',
    errorMessage: 'Текст ошибки: ',
    badFormat: 'Переданные данные имеют неверный формат.',
    failedKeys: 'Не удалось импортировать следующие данные: ',
    importedKeys: 'Успешно импортированы следующие данные: ',
    reloadToRetry: 'Попробуйте перезагрузить страницу и повторить.',
    reloadPage: 'Перезагрузить страницу',
  },

  notices: {
    dismiss: 'Скрыть',
  },

  attributions: {
    showLink: 'посмотреть авторов и лицензии',
    title: 'Авторы спрайтов',
    disclaimerPrefix: 'Ссылки в поле',
    disclaimerField: '«Авторские права»',
    disclaimerSuffix: 'расставлены автоматически и могут быть неточными.',
    path: 'Путь:',
    license: 'Лицензия:',
    copyright: 'Авторские права:',
  },

  redirect: {
    title: 'Кулинарная книга переехала!',
    body1: 'Пора было обзавестись нормальным доменом, правда? Поэтому кулинарная книга переехала на новый адрес. Теперь её можно найти здесь:',
    body2: 'Не забудьте обновить закладку!',
    body3: 'Старая версия больше не будет обновляться.',
    dataNotice: 'Похоже, вы уже пользовались кулинарной книгой: у вас есть сохранённые данные (меню и/или избранные рецепты). Перенести их сейчас?',
    migrateButton: 'Перенести мои данные',
  },

  privacy: {
    link: 'Политика конфиденциальности',
    title: 'Политика конфиденциальности',
  },

  favorites: {
    add: 'Добавить в избранное',
    remove: 'Убрать из избранного',
  },

  clipboard: {
    copied: 'Скопировано в буфер обмена!',
    dialogTitle: 'Скопировать в буфер обмена',
    manualCopy: 'Не удалось скопировать текст ниже в буфер обмена — скопируйте его вручную.',
    copy: 'Скопировать',
    copiedShort: 'Скопировано в буфер обмена.',
    failed: 'Не удалось скопировать в буфер обмена.',
  },

  confirm: {
    hold: 'Нажмите и удерживайте для подтверждения',
    release: 'Отпустите для подтверждения',
  },
};
