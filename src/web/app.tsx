import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useSearchParams } from 'react-router';
import { ForkData, GameData } from '../types';
import { AttributionsLink } from './attributions';
import { CanonicalRedirect } from './canonical-redirect';
import { GameDataProvider } from './context';
import { FavoritesProvider } from './favorites';
import { FetchError } from './fetch-error';
import { ForkProvider } from './fork-context';
import { GitHubCommitUrl, GitHubRepoUrl } from './helpers';
import { Lang, useLang } from './i18n';
import { NoticesProvider } from './notices';
import { PrivacyPolicyLink } from './privacy';
import { RecipeExplorerProvider } from './recipe-explorer';
import { NoticeData } from './types';
import { UrlProvider } from './url';

export interface Props {
  forks: readonly ForkData[];
}

const NoticesPath = `${BASE_PATH}/data/notices.json`;

const ForkDataPath = (id: string, lang: string, hash: string) =>
  `${BASE_PATH}/data/data_${id}.${lang}.${hash}.json`;

/**
 * Picks the data file for the requested language, falling back to the fork's
 * first (default) language if the fork has no data for it.
 */
const pickDataFile = (
  fork: ForkData,
  lang: Lang
): [lang: string, hash: string] => {
  const hash = fork.hashes[lang];
  if (hash) {
    return [lang, hash];
  }
  const [fallback] = Object.entries(fork.hashes);
  return fallback;
};

const SpriteSheetPath = (fileName: string) =>
  `${BASE_PATH}/data/${fileName}`;

export const App = ({ forks }: Props): ReactElement => {
  const [query, setQuery] = useSearchParams();
  const { lang, locale, t } = useLang();

  const queryFork = query.get('fork');
  const fork = useMemo(() => {
    return findCurrentFork(queryFork, forks);
  }, [queryFork, forks]);

  const [data, setData] = useState<GameData | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [notices, setNotices] = useState<NoticeData[] | null>(null);
  const [error, setError] = useState(false);

  const handleSetFork = useCallback((nextFork: string) => {
    const isDefaultFork = forks.some(f => f.id === nextFork && f.default);
    setQuery(prevQuery => {
      const nextQuery = new URLSearchParams(prevQuery);
      if (isDefaultFork) {
        nextQuery.delete('fork');
      } else {
        nextQuery.set('fork', nextFork);
      }
      return nextQuery;
    });
  }, [setQuery]);

  const forkData = forks.find(f => f.id === fork)!;
  const [dataLang, dataHash] = pickDataFile(forkData, lang);
  const loadKey = `${forkData.id}:${dataLang}:${dataHash}`;
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(ForkDataPath(forkData.id, dataLang, dataHash), { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Game data HTTP ${res.status}`);
        return res.json();
      })
      .then((data: GameData) => {
        if (controller.signal.aborted) return;
        setData(data);
        setLoadedKey(loadKey);
        document.body.style.setProperty(
          '--sprite-url',
          `url('${SpriteSheetPath(data.spriteSheet)}')`
        );
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        console.error('Error fetching game data:', err);
        setError(true);
      });
    return () => controller.abort();
  }, [forkData, dataLang, dataHash, loadKey]);

  useEffect(() => {
    fetch(NoticesPath, { cache: 'reload' })
      .then(res => res.json())
      .catch(err => {
        console.error('Error fetching notices:', err);
        return [];
      })
      .then(setNotices);
  }, []);

  if (error) {
    return (
      <FetchError message={t.common.errors.recipeData}/>
    );
  }

  if (!data || !notices || loadedKey !== loadKey) {
    return <p>{t.common.loading}</p>
  }

  const meta = forkData.meta;
  const commitLink = GitHubCommitUrl(meta.repo, meta.commit);

  return (
    <UrlProvider>
      <NoticesProvider all={notices}>
        <GameDataProvider key={fork} forkId={fork} raw={data}>
          <ForkProvider fork={fork} allForks={forks} setFork={handleSetFork}>
            <FavoritesProvider>
              <RecipeExplorerProvider>
                <Outlet/>
              </RecipeExplorerProvider>
            </FavoritesProvider>
          </ForkProvider>
          <footer>
            <p>
              {t.common.footer.generatedPrefix}
              <a href={GitHubRepoUrl(meta.repo)} target='_blank' rel='noopener'>
                {meta.repo}
              </a>
              {t.common.footer.generatedCommit}
              <a href={commitLink} target='_blank' rel='noopener'>
                {meta.commit.slice(0, 9)}
              </a>
              {t.common.footer.generatedDate(formatDate(meta.date, locale))}
            </p>
            <p>
              {t.common.footer.basedOnPrefix}
              <a
                href='https://github.com/arimah/ss14-cookbook'
                target='_blank'
                rel='noopener'
              >
                SS14 Cookbook
              </a>
              {t.common.footer.basedOnSuffix}
            </p>
            <p>
              {t.common.footer.spritesPrefix}
              <AttributionsLink value={data.attributions} meta={meta}/>
              {t.common.footer.spritesSuffix}
            </p>
            <p>
              <PrivacyPolicyLink/>
              {' • '}
              <a href={REPO_URL} target='_blank' rel='noopener'>
                {t.common.footer.sourceCode}
              </a>
            </p>
          </footer>
          <CanonicalRedirect/>
        </GameDataProvider>
      </NoticesProvider>
    </UrlProvider>
  );
};

const findCurrentFork = (
  queryFork: string | null,
  allForks: readonly ForkData[],
): string => {
  // If there is a fork matching the query string fork exactly, use it.
  if (
    queryFork !== null &&
    allForks.some(f => f.id === queryFork)
  ) {
    return queryFork;
  }

  // Otherwise, find the first fork with `default: true`.
  let defaultFork = allForks.find(f => f.default)?.id;
  if (!defaultFork) {
    // If there is no such fork (unexpected!), use the first in the list.
    defaultFork = allForks[0].id;
  }
  return defaultFork;
};

const formatDate = (timestamp: number, locale: string): string =>
  new Date(timestamp).toLocaleString(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
  });
