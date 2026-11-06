import { ResourceLink } from '../catalog-links';
import { ReactElement, memo } from 'react';
import { Reagent, ReagentIngredient as ReagentIngredientData } from '../../types';
import { useGameData } from '../context';
import { useLang } from '../i18n';
import { Popup, usePopupTrigger } from '../popup';
import { EntitySprite, ReagentSprite } from '../sprites';
import { Tooltip } from '../tooltip';
import { EntitySourcesPopup, ReagentInfoPopup, RecipePopup } from './popup';

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
  const { entityMap, recipesBySolidResult, catalog } = useGameData();
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
        ) : (catalog.manufacturing?.some(r => r.result.id === id) || catalog.vending?.some(v => v.items.some(i => i.entity.id === id))) ? <EntitySourcesPopup id={id}><span className='more-info'>{entity.name}</span></EntitySourcesPopup> : entity.name}
        {' · '}<ResourceLink kind='entity' id={id}>↗</ResourceLink>
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
  const { reagentMap, recipesByReagentResult, catalog } = useGameData();
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
        {relatedRecipes || catalog.manufacturing?.some(r => r.reagentResults?.some(p => p.reagent.id === id)) || catalog.extractions.some(e => e.reagent.id === id) || reagent.sources.length > 0 || catalog.reactions.some(r => r.products.some(p => p.reagent.id === id)) ? (
          <ReagentInfoPopup
            reagentId={id}
            recipes={relatedRecipes}
            sources={reagent.sources}
          >
            <span className='more-info'>
              {reagent.name}
            </span>
          </ReagentInfoPopup>
        ) : reagent.name}
        {' · '}<ResourceLink kind='reagent' id={id}>↗</ResourceLink>
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
