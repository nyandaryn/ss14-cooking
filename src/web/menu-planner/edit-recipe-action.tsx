import { ReactElement } from 'react';
import { useT } from '../i18n';
import { AddIcon, RemoveRecipeIcon } from '../icons';
import { Tooltip } from '../tooltip';

export interface Props {
  id: string;
  isSelected?: boolean;
  onAdd?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const RecipeAction = ({
  id,
  isSelected = false,
  onAdd,
  onRemove,
}: Props): ReactElement => {
  const t = useT();
  return isSelected ? (
    <Tooltip text={t.menu.selected.removeRecipe} provideLabel>
      <button onClick={() => onRemove?.(id)}>
        <RemoveRecipeIcon/>
      </button>
    </Tooltip>
  ) : (
    <Tooltip text={t.menu.selected.addRecipe} provideLabel>
      <button onClick={() => onAdd?.(id)}>
        <AddIcon/>
      </button>
    </Tooltip>
  );
};
