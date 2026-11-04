import { MouseEvent, ReactElement, ReactNode, memo, useMemo } from 'react';
import { Link, Outlet, useMatches } from 'react-router';
import { ForkData } from '../types';
import { Dropdown, DropdownOption } from './dropdown';
import { useFork } from './fork-context';
import {
  Lang,
  LangNames,
  LangShortNames,
  Languages,
  Messages,
  pickLocalized,
  useLang,
} from './i18n';
import { NoticeList } from './notices';
import { Tooltip } from './tooltip';
import { RouteHandle } from './routes';
import { SettingsButton } from './settings';
import { UrlGenerator, useUrl } from './url';

interface HeaderTab {
  readonly id: string;
  readonly target: (url: UrlGenerator) => string;
  readonly label: (t: Messages) => string;
}

const HeaderTabs: readonly HeaderTab[] = [
  {
    id: 'recipe-list',
    target: url => url.recipes,
    label: t => t.common.tabs.allRecipes,
  },
  {
    id: 'food-sequence',
    target: url => url.foodSequence,
    label: t => t.common.tabs.combinations,
  },
  {
    id: 'menu-planner',
    target: url => url.menuList,
    label: t => t.common.tabs.menuPlanner,
  },
];

export const Cookbook = (): ReactElement => {
  const { fork, allForks, setFork } = useFork();
  const { t } = useLang();

  const routes = useMatches();
  const url = useUrl();

  return <>
    <NoticeList currentFork={fork}/>
    <header className='tabs'>
      <div className='tabs_list'>
        {HeaderTabs.map(tab =>
          <Tab
            key={tab.id}
            target={tab.target(url)}
            selected={routes.some(r => (r.handle as RouteHandle)?.name === tab.id)}
          >
            {tab.label(t)}
          </Tab>
        )}
      </div>
      <div className='tabs_secondary'>
        <ForkSwitcher value={fork} allForks={allForks} onSetFork={setFork}/>
        <LanguageSwitcher/>
        <SettingsButton/>
      </div>
    </header>
    <Outlet/>
  </>;
};

interface TabProps {
  target: string;
  selected: boolean;
  children: ReactNode;
}

const Tab = memo(({
  target,
  selected,
  children,
}: TabProps): ReactElement => {
  return (
    <Link
      to={target}
      className={
        selected
          ? 'btn tabs_tab tabs_tab--current'
          : 'btn tabs_tab'
      }
      onClick={handleClickTab}
    >
      {children}
    </Link>
  );
});

const handleClickTab = (e: MouseEvent<HTMLAnchorElement>): void => {
  e.currentTarget.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  });
};

interface ForkSwitcherProps {
  value: string;
  allForks: readonly ForkData[];
  onSetFork: (value: string) => void;
}

const ForkSwitcher = memo(({
  value,
  allForks,
  onSetFork,
}: ForkSwitcherProps): ReactElement => {
  const { lang, t } = useLang();
  const options = useMemo<DropdownOption[]>(() => {
    return allForks
      .filter(data => !data.hidden || data.id === value)
      .map(data => ({
        name: pickLocalized(data.name, lang),
        value: data.id,
        description: pickLocalized(data.description, lang),
      }));
  }, [allForks, value, lang]);

  return (
    <Dropdown
      className='tabs_fork'
      value={value}
      prefix={t.common.forkPrefix}
      options={options}
      onChange={onSetFork}
    />
  );
});

const LanguageSwitcher = memo((): ReactElement => {
  const { lang, setLang, t } = useLang();
  return (
    <div className='tabs_lang' role='group' aria-label={t.common.language.label}>
      {Languages.map(l =>
        <LanguageButton
          key={l}
          lang={l}
          current={l === lang}
          label={t.common.language.switchTo(LangNames[l])}
          onSelect={setLang}
        />
      )}
    </div>
  );
});

interface LanguageButtonProps {
  lang: Lang;
  current: boolean;
  label: string;
  onSelect: (lang: Lang) => void;
}

const LanguageButton = memo(({
  lang,
  current,
  label,
  onSelect,
}: LanguageButtonProps): ReactElement => {
  return (
    <Tooltip text={label} placement='below'>
      <button
        className={current ? 'tabs_lang-btn tabs_lang-btn--current' : 'tabs_lang-btn'}
        lang={lang}
        aria-pressed={current}
        aria-label={label}
        onClick={() => onSelect(lang)}
      >
        {LangShortNames[lang]}
      </button>
    </Tooltip>
  );
});
