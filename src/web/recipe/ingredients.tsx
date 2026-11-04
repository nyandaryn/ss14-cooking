import { ReactElement, memo } from 'react';
import { Reagent, ReagentIngredient as ReagentIngredientData } from '../../types';
import { useGameData } from '../context';
import { useLang } from '../i18n';
import { Popup, usePopupTrigger } from '../popup';
import { EntitySprite, ReagentSprite } from '../sprites';
import { Tooltip } from '../tooltip';
import { ReagentInfoPopup, RecipePopup } from './popup';

export interface RecipeIngredientsProps {
  visible: boolean;
  solids: Readonly<Record<string, number>>;
  reagents: Readonly<Record<string, ReagentIngredientData>>;
}

const IngredientSpriteHeight = 32;

export const RecipeIngredients = memo(({
  visible,
  solids,
  reagents,
}: RecipeIngredientsProps): ReactElement => {
  if (!visible) {
    const ingredientCount =
      Object.keys(solids).length +
      Object.keys(reagents).length;
    return (
      <div
        className='recipe_ingredients'
        style={{
          height: `${ingredientCount * IngredientSpriteHeight}px`,
        }}
      />
    );
  }

  return (
    <div className='recipe_ingredients'>
      {Object.entries(solids).map(([entId, qty]) =>
        <SolidIngredient key={entId} id={entId} qty={qty}/>
      )}
      {Object.entries(reagents).map(([reagentId, ingredient]) =>
        <ReagentIngredient
          key={reagentId}
          id={reagentId}
          amount={ingredient.amount}
          catalyst={ingredient.catalyst}
        />
      )}
    </div>
  );
});

export interface SolidIngredientProps {
  id: string;
  qty?: number;
}

export const SolidIngredient = ({
  id,
  qty,
}: SolidIngredientProps): ReactElement => {
  const { entityMap, recipesBySolidResult } = useGameData();
  const { locale, t } = useLang();
  const entity = entityMap.get(id)!;
  const relatedRecipes = recipesBySolidResult.get(id);

  return (
    <span className='recipe_ingredient'>
      <EntitySprite id={id}/>
      <span>
        {qty != null ? t.recipes.solidQty(qty, qty.toLocaleString(locale)) : null}
        {relatedRecipes ? (
          <RecipePopup id={relatedRecipes}>
            <span className='more-info'>
              {entity.name}
            </span>
          </RecipePopup>
        ) : entity.name}
      </span>
    </span>
  );
};

export interface ReagentIngredientProps {
  id: string;
  /** Single amount (in units), or [min, max]. */
  amount: number | readonly [min: number, max: number];
  catalyst?: boolean;
}

export const ReagentIngredient = ({
  id,
  amount,
  catalyst = false,
}: ReagentIngredientProps): ReactElement => {
  const { reagentMap, recipesByReagentResult } = useGameData();
  const { locale, t } = useLang();
  const reagent = reagentMap.get(id)!;
  const relatedRecipes = recipesByReagentResult.get(id);

  const formattedAmount = t.recipes.units(
    typeof amount === 'number'
      ? amount.toLocaleString(locale)
      : `${amount[0].toLocaleString(locale)}–${amount[1].toLocaleString(locale)}`
  ) + ' ';

  return (
    <span className='recipe_ingredient'>
      <ReagentSprite id={id}/>
      <span>
        {formattedAmount}
        {relatedRecipes || reagent.sources.length > 0 ? (
          <ReagentInfoPopup
            recipes={relatedRecipes}
            sources={reagent.sources}
          >
            <span className='more-info'>
              {reagent.name}
            </span>
          </ReagentInfoPopup>
        ) : reagent.name}
        {catalyst && <>
          {' '}
          <Tooltip
            text={t.recipes.catalystTooltip(reagent.name)}
          >
            <span className='recipe_catalyst'>
              {t.recipes.catalyst}
            </span>
          </Tooltip>
        </>}
      </span>
    </span>
  );
};
