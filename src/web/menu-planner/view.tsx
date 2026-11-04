import {
  ReactElement,
  memo,
  useCallback,
  useMemo
} from 'react';
import { Link, useParams } from 'react-router';
import { useGameData } from '../context';
import { CopyToClipboardButton } from '../copy-to-clipboard-button';
import { NeutralCollator } from '../helpers';
import { useT } from '../i18n';
import { ArrowLeftIcon, EditIcon, ExportIcon } from '../icons';
import { Notice } from '../notices';
import { Recipe, RecipePopup } from '../recipe';
import { EntitySprite, ReagentSprite } from '../sprites';
import { useUrl } from '../url';
import { findIngredients, ingredientName } from './ingredients';
import { useStoredMenus } from './storage';
import { exportMenu } from './transfer';
import { MenuWarning } from './warning';

export const MenuViewer = memo((): ReactElement => {
  const params = useParams();
  const id = params.id!;

  const {
    recipeMap,
    recipesBySolidResult,
    recipesByReagentResult,
    entityMap,
    reagentMap,
  } = useGameData();
  const url = useUrl();
  const t = useT();

  const storage = useStoredMenus();

  const menu = useMemo(() => storage.get(id), [id]);

  const ingredients = useMemo(() => {
    if (!menu) {
      return [];
    }
    let ingredients = findIngredients(
      menu.recipes,
      recipeMap,
      recipesBySolidResult,
      recipesByReagentResult,
      reagentMap
    );
    ingredients = ingredients.filter(ingredient =>
      ingredient.type === 'solid'
        ? menu.solidIngredients.includes(ingredient.entityId)
        : menu.reagentIngredients.includes(ingredient.reagentId)
    );
    ingredients.sort((a, b) =>
      NeutralCollator.compare(
        ingredientName(a, entityMap, reagentMap),
        ingredientName(b, entityMap, reagentMap)
      )
    );
    return ingredients;
  }, [
    menu,
    recipeMap,
    recipesBySolidResult,
    recipesByReagentResult,
    reagentMap,
  ]);

  const getMenuExport = useCallback(() => {
    if (!menu) {
      return '';
    }
    const exported = exportMenu(menu);
    return location.origin + url.menuImport(exported);
  }, [menu, url]);

  const backButton =
    <Link to={url.menuList} className='btn floating'>
      <ArrowLeftIcon/>
      <span>{t.menu.backToListing}</span>
    </Link>;

  if (!menu) {
    return (
      <div className='planner_view'>
        <h2>{t.menu.notFound}</h2>
        <div className='planner_view-actions'>{backButton}</div>
      </div>
    );
  }

  const unavailableRecipeCount = menu.recipes.reduce(
    (count, id) => count + +!recipeMap.has(id),
    0
  );

  return (
    <div className='planner_view'>
      <h2>{menu.name.trim() || t.menu.untitledMenu}</h2>
      <div className='planner_view-actions'>
        {backButton}
        <Link to={url.menuEdit(id)} className='btn floating'>
          <EditIcon/>
          <span>{t.menu.view.edit}</span>
        </Link>

        <span className='spacer'/>

        <CopyToClipboardButton
          className='floating'
          getContent={getMenuExport}
          fallbackDialogTitle={t.menu.view.exportedMenu}
          successTooltip={t.menu.view.linkCopied}
        >
          <ExportIcon/>
          <span>{t.menu.view.export}</span>
        </CopyToClipboardButton>
        <Notice kind='info'>
          {t.menu.view.privateNotice}
        </Notice>
      </div>

      <MenuWarning
        menuFork={menu.lastFork}
        unavailableRecipeCount={unavailableRecipeCount}
      />

      {ingredients.length > 0 && <>
        <h3>{t.menu.view.ingredients}</h3>
        <ul className='planner_view-ingredients'>
          {ingredients.map(ingredient =>
            <li key={ingredient.id}>
              {ingredient.type === 'solid'
                ? <EntitySprite id={ingredient.entityId}/>
                : <ReagentSprite id={ingredient.reagentId}/>
              }
              {ingredient.recipes.length > 0 ? (
                <RecipePopup id={ingredient.recipes}>
                  <span className='planner_editor-ingredient-name more-info'>
                    {ingredientName(ingredient, entityMap, reagentMap)}
                  </span>
                </RecipePopup>
              ) : (
                <span className='planner_editor-ingredient-name'>
                  {ingredientName(ingredient, entityMap, reagentMap)}
                </span>
              )}
            </li>
          )}
        </ul>
      </>}

      <h3>{t.menu.view.recipes}</h3>
      <ul className='recipe-list'>
        {menu.recipes.map(id => recipeMap.has(id) ? (
          <li key={id}>
            <Recipe id={id} canFavorite={false}/>
          </li>
        ) : null)}
      </ul>
    </div>
  );
});
