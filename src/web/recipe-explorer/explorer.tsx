import {
  ReactElement,
  Ref,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useBlocker } from 'react-router';
import { useGameData } from '../context';
import { FocusTrap } from '../focus';
import { useT } from '../i18n';
import { CloseIcon } from '../icons';
import { Recipe } from '../recipe';
import { compareByName } from '../sort';
import { Tooltip } from '../tooltip';

export interface ExplorerShellProps {
  /** Re-centres the layout whenever the explored node changes. */
  nodeKey: string;
  onClose: () => void;
  children: (ref: Ref<ExplorerNodeHandle>) => ReactElement;
}

const RecipeMargin = 8;
/**
 * .explorer_list-inner adds 4px of margin to each recipe, which we must
 * compensate for when calculating the height of the recipe list.
 */
const RelatedRecipeMargin = 4;

/** Full-screen overlay shared by the cooking and chemistry explorers. */
export const ExplorerShell = ({
  nodeKey,
  onClose,
  children,
}: ExplorerShellProps): ReactElement => {
  const mainRef = useRef<HTMLElement>(null);
  const nodeRef = useRef<ExplorerNodeHandle>(null);
  const t = useT();

  useEffect(() => {
    const main = mainRef.current!;
    main.focus();

    const positionRecipeToFit = () => {
      const node = nodeRef.current;
      if (!node) {
        return;
      }

      const viewportWidth = document.documentElement.clientWidth;
      const viewportCenterX = viewportWidth / 2;
      const { totalWidth, centerOffset } = node.getDimensions();

      const availableSpace = viewportWidth - 2 * RecipeMargin - totalWidth;

      const realLeft = viewportCenterX - centerOffset;
      const newLeft = Math.max(
        RecipeMargin,
        Math.min(
          availableSpace + RecipeMargin,
          realLeft
        )
      );
      const x = newLeft + centerOffset - viewportCenterX;

      // Reset the recipe offset when the window is resized
      node.move(x, 0);
    };

    positionRecipeToFit();
    window.addEventListener('resize', positionRecipeToFit);
    return () => {
      window.removeEventListener('resize', positionRecipeToFit);
    };
  }, [nodeKey]);

  // Always prevent navigation while this is open
  useBlocker(true);

  return (
    <FocusTrap>
      <section
        className='explorer'
        aria-label={t.recipes.explorerLabel}
        tabIndex={-1}
        ref={mainRef}
      >
        {children(nodeRef)}

        <Tooltip text={t.recipes.closeExplorer} placement='left' provideLabel>
          <button className='explorer_close' onClick={onClose}>
            <CloseIcon/>
          </button>
        </Tooltip>
      </section>
    </FocusTrap>
  );
};

export interface Props {
  id: string;
  onClose: () => void;
}

export const RecipeExplorer = memo(({ id, onClose }: Props): ReactElement =>
  <ExplorerShell nodeKey={id} onClose={onClose}>
    {ref => <ExploredRecipe key={id} id={id} ref={ref}/>}
  </ExplorerShell>
);

interface ExploredRecipeProps {
  id: string;
  ref: Ref<ExplorerNodeHandle>;
}

export interface ExplorerNodeHandle {
  getDimensions(): ExploredRecipeDimensions;
  move(x: number, y: number): void;
}

interface ExploredRecipeDimensions {
  readonly totalWidth: number;
  readonly centerOffset: number;
}

type ActiveSection = 'madeWith' | 'usedIn' | null;

