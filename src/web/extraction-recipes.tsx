import { useGameData } from './context';
import { useLang } from './i18n';
import { ResourceLink } from './catalog-links';

/** Shared by reagent pages and ingredient previews in every department. */
export const ExtractionRecipes = ({ id }: { id: string }) => {
  const { catalog } = useGameData();
  const { lang } = useLang();
  const ru = lang === 'ru';
  const sources = catalog.extractions.filter(e => e.reagent.id === id);
  if (!sources.length) return null;
  return <section className='extraction-recipes'>
    <h3>{ru ? 'Получение в блендере' : 'Blender extraction'}</h3>
    <ul>{sources.map((e, i) => <li key={`${e.entity.id}:${e.method}:${i}`}>
      <ResourceLink kind='entity' id={e.entity.id}>{e.entity.name}</ResourceLink>
      {' — '}{e.method === 'juice' ? (ru ? 'отжать сок' : 'juice') : (ru ? 'измельчить' : 'grind')}
      {' → '}<strong>{e.amount} u</strong>
    </li>)}</ul>
    <p className='catalog-note'>{ru ? 'Указан базовый выход из прототипа предмета.' : 'Base output from the item prototype.'}</p>
  </section>;
};
