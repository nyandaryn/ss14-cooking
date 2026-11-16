import { Cyborgs } from './cyborgs';
import { EncyclopediaPage } from './encyclopedia';
import { Production } from './production';
import { ReferencePage } from './catalog-links';
import { Medicine, Botany, Drinks } from './departments';
import { FoodSequences } from './food-sequence';
import { Cookbook } from './main';
import { MenuPlanner, MenuPlannerRoutes } from './menu-planner';
import { MigratePage } from './migration';
import { RecipeList } from './recipe-list';

export interface RouteHandle {
  readonly name: string;
}

export const AppRoutes = [
  {
    element: <Cookbook/>,
    children: [
      { path: '/creatures', element: <EncyclopediaPage section='creatures'/>, handle: { name: 'creatures' } satisfies RouteHandle },
      { path: '/items', element: <EncyclopediaPage section='items'/>, handle: { name: 'items' } satisfies RouteHandle },
      { path: '/crafting', element: <EncyclopediaPage section='crafting'/>, handle: { name: 'crafting' } satisfies RouteHandle },
      { path: '/laws', element: <EncyclopediaPage section='laws'/>, handle: { name: 'laws' } satisfies RouteHandle },
      { path: '/gases', element: <EncyclopediaPage section='gases'/>, handle: { name: 'gases' } satisfies RouteHandle },

      { path: '/production', element: <Production/>, handle: { name: 'production' } satisfies RouteHandle },
      { path: '/cyborgs', element: <Cyborgs/>, handle: { name: 'cyborgs' } satisfies RouteHandle },
      { path: '/reference', element: <ReferencePage/> },
      { path: '/drinks', element: <Drinks/>, handle: { name: 'drinks' } satisfies RouteHandle },
      { path: '/medicine', element: <Medicine/>, handle: { name: 'medicine' } satisfies RouteHandle },
      { path: '/botany', element: <Botany/>, handle: { name: 'botany' } satisfies RouteHandle },
      {
        path: '/',
        element: <RecipeList/>,
        handle: { name: 'recipe-list' } satisfies RouteHandle,
      },
      {
        path: '/combinations',
        element: <FoodSequences/>,
        handle: { name: 'food-sequence' } satisfies RouteHandle,
      },
      {
        path: '/menu',
        element: <MenuPlanner/>,
        children: MenuPlannerRoutes,
        handle: { name: 'menu-planner' } satisfies RouteHandle,
      },
      {
        path: '/migrate',
        element: <MigratePage/>,
        handle: { name: 'migrate' } satisfies RouteHandle,
      },
    ],
  },
];
