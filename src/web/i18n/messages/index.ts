import { Lang } from '../lang';
import * as common from './common';
import * as menu from './menu';
import * as misc from './misc';
import * as recipes from './recipes';

const en = {
  common: common.en,
  recipes: recipes.en,
  menu: menu.en,
  misc: misc.en,
};

export type Messages = typeof en;

const ru: Messages = {
  common: common.ru,
  recipes: recipes.ru,
  menu: menu.ru,
  misc: misc.ru,
};

export const AllMessages: Readonly<Record<Lang, Messages>> = { en, ru };
