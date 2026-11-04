import { ReactElement, memo } from 'react';
import { Recipe, SpritePoint } from '../../types';
import { useGameData } from '../context';
import { displayMethod } from '../helpers';
import { useLang } from '../i18n';
import { RawSprite } from '../sprites';
import { Temperature } from '../temperature';

export interface RecipeMethodProps {
  recipe: Recipe;
}

export const RecipeMethod = memo(({
  recipe,
}: RecipeMethodProps): ReactElement | null => {
  const { methodSprites, microwaveRecipeTypes } = useGameData();
  const { locale, t } = useLang();

  const method = displayMethod(recipe);
  if (method === null) {
    return null;
  }

  let text: ReactElement;
  let sprite: SpritePoint = methodSprites[method]!;
  let spriteAlt: string;

  switch (recipe.method) {
    case 'microwave':
      text = <span>{t.recipes.seconds(recipe.time.toLocaleString(locale))}</span>;
      spriteAlt = t.recipes.methodAlts.microwave;

      // What a mess of conditionals
      if (microwaveRecipeTypes && recipe.subtype) {
        if (typeof recipe.subtype === 'string') {
          const subtype = microwaveRecipeTypes[recipe.subtype];
          text = <>
            <span>{subtype.verb}</span>
            {text}
          </>;
          sprite = subtype.sprite;
          spriteAlt = subtype.filterSummary; // good enough
        } else {
          // *cries*
          return (
            <div className='recipe_method'>
              <span>
                {recipe.subtype.map(type => {
                  const subtype = microwaveRecipeTypes[type];
                  return (
                    <RawSprite
                      key={type}
                      position={subtype.sprite}
                      alt={subtype.filterSummary}
                    />
                  );
                })}
              </span>
              <span>{t.recipes.cook}</span>
              {text}
            </div>
          );
        }
      }
      break;
    case 'mix':
      text = <>
        <span>{t.recipes.mix}</span>
        {recipe.minTemp ? (
          <span>{t.recipes.above}<Temperature k={recipe.minTemp}/></span>
        ) : null}
        {recipe.maxTemp ? (
          <span>{t.recipes.below}<Temperature k={recipe.maxTemp}/></span>
        ) : null}
      </>;
      spriteAlt = t.recipes.methodAlts.mix;
      break;
    case 'construct':
      switch (recipe.mainVerb) {
        case 'mix':
          text = <span>{t.recipes.mix}</span>;
          spriteAlt = t.recipes.methodAlts.mix;
          break;
        default:
          return null;
      }
      break;
    case 'deepFry': // Frontier
      text = <span>{t.recipes.deepFry}</span>;
      spriteAlt = t.recipes.methodAlts.deepFry;
      break;
  }
  return (
    <div className='recipe_method'>
      <RawSprite position={sprite} alt={spriteAlt}/>
      {text}
    </div>
  );
});
