import { ReactElement } from 'react';
import { ChemicalReaction } from '../catalog-types';
import { ResourceLink } from './catalog-links';
import { useLang } from './i18n';
import { Temperature } from './temperature';

export const ReactionCard = ({ reaction: r }: { reaction: ChemicalReaction }): ReactElement => {
  const { lang } = useLang();
  const text = (ru: string, en: string) => lang === 'ru' ? ru : en;
  return <section className='chemical-reaction'>
    <h3>{text('Рецепт', 'Recipe')} <span className='catalog-id'>{r.id}</span></h3>
    <ul>{r.reactants.map(v => <li key={v.reagent.id}><ResourceLink kind='reagent' id={v.reagent.id}>{v.reagent.name}</ResourceLink> <strong>{v.amount} u</strong>{v.catalyst && <span className='catalog-badge'>{text('катализатор', 'catalyst')}</span>}</li>)}</ul>
    {r.products.length > 0 && <div className='reaction-output'><span aria-hidden='true'>→ </span>{r.products.map((v, i) => <span key={v.reagent.id}>{i > 0 && ' + '}<ResourceLink kind='reagent' id={v.reagent.id}>{v.reagent.name}</ResourceLink> <strong>{v.amount} u</strong></span>)}</div>}
    {(r.minTemp != null || r.maxTemp != null) && <p>{text('Температура', 'Temperature')}: {r.minTemp != null && <>≥ <Temperature k={r.minTemp}/></>}{r.minTemp != null && r.maxTemp != null && ' · '}{r.maxTemp != null && <>≤ <Temperature k={r.maxTemp}/></>}</p>}
    {r.mixers.length > 0 && <p>{text('Требуется смешиватель', 'Required mixer')}: {r.mixers.map(m => ({ Stir: text('Перемешать ложкой', 'Stir with a spoon'), Shake: text('Встряхнуть в шейкере', 'Shake in a shaker'), Centrifuge: text('Центрифуга', 'Centrifuge'), Electrolysis: text('Электролиз', 'Electrolysis'), Holy: text('Освящение (Holy)', 'Holy mixing') }[m] ?? m)).join(' / ')}</p>}
    {r.hasOtherEffects && <p className='catalog-note'>{text('У реакции есть дополнительные игровые эффекты; здесь показаны реагенты.', 'This reaction has additional game effects; reagent outputs are shown here.')}</p>}
  </section>;
};

