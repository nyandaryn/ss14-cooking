import { ReactElement } from 'react';
import { useFork } from '../fork-context';
import { pickLocalized, useLang } from '../i18n';
import { Notice } from '../notices';

export interface MenuWarningProps {
  menuFork: string;
  unavailableRecipeCount: number;
}

export const MenuWarning = ({
  menuFork,
  unavailableRecipeCount,
}: MenuWarningProps): ReactElement | null => {
  const { fork: currentFork, allForks } = useFork();
  const { lang, t } = useLang();

  if (menuFork === currentFork && unavailableRecipeCount === 0) {
    return null;
  }

  const targetMenuFork = allForks.find(f => f.id === menuFork);

  return (
    <Notice kind='warning'>
      <p>
        {menuFork !== currentFork &&
          t.menu.warning.differentFork(
            targetMenuFork
              ? pickLocalized(targetMenuFork.name, lang)
              : t.menu.warning.forkNotAvailable
          )}
        {unavailableRecipeCount
          ? t.menu.warning.unavailableRecipes(unavailableRecipeCount)
          : ''}
      </p>
    </Notice>
  );
};
