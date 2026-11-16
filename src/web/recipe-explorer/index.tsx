import {
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  ExploreFnContext,
  ExploreReactionFnContext,
  ExploreRecipeFn,
  ExploredRecipeContext,
} from './context';
import { RecipeExplorer } from './explorer';
import { ReactionExplorer } from './reaction';

export interface Props {
  children: ReactNode;
}

interface ExplorerTarget {
  readonly kind: 'recipe' | 'reaction';
  readonly id: string;
}

export const RecipeExplorerProvider = ({ children }: Props): ReactElement => {
  const [current, setCurrent] = useState<ExplorerTarget | null>(null);

  // Selecting the already open node is idempotent; only Close dismisses it.
  const select = useCallback((kind: ExplorerTarget['kind'], id: string) => {
    setCurrent(prev =>
      prev?.kind === kind && prev.id === id ? prev : { kind, id }
    );
  }, []);
  const exploreRecipe = useCallback<ExploreRecipeFn>(
    id => select('recipe', id),
    [select]
  );
  const exploreReaction = useCallback<ExploreRecipeFn>(
    id => select('reaction', id),
    [select]
  );
  const close = useCallback(() => setCurrent(null), []);

  useEffect(() => {
    document.body.classList.toggle('overlay-open', current != null);
  }, [current]);

  return (
    <ExploreFnContext.Provider value={exploreRecipe}>
      <ExploreReactionFnContext.Provider value={exploreReaction}>
        {children}
        {current?.kind === 'recipe' && (
          <ExploredRecipeContext.Provider value={current.id}>
            <RecipeExplorer id={current.id} onClose={close}/>
          </ExploredRecipeContext.Provider>
        )}
        {current?.kind === 'reaction' && (
          <ReactionExplorer id={current.id} onClose={close}/>
        )}
      </ExploreReactionFnContext.Provider>
    </ExploreFnContext.Provider>
  );
};

export const useExploreRecipe = (): ExploreRecipeFn =>
  useContext(ExploreFnContext);

export const useExploreReaction = (): ExploreRecipeFn =>
  useContext(ExploreReactionFnContext);

export const useCurrentExploredRecipe = (): string | null =>
  useContext(ExploredRecipeContext);

export { ExploreReactionButton } from './reaction';
