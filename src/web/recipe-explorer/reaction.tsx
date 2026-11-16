import {
  ReactElement,
  Ref,
  memo,
  useContext,
  useMemo,
} from 'react';
import { ChemicalReaction } from '../../catalog-types';
import { useGameData } from '../context';
import { useLang, useT } from '../i18n';
import { NodeTreeIcon } from '../icons';
import { ReactionGraph, buildReactionGraph, reactionMadeWith, reactionUsedIn } from '../reaction-graph';
import { ReagentIngredient } from '../recipe/ingredients';
import { RawSprite, ReagentSprite } from '../sprites';
import { Temperature } from '../temperature';
import { Tooltip } from '../tooltip';
import { ExploreReactionFnContext } from './context';
import { ExplorerNode, ExplorerNodeHandle, ExplorerShell } from './explorer';

export interface ReactionExplorerProps {
  id: string;
  onClose: () => void;
}

/** Chemistry counterpart of the recipe explorer: one reaction and its neighbours. */
export const ReactionExplorer = memo(({
  id,
  onClose,
}: ReactionExplorerProps): ReactElement => {
  const { catalog } = useGameData();
  const graph = useMemo(() => buildReactionGraph(catalog.reactions), [catalog]);
  return (
    <ExplorerShell nodeKey={id} onClose={onClose}>
      {ref => <ExploredReaction key={id} id={id} graph={graph} ref={ref}/>}
    </ExplorerShell>
  );
});

interface ExploredReactionProps {
  id: string;
  graph: ReactionGraph;
  ref: Ref<ExplorerNodeHandle>;
}

const ExploredReaction = memo(({
  id,
  graph,
  ref,
}: ExploredReactionProps): ReactElement => {
  const { lang } = useLang();
  const madeWith = useMemo(() => reactionMadeWith(graph, id), [graph, id]);
  const usedIn = useMemo(() => {
    const collator = new Intl.Collator(lang);
    return reactionUsedIn(graph, id).sort((a, b) =>
      collator.compare(reactionTitle(graph.byId.get(a)!), reactionTitle(graph.byId.get(b)!)) ||
      collator.compare(a, b)
    );
  }, [graph, id, lang]);

  return (
    <ExplorerNode
      ref={ref}
      main={<ReactionRecipe reaction={graph.byId.get(id)!}/>}
      madeWith={madeWith}
      usedIn={usedIn}
      renderItem={related => <ReactionRecipe key={related} reaction={graph.byId.get(related)!}/>}
    />
  );
});

const reactionTitle = (r: ChemicalReaction): string => r.products[0]?.reagent.name ?? r.id;

export interface ReactionRecipeProps {
  reaction: ChemicalReaction;
  canExplore?: boolean;
}

/** A reaction drawn as a cooking recipe card, so the explorer reads the same. */
export const ReactionRecipe = memo(({
  reaction: r,
  canExplore = true,
}: ReactionRecipeProps): ReactElement => {
  const { locale, t } = useLang();
  const [main, ...also] = r.products;
  const qty = main && t.recipes.units(main.amount.toLocaleString(locale));

  return (
    <div className='recipe recipe--reaction' data-reaction-id={IS_DEV ? r.id : undefined}>
      <div className='recipe_title'>
        {/* Same balancing as cooking cards: the button offsets the sprite. */}
        <span className='recipe_result'>
          {main && <ReagentSprite id={main.reagent.id}/>}
          <span className='recipe_name'>{main ? main.reagent.name : r.id}</span>
          {main && (
            <Tooltip text={t.recipes.reagentResultTooltip(qty!, main.reagent.name)}>
              <span className='recipe_result-qty'>{qty}</span>
            </Tooltip>
          )}
        </span>
        {canExplore ? <ExploreReactionButton id={r.id}/> : <span className='recipe_spacer'/>}
      </div>
      <div className='recipe_ingredients'>
        {r.reactants.map(v =>
          <ReagentIngredient
            key={v.reagent.id}
            id={v.reagent.id}
            amount={v.amount}
            catalyst={v.catalyst}
          />
        )}
      </div>
      <ReactionMethod reaction={r}/>
      {also.length > 0 && (
        <p className='recipe_also-makes'>
          {t.recipes.stepAlsoMakes}
          {also.map((p, i) => <span key={p.reagent.id}>
            {i > 0 && ', '}
            {p.reagent.name} {t.recipes.units(p.amount.toLocaleString(locale))}
          </span>)}
        </p>
      )}
    </div>
  );
});

const ReactionMethod = ({ reaction: r }: { reaction: ChemicalReaction }): ReactElement => {
  const { methodSprites } = useGameData();
  const t = useT();
  const mixer = r.mixers.find(m => m === 'Shake' || m === 'Stir');
  const sprite =
    mixer === 'Shake' ? methodSprites.shake :
    mixer === 'Stir' ? methodSprites.stir :
    r.minTemp != null ? methodSprites.heatMixture :
    methodSprites.mix;
  const verbs = r.mixers.length
    ? r.mixers.map(m => t.recipes.mixerVerbs[m] ?? m)
    : [t.recipes.mix];
  return (
    <div className='recipe_method'>
      {sprite && <RawSprite position={sprite} alt={verbs.join(' / ')}/>}
      {verbs.map(v => <span key={v}>{v}</span>)}
      {r.minTemp != null && <span>{t.recipes.above}<Temperature k={r.minTemp}/></span>}
      {r.maxTemp != null && <span>{t.recipes.below}<Temperature k={r.maxTemp}/></span>}
    </div>
  );
};

export const ExploreReactionButton = memo(({ id }: { id: string }): ReactElement => {
  const explore = useContext(ExploreReactionFnContext);
  const t = useT();
  return (
    <Tooltip text={t.recipes.exploreRelated} provideLabel>
      <button className='explore-reaction' onClick={() => explore(id)}>
        <NodeTreeIcon/>
      </button>
    </Tooltip>
  );
});
