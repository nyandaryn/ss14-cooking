import { Tooltip } from './tooltip';
import { CatalogReagent } from '../catalog-types';
import { useLang } from './i18n';
import { useGameData } from './context';
import { effectRows } from './effect-description';

export const MedicineEffects = ({ reagent }: { reagent: CatalogReagent }) => {
  const { lang } = useLang();
  const { catalog } = useGameData();
  const ru = lang === 'ru';
  if (!reagent.metabolisms?.some(m => m.effects.length)) return null;
  const name = (id: string) => catalog.reagents.find(r => r.id === id)?.name ?? id;
  return <section className='medicine-effects'>
    <h3 className='medicine-effects-heading'>{ru ? 'Действие на организм' : 'Effects on the body'}
      <Tooltip provideLabel text={ru ? 'Базовые значения за цикл метаболизма, не за 1 u и не за секунду. Итог зависит от организма и настроек сервера. Условия проверяются для каждого эффекта отдельно.' : 'Base values per metabolism cycle, not per 1 u or per second. Actual effects depend on the body and server settings. Conditions apply to each effect separately.'}>
        <button type='button' className='medicine-effects-help' onClick={e => e.currentTarget.focus()}><EffectIcon kind='status'/></button>
      </Tooltip>
    </h3>
    {reagent.metabolisms.filter(m => m.effects.length).map(m => <div key={m.stage}>
      <h4>{({ Bloodstream: ru ? 'В крови' : 'Bloodstream', Medicine: ru ? 'Лекарственный метаболизм' : 'Medicine metabolism', Poison: ru ? 'Токсины' : 'Poison', Food: ru ? 'Пищеварение' : 'Digestion', Drink: ru ? 'Питьё' : 'Drink' }[m.stage] ?? m.stage)} · {m.rate} u/{ru ? 'цикл' : 'cycle'}</h4>
      <ul className='medicine-effect-list' role='list'>{m.effects.filter(e => !['PopupMessage', 'Emote'].includes(String(e['!type']))).flatMap(e => effectRows(e, reagent.id, ru, name)).map((row, i) => <li className={`medicine-effect medicine-effect--${row.tone}`} key={i}>
        <EffectIcon kind={row.icon}/>
        <div className='medicine-effect-content'><div className='medicine-effect-description'>{row.text}</div>
          {row.conditions && <div className={`medicine-effect-condition${row.overdose ? ' medicine-effect-condition--overdose' : ''}`}>
            {row.overdose && <><EffectIcon kind='warning'/><strong>{ru ? 'Передозировка' : 'Overdose'}</strong></>}
            <span>{row.conditions}</span>
          </div>}
        </div>
      </li>)}</ul>
    </div>)}
  </section>;
};

const EffectIcon = ({ kind }: { kind: string }) => <svg className='medicine-effect-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
  {kind === 'heal' ? <path d='M9 3h6v6h6v6h-6v6H9v-6H3V9h6z'/> :
    kind === 'harm' ? <path d='m13 2-9 12h7l-1 8 10-13h-7z'/> :
    kind === 'blood' ? <path d='M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12z'/> :
    kind === 'temperature' ? <><path d='M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0z'/><path d='M12 8v10'/></> :
    kind === 'warning' ? <><path d='M12 3 2 21h20z'/><path d='M12 9v5m0 3v.1'/></> :
    <><circle cx='12' cy='12' r='9'/><path d='M12 11v6m0-10v.1'/></>}
</svg>;
