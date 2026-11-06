import { ResourceLink } from '../catalog-links';
import { ReactElement, memo } from 'react';
import { Recipe } from '../../types';
import { useGameData } from '../context';
import { useLang } from '../i18n';
import { EntitySprite, ReagentSprite } from '../sprites';
import { Tooltip } from '../tooltip';

export interface RecipeResultProps {
  recipe: Recipe;
}

export const RecipeResult = memo(({
  recipe,
}: RecipeResultProps): ReactElement => {
  const { entityMap, reagentMap } = useGameData();
  const { locale, t } = useLang();

  const solidResult = recipe.solidResult
    ? entityMap.get(recipe.solidResult)
    : undefined;
  const reagentResult = recipe.reagentResult
    ? reagentMap.get(recipe.reagentResult)
    : undefined;
  const resultQty = recipe.resultQty ?? 1;

  if (solidResult) {
    return (
      <span className='recipe_result'>
        <EntitySprite id={solidResult.id}/>
        <span className='recipe_name'><ResourceLink kind='entity' id={solidResult.id}>{solidResult.name}</ResourceLink></span>
        {resultQty > 1 && (
          <Tooltip text={t.recipes.makesQty(resultQty)}>
            <span className='recipe_result-qty'>
              {resultQty}
            </span>
          </Tooltip>
        )}
      </span>
    );
  }
  if (reagentResult) {
    const { id: resultId, name: resultName } = reagentResult;
    const formattedQty = t.recipes.units(resultQty.toLocaleString(locale));
    return (
      <span className='recipe_result'>
        <ReagentSprite id={resultId}/>
        <span className='recipe_name'>
          <ResourceLink kind='reagent' id={resultId}>{resultName}</ResourceLink>
        </span>
        <Tooltip
          text={t.recipes.reagentResultTooltip(formattedQty, resultName)}
        >
          <span className='recipe_result-qty'>
            {formattedQty}
          </span>
        </Tooltip>
      </span>
    );
  }
  return <span>ERROR!</span>;
});
