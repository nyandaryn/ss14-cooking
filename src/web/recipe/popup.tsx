import { PlantEffects } from '../plant-effects';
import { MedicineEffects } from '../medicine-effects';
import { ManufacturingCard } from '../production';
import { ReactionCard } from '../chemical-reaction';
import { RelatedBody } from '../catalog-links';
import { findRelatedResources } from '../related-resources';
import { useLang } from '../i18n';
import { ResourceLink } from '../catalog-links';
import { cloneElement, ReactElement, Ref, useMemo } from 'react';
import { Entity } from '../../types';
import { useGameData } from '../context';
import { useT } from '../i18n';
import { Popup, usePopupTrigger } from '../popup';
import { EntitySprite } from '../sprites';
import { Recipe } from './recipe';

export interface Props {
  id: string | readonly string[];
  children: ReactElement<{
    ref?: Ref<HTMLElement>;
  }>;
}

export const RecipePopup = ({ id, children }: Props): ReactElement => {
  const popup = usePopupTrigger({ closeDelay: 600 });

  const childWithRef = cloneElement(children, {
    ref: popup.triggerRef,
  });

  return <>
    {childWithRef}
    <Popup {...popup} placement='below' interactive>
      <div className='popup_recipe'>
        {typeof id === 'string' ? renderRecipe(id) : id.map(renderRecipe)}
      </div>
    </Popup>
  </>;
};

const renderRecipe = (id: string): ReactElement =>
  <Recipe
    key={id}
    id={id}
    canExplore={false}
    canFavorite={false}
    skipDefaultHeaderAction
  />;

export interface ReagentInfoPopupProps {
  reagentId: string;
  recipes: readonly string[] | undefined;
  sources: readonly string[];
  children: ReactElement<{
    ref?: Ref<HTMLElement>;
  }>;
}

export const ReagentInfoPopup = ({
  reagentId,
  recipes,
  sources,
  children,
}: ReagentInfoPopupProps): ReactElement => {
  const { entityMap, catalog } = useGameData();
  const t = useT();
  const { lang } = useLang();

  const popup = usePopupTrigger({ closeDelay: 600 });

  const childWithRef = cloneElement(children, {
    ref: popup.triggerRef,
  });

  const popupContent = useMemo(() => popup.open ? (
    <div className='popup_recipe'>
      {!catalog.manufacturing?.some(r => r.reagentResults?.some(p => p.reagent.id === reagentId)) && catalog.reagents.find(r => r.id === reagentId)?.plantMetabolism?.length ? <article className='catalog-card'><PlantEffects id={reagentId}/></article> : null}
      {recipes?.map(renderRecipe)}
      {catalog.manufacturing?.filter(r => r.reagentResults?.some(p => p.reagent.id === reagentId)).map(r => <ManufacturingCard key={r.id} recipe={r}/>)}
      {catalog.reactions.filter(r => r.products.some(p => p.reagent.id === reagentId) && !recipes?.includes(`r!${r.id}`)).map(r => <article className='catalog-card' key={r.id}>
        <h2><ResourceLink kind='reagent' id={reagentId}>{catalog.reagents.find(v => v.id === reagentId)?.name ?? reagentId}</ResourceLink></h2>
        {catalog.reagents.find(v => v.id === reagentId && v.group === 'Medicine') && <MedicineEffects reagent={catalog.reagents.find(v => v.id === reagentId)!}/>}
        <ReactionCard reaction={r}/>
      </article>)}
      {catalog.extractions.some(e => e.reagent.id === reagentId) && <article className='catalog-card'><h3>{lang === 'ru' ? 'Получение в блендере' : 'Blender extraction'}</h3><ul>{catalog.extractions.filter(e => e.reagent.id === reagentId).map((e,i) => <li key={i}><ResourceLink kind='entity' id={e.entity.id}>{e.entity.name}</ResourceLink> — {e.method === 'juice' ? (lang === 'ru' ? 'выжать сок' : 'juice') : (lang === 'ru' ? 'измельчить' : 'grind')}, {e.amount} u</li>)}</ul></article>}
      {sources.length > 0 && (
        <div className='popup_foodseq'>
          <p>{t.recipes.commonSources}</p>
          {sources.map(id => renderReagentSource(id, entityMap))}
        </div>
      )}
    </div>
  ) : null, [popup.open, lang, recipes, sources, t, catalog, entityMap, reagentId]);

  return <>
    {childWithRef}
    <Popup {...popup} placement='below' interactive>
      {popupContent}
    </Popup>
  </>;
};

const renderReagentSource = (
  id: string,
  entityMap: ReadonlyMap<string, Entity>
): ReactElement => {
  const entity = entityMap.get(id)!;
  return (
    <p key={id} className='popup_entity'>
      <EntitySprite id={id}/>
      {entity.name}
    </p>
  );
};

export const EntitySourcesPopup = ({ id, children }: { id: string; children: Props['children'] }) => {
  const data = useGameData();
  const popup = usePopupTrigger({ closeDelay: 600 });
  return <>{cloneElement(children, { ref: popup.triggerRef })}<Popup {...popup} placement='below' interactive>{popup.open && <div className='popup_recipe'><article className='catalog-card'><RelatedBody kind='entity' related={findRelatedResources(data, id, 'entity')}/></article></div>}</Popup></>;
};