const ExploredRecipe = memo(({
  id,
  ref,
}: ExploredRecipeProps): ReactElement => {
  const {
    recipeMap,
    recipesBySolidResult,
    recipesBySolidIngredient,
    recipesByReagentResult,
    recipesByReagentIngredient,
    entityMap,
    reagentMap,
  } = useGameData();

  const recipe = recipeMap.get(id);
  if (!recipe) {
    throw new Error(`Could not resolve recipe: ${id}`);
  }

  const compare = useMemo(() => {
    const compareRecipes = compareByName(entityMap, reagentMap);
    return (a: string, b: string): number => {
      const recipeA = recipeMap.get(a)!;
      const recipeB = recipeMap.get(b)!;
      return compareRecipes(recipeA, recipeB);
    };
  }, [recipeMap, entityMap, reagentMap]);

  const madeWith: readonly string[] = useMemo(() => {
    const result: string[] = [];
    for (const id of Object.keys(recipe.solids)) {
      const recipes = recipesBySolidResult.get(id);
      if (recipes) {
        result.push(...recipes);
      }
    }
    for (const id of Object.keys(recipe.reagents)) {
      const recipes = recipesByReagentResult.get(id);
      if (recipes) {
        result.push(...recipes);
      }
    }
    return result.sort(compare);
  }, [recipe, recipesBySolidResult, recipesByReagentResult, compare]);

  const usedIn = useMemo(() => {
    let recipes: readonly string[] | undefined;
    if (recipe.solidResult) {
      recipes = recipesBySolidIngredient.get(recipe.solidResult);
    } else if (recipe.reagentResult) {
      recipes = recipesByReagentIngredient.get(recipe.reagentResult);
    }
    return recipes ? recipes.slice().sort(compare) : [];
  }, [recipe, recipesBySolidIngredient, recipesByReagentIngredient, compare]);

  return (
    <ExplorerNode
      ref={ref}
      main={<Recipe id={id} skipDefaultHeaderAction/>}
      madeWith={madeWith}
      usedIn={usedIn}
      renderItem={renderRelatedRecipe}
    />
  );
});

const renderRelatedRecipe = (id: string): ReactElement =>
  <Recipe key={id} id={id} skipDefaultHeaderAction/>;

export interface ExplorerNodeProps {
  ref: Ref<ExplorerNodeHandle>;
  /** The explored card; it must carry the `recipe` class for the layout. */
  main: ReactElement;
  madeWith: readonly string[];
  usedIn: readonly string[];
  /** Renders a keyed related card (with the `recipe` class) for an ID. */
  renderItem: (id: string) => ReactElement;
}

/** The explored card with its "made with" and "used in" lists. */
export const ExplorerNode = ({
  ref,
  main,
  madeWith,
  usedIn,
  renderItem,
}: ExplorerNodeProps): ReactElement => {
  const t = useT();
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);

  const mainRef = useRef<HTMLDivElement>(null);
  const madeWithRef = useRef<HTMLDivElement>(null);
  const usedInRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const madeWithElem = madeWithRef.current;
    const usedInElem = usedInRef.current;

    const resize = () => {
      if (madeWithElem) {
        resizeRelatedRecipesList(madeWithElem);
      }
      if (usedInElem) {
        resizeRelatedRecipesList(usedInElem);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [madeWith, usedIn]);

  useImperativeHandle(ref, () => ({
    getDimensions(): ExploredRecipeDimensions {
      const mainElem = mainRef.current;
      if (!mainElem) {
        throw new Error('Unable to get dimensions for unmounted recipe');
      }

      const mainRect = mainElem.getBoundingClientRect();
      const madeWithRect = madeWithRef.current?.getBoundingClientRect();
      const usedInRect = usedInRef.current?.getBoundingClientRect();

      const centerX = mainRect.x + mainRect.width / 2;
      const leftEdge = madeWithRect ? madeWithRect.left : mainRect.left;
      const rightEdge = usedInRect ? usedInRect.right : mainRect.right;

      return {
        centerOffset: centerX - leftEdge,
        totalWidth: rightEdge - leftEdge,
      };
    },
    move(x: number, y: number): void {
      const mainElem = mainRef.current;
      if (mainElem) {
        mainElem.style.setProperty('--x', `${x}px`);
        mainElem.style.setProperty('--y', `${y}px`);
      }
    },
  }), []);

  const effectiveSection = getActiveSection(
    activeSection,
    madeWith.length > 0,
    usedIn.length > 0
  );

  return (
    <div className='explorer_main' ref={mainRef}>
      {main}

      {madeWith.length > 0 && <>
        <div
          className={
            effectiveSection === 'madeWith'
              ? 'explorer_arrow explorer_arrow--before explorer_arrow--current'
              : 'explorer_arrow explorer_arrow--before'
          }
          onClick={() => setActiveSection('madeWith')}
        >
          <span className='explorer_arrow-label'>{t.recipes.madeWith}</span>
        </div>
        <div
          className={
            effectiveSection === 'madeWith'
              ? 'explorer_list explorer_list--before explorer_list--current'
              : 'explorer_list explorer_list--before'
          }
          ref={madeWithRef}
        >
          <div className='explorer_list-inner'>
            {madeWith.map(renderItem)}
          </div>
        </div>
      </>}

      {usedIn.length > 0 && <>
        <div
          className={
            effectiveSection === 'usedIn'
              ? 'explorer_arrow explorer_arrow--after explorer_arrow--current'
              : 'explorer_arrow explorer_arrow--after'
          }
          onClick={() => setActiveSection('usedIn')}
        >
          <span className='explorer_arrow-label'>{t.recipes.usedIn}</span>
        </div>
        <div
          className={
            effectiveSection === 'usedIn'
              ? 'explorer_list explorer_list--after explorer_list--current'
              : 'explorer_list explorer_list--after'
          }
          ref={usedInRef}
        >
          <div className='explorer_list-inner'>
            {usedIn.map(renderItem)}
          </div>
        </div>
      </>}
    </div>
  );
};

