import { useGameData } from '../context';
import { EntitySprite } from './entity';
import { ReagentSprite } from './reagent';
export const CatalogIcon = ({ id, kind = 'entity' }: { id: string; kind?: 'entity' | 'reagent' }) => {
  const { entityMap } = useGameData();
  if (kind === 'reagent') return <ReagentSprite id={id}/>;
  return entityMap.has(id) ? <EntitySprite id={id}/> : null;
};
