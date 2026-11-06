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
      { path: '/production', element: <Production/>, handle: { name: 'production' } satisfies RouteHandle },
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