const getActiveSection = (
  selected: ActiveSection,
  hasMadeWith: boolean,
  hasUsedIn: boolean
): ActiveSection => {
  if (!hasMadeWith && !hasUsedIn) {
    // We have neither section, pick neither.
    return null;
  }
  if (!hasMadeWith) {
    // If we don't have a 'made with' section, always pick usedIn.
    return 'usedIn';
  }
  if (!hasUsedIn) {
    // Same story here.
    return 'madeWith';
  }
  // If we have both, respect the user's choice, defaulting to madeWith
  // if the user hasn't chosen yet.
  return selected ?? 'madeWith';
};

const resizeRelatedRecipesList = (elem: HTMLDivElement): void => {
  const list = elem.firstElementChild as HTMLElement | null;
  if (!list) {
    return;
  }

  list.style.removeProperty('--list-height');

  const rects = Array.from(list.children, child => {
    const rect = child.getBoundingClientRect();
    return {
      top: rect.top - RelatedRecipeMargin,
      bottom: rect.bottom + RelatedRecipeMargin,
      left: rect.left,
    };
  });
  const columnCount = new Set(rects.map(r => r.left)).size;

  const [top, bottom] = rects.reduce(
    ([tMin, bMax], { top, bottom }) => [
      Math.min(tMin, top),
      Math.max(bMax, bottom)
    ],
    [Infinity, 0]
  );
  let maxHeight = Math.ceil(bottom - top);
  if (columnCount > 1) {
    maxHeight = tryBalanceColumns(
      rects.map(r => r.bottom - r.top),
      maxHeight,
      columnCount
    );
  }

  list.style.setProperty('--list-height', `${maxHeight}px`);
};

const tryBalanceColumns = (
  heights: readonly number[],
  initialMaxHeight: number,
  maxColumns: number
): number => {
  // When a related recipe list wraps into multiple columns, we want to try
  // and balance the columns to remove as much dead space as possible. As an
  // example, suppose we have a recipe list like so:
  //
  //   ┌───┐┌───┐
  //   ╞═══╡└───┘
  //   │   │
  //   ╞═══╡
  //   └───┘
  //
  // The last column has a LOT of white space at the end. If we reduce the
  // height of the list a bit, we can move the third item into the second
  // column and get a much more balanced distribution:
  //
  //   ┌───┐┌───┐
  //   ╞═══╡╞═══╡
  //   │   │└───┘
  //   └───┘
  //
  // To accomplish this, we first lay out the recipes within initialMaxHeight
  // and calculate the average amount of white space, defined as the average
  // of the difference between each column and the highest column. Then we
  // try again with highest column - 1, and repeat until we exceed maxColumns.
  const MaxAttempts = 10;

  interface Candidate {
    readonly height: number;
    readonly avgGap: number;
  }
  let bestCandidate: Candidate | null = null;

  let maxHeight = initialMaxHeight;
  let attempts = 0;
  while (attempts <= MaxAttempts) {
    if (attempts === MaxAttempts) {
      // Something went wrong. Bail.
      return initialMaxHeight;
    }

    const columnHeights = [];
    let lastColumn = 0;

    for (const height of heights) {
      if (lastColumn + height > maxHeight) {
        columnHeights.push(lastColumn);
        lastColumn = 0;
      }
      lastColumn += height;
    }
    columnHeights.push(lastColumn);

    const colCount = columnHeights.length;
    if (colCount > maxColumns) {
      // Too many columns
      break;
    }

    const highestColumn = columnHeights.reduce((a, b) => Math.max(a, b));
    const avgHeight = columnHeights.reduce((a, b) => a + b) / colCount;
    const avgGap = highestColumn - avgHeight;
    if (bestCandidate === null || avgGap < bestCandidate.avgGap) {
      bestCandidate = { height: highestColumn, avgGap };
    }

    // Try again with a lower maxHeight
    maxHeight = highestColumn - 1;
    attempts++;
  }

  return bestCandidate?.height ?? initialMaxHeight;
};
