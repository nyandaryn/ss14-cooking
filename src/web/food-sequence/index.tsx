import { DepartmentHeading } from '../department-heading';
import { ReactElement, memo, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router';
import { useGameData } from '../context';
import { NeutralCollator } from '../helpers';
import { useT } from '../i18n';
import { SeqStartPoint } from './start-point';

export const FoodSequences = memo((): ReactElement => {
  const { entityList, entityMap, reagentMap } = useGameData();
  const t = useT();

  const startPoints = useMemo(() => {
    return entityList
      .filter(ent => ent.seqStart != null)
      .sort((a, b) => NeutralCollator.compare(a.name, b.name));
  }, [entityList, entityMap, reagentMap]);

  const { state } = useLocation();

  const startPointRefs = useRef(new Map<string, HTMLLIElement>());
  useEffect(() => {
    const forEntity = state?.forEntity;
    if (typeof forEntity === 'string') {
      startPointRefs.current.get(forEntity)?.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <main className='foodseq department'>
      <DepartmentHeading code='05 / COMBINATIONS' title={['Комбинации', 'Combinations']} description={['Основы блюд и совместимые ингредиенты.', 'Food bases and compatible ingredients.']}/>
      <p>
        {t.recipes.foodSeqIntroBefore}
        <i>{t.recipes.foodSeqIntroTerm}</i>
        {t.recipes.foodSeqIntroAfter}
      </p>

      <ul className='foodseq_list'>
        {startPoints.map(ent =>
          <li
            key={ent.id}
            ref={elem => {
              if (elem) {
                startPointRefs.current.set(ent.id, elem);
              } else {
                startPointRefs.current.delete(ent.id);
              }
            }}
          >
            <SeqStartPoint entity={ent}/>
          </li>
        )}
      </ul>
    </main>
  );
});
