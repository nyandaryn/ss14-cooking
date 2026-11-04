import { ReactElement, memo } from 'react';
import {
  AddReagentStep,
  AddStep,
  AlsoMakesStep,
  ConstructionStep,
  EndStep,
  HeatMixtureStep,
  HeatStep,
  MixStep,
  SimpleInteractionStep,
  StartStep,
} from '../../types';
import { useGameData } from '../context';
import { useT } from '../i18n';
import { RawSprite } from '../sprites';
import { Temperature } from '../temperature';
import {
  ReagentIngredient,
  RecipeIngredients,
  SolidIngredient,
} from './ingredients';

export interface RecipeInstructionsProps {
  steps: readonly ConstructionStep[];
  visible: boolean;
}

export const RecipeInstructions = memo(({
  steps,
  visible,
}: RecipeInstructionsProps): ReactElement => {
  return (
    <ol className='recipe_instructions'>
      {steps.map((step, i) =>
        <Step key={i} step={step} visible={visible}/>
      )}
    </ol>
  );
});

interface StepProps {
  step: ConstructionStep;
  visible: boolean;
}

const Step = ({ step, visible }: StepProps): ReactElement => {
  switch (step.type) {
    case 'start':
      return <StartStep step={step}/>;
    case 'end':
      return <EndStep step={step}/>;
    case 'mix':
      return <MixStep step={step} visible={visible}/>;
    case 'add':
      return <AddStep step={step}/>;
    case 'addReagent':
      return <AddReagentStep step={step}/>;
    case 'heat':
      return <HeatStep step={step}/>;
    case 'heatMixture':
      return <HeatMixtureStep step={step}/>;
    case 'cut':
    case 'roll':
    case 'stir':
    case 'shake':
      return <SimpleStep step={step}/>;
    case 'alsoMakes':
      return <AlsoMakesStep step={step}/>;
  }
};

interface StartStepProps {
  step: StartStep;
}

const StartStep = ({ step }: StartStepProps): ReactElement => {
  const t = useT();
  return (
    <li className='recipe_step recipe_step--compact'>
      {t.recipes.stepTake}<SolidIngredient id={step.entity}/>
    </li>
  );
};

interface EndStepProps {
  step: EndStep;
}

const EndStep = ({ step }: EndStepProps): ReactElement => {
  const t = useT();
  if (typeof step.entity === 'string') {
    return (
      <li className='recipe_step recipe_step--compact'>
        {t.recipes.stepFinishWith}<SolidIngredient id={step.entity}/>
      </li>
    );
  } else {
    return (
      <li className='recipe_step recipe_step--add'>
        <span>{t.recipes.stepFinishWithOneOf}</span>
        {step.entity.map(id => <SolidIngredient key={id} id={id}/>)}
      </li>
    );
  }
};

interface MixStepProps {
  step: MixStep;
  visible: boolean;
}

const MixStep = ({ step, visible }: MixStepProps): ReactElement => {
  const t = useT();
  // Slightly more compact view if there's only one ingredient.
  // I really wish JS had a better way of traversing objects.
  const keys = Object.keys(step.reagents);
  if (keys.length === 1) {
    const id = keys[0];
    const ingredient = step.reagents[id];
    return (
      <li className='recipe_step recipe_step--compact'>
        {t.recipes.stepTake}
        <ReagentIngredient
          id={id}
          amount={ingredient.amount}
          catalyst={ingredient.catalyst}
        />
      </li>
    );
  } else {
    return (
      <li className='recipe_step recipe_step--mix'>
        <div>{t.recipes.stepMix}</div>
        <RecipeIngredients
          visible={visible}
          reagents={step.reagents}
          solids={{}}
        />
      </li>
    );
  }
};

interface AddStepProps {
  step: AddStep;
}

const AddStep = ({ step }: AddStepProps): ReactElement => {
  const t = useT();
  const multiple = typeof step.entity !== 'string';
  const text = t.recipes.stepAdd(step.minCount, step.maxCount, multiple);

  // More compact appearance if only one entity matches
  if (typeof step.entity === 'string') {
    return (
      <li className='recipe_step recipe_step--compact'>
        {text} <SolidIngredient id={step.entity}/>
      </li>
    );
  } else {
    return (
      <li className='recipe_step recipe_step--add'>
        <span>{text}</span>
        {step.entity.map(id => <SolidIngredient key={id} id={id}/>)}
      </li>
    );
  }
};

interface AddReagentStepProps {
  step: AddReagentStep;
}

const AddReagentStep = ({ step }: AddReagentStepProps): ReactElement => {
  const t = useT();
  const amount = step.minCount !== step.maxCount
    ? [step.minCount, step.maxCount] as const
    : step.minCount;

  return (
    <li className='recipe_step recipe_step--compact'>
      {t.recipes.stepAddReagent}<ReagentIngredient id={step.reagent} amount={amount}/>
    </li>
  );
};

interface HeatStepProps {
  step: HeatStep;
}

const HeatStep = ({ step }: HeatStepProps): ReactElement => {
  const { methodSprites } = useGameData();
  const t = useT();
  return (
    <li className='recipe_step recipe_step--simple'>
      <RawSprite position={methodSprites.heat!} alt=''/>
      {t.recipes.stepHeatTo}<Temperature k={step.minTemp}/>
    </li>
  );
};

interface HeatMixtureStepProps {
  step: HeatMixtureStep;
}

const HeatMixtureStep = ({ step }: HeatMixtureStepProps): ReactElement => {
  const { methodSprites } = useGameData();
  const t = useT();
  return (
    <li className='recipe_step recipe_step--simple'>
      <RawSprite position={methodSprites.heatMixture!} alt=''/>
      {' '}
      {step.maxTemp != null ? <>
        {t.recipes.stepHeatBetween}
        <Temperature k={step.minTemp}/>
        {t.recipes.stepHeatBetweenAnd}
        <Temperature k={step.maxTemp}/>
      </> : <>
        {t.recipes.stepHeatTo}<Temperature k={step.minTemp}/>
      </>}
    </li>
  );
};

interface SimpleStepProps {
  step: SimpleInteractionStep;
}

const SimpleStep = ({ step }: SimpleStepProps): ReactElement => {
  const { methodSprites } = useGameData();
  const t = useT();
  return (
    <li className='recipe_step recipe_step--simple'>
      <RawSprite position={methodSprites[step.type]!} alt=''/>
      {t.recipes.stepSimple[step.type]}
    </li>
  );
};

interface AlsoMakesStepProps {
  step: AlsoMakesStep;
}

const AlsoMakesStep = ({ step }: AlsoMakesStepProps): ReactElement => {
  const t = useT();
  // More compact appearance if there's only one other entity
  if (typeof step.entity === 'string') {
    return (
      <li className='recipe_step recipe_step--compact recipe_step--also'>
        {t.recipes.stepAlsoMakes}<SolidIngredient id={step.entity}/>
      </li>
    );
  } else {
    return (
      <li className='recipe_step recipe_step--add recipe_step--also'>
        <span>{t.recipes.stepAlsoMakesList}</span>
        {step.entity.map(id => <SolidIngredient key={id} id={id}/>)}
      </li>
    );
  }
};
