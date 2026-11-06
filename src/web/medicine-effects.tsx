import { CatalogReagent } from '../catalog-types';
import { useLang } from './i18n';
import { useGameData } from './context';
import { describeEffect } from './effect-description';

export const MedicineEffects = ({ reagent }: { reagent: CatalogReagent }) => {
  const { lang } = useLang();
  const { catalog } = useGameData();
  const ru = lang === 'ru';
  if (!reagent.metabolisms?.some(m => m.effects.length)) return null;
  const name = (id: string) => catalog.reagents.find(r => r.id === id)?.name ?? id;
  return <section className='medicine-effects'>
    <h3>{ru ? 'Действие на организм' : 'Effects on the body'}</h3>
    <p className='catalog-note'>{ru ? 'Базовые значения за цикл метаболизма, не за 1 u и не за секунду. Итог зависит от организма и настроек сервера. Условия проверяются для каждого эффекта отдельно.' : 'Base values per metabolism cycle, not per 1 u or per second. Actual effects depend on the body and server settings. Conditions apply to each effect separately.'}</p>
    {reagent.metabolisms.filter(m => m.effects.length).map(m => <div key={m.stage}>
      <h4>{({ Bloodstream: ru ? 'В крови' : 'Bloodstream', Medicine: ru ? 'Лекарственный метаболизм' : 'Medicine metabolism', Poison: ru ? 'Токсины' : 'Poison', Food: ru ? 'Пищеварение' : 'Digestion', Drink: ru ? 'Питьё' : 'Drink' }[m.stage] ?? m.stage)} · {m.rate} u/{ru ? 'цикл' : 'cycle'}</h4>
      <ul>{m.effects.filter(e => !['PopupMessage', 'Emote'].includes(String(e['!type']))).map((e, i) => <li key={i}>{describeEffect(e, ru, name)}</li>)}</ul>
    </div>)}
  </section>;
};
