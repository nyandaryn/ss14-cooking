import { useGameData } from './context';
import { useLang } from './i18n';
import { Tooltip } from './tooltip';
import { describeEffect } from './effect-description';

export const PlantEffects = ({ id }: { id: string }) => {
  const { catalog } = useGameData();
  const { lang } = useLang();
  const ru = lang === 'ru';
  const effects = catalog.reagents.find(r => r.id === id)?.plantMetabolism;
  if (!effects?.length) return null;
  const name = (id: string) => catalog.reagents.find(r => r.id === id)?.name ?? id;
  return <section className='medicine-effects plant-effects'>
    <h3 className='medicine-effects-heading'>{ru ? 'Действие на растения' : 'Effects on plants'}
      <Tooltip provideLabel text={ru ? 'Базовые эффекты реагента при применении к растениям и грядкам. Это не метаболизм персонажа. Значения показаны за применение эффекта, не за секунду; учитывайте указанные вероятности и условия.' : 'Base reagent effects on plants and plant holders, separate from character metabolism. Values are per effect application, not per second; probabilities and conditions apply.'}>
        <button type='button' className='medicine-effects-help' onClick={e => e.currentTarget.focus()}>ⓘ</button>
      </Tooltip>
    </h3>
    <ul className='medicine-effect-list' role='list'>{effects.map((e, i) => {
      const type = String(e['!type']);
      const amount = Number(e.amount ?? 1);
      const positive = ['PlantAdjustHealth', 'PlantAdjustNutrition', 'PlantAdjustWater', 'PlantAdjustPotency'].includes(type);
      const negative = ['PlantAdjustToxins', 'PlantAdjustPests', 'PlantAdjustWeeds'].includes(type);
      const tone = positive || negative ? ((positive ? amount > 0 : amount < 0) ? 'heal' : 'harm') : 'neutral';
      return <li key={i} className={`medicine-effect medicine-effect--${tone}`}>
        <svg className='medicine-effect-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'><path d='M4 20c1-7 6-12 15-16 1 11-3 17-11 13M4 20l9-9'/></svg>
        <div className='medicine-effect-content medicine-effect-description'>{describeEffect(e, ru, name)}</div>
      </li>;
    })}</ul>
  </section>;
};
