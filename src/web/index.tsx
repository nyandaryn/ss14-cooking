import { enableMapSet } from 'immer';
import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { App } from './app';
import { ForkData } from '../types';
import { FetchError } from './fetch-error';
import { LangProvider, useT } from './i18n';
import './index.css';
import { AppRoutes } from './routes';
import { SettingsProvider } from './settings';

const IndexPath = `${BASE_PATH}/data/index.json`;

const renderRouter = (index: ForkData[]): ReactNode => {
  const router = createBrowserRouter([{
    element: <App forks={index}/>,
    children: AppRoutes,
  }], { basename: BASE_PATH });
  return <RouterProvider router={router}/>;
};

// Published pages carry the exact index used to generate their static catalog.
// Development builds can still fetch the index generated after the JS build.
const embeddedIndex: ForkData[] | null = (() => {
  try {
    const index = JSON.parse(document.getElementById('fork-index')?.textContent ?? 'null');
    return Array.isArray(index) && index.length > 0 ? index : null;
  } catch {
    return null;
  }
})();
const initialRouter = embeddedIndex ? renderRouter(embeddedIndex) : null;

const ForkListLoader = (): ReactElement => {
  const t = useT();
  const [children, setChildren] = useState<ReactNode>(initialRouter);

  useEffect(() => {
    if (initialRouter) return;
    const controller = new AbortController();
    fetch(IndexPath, { cache: 'reload', signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Fork index HTTP ${res.status}`);
        return res.json();
      })
      .then(index => {
        if (!controller.signal.aborted) setChildren(renderRouter(index));
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        console.error('Error loading fork list:', err);
        setChildren(<ForkListError/>);
      });
    return () => controller.abort();
  }, []);

  return <>{children ?? t.common.loading}</>;
};

const ForkListError = (): ReactElement => {
  const t = useT();
  return <FetchError message={t.common.errors.forkList}/>;
};

// Why do you make it so hard for me to love you, Immer?
enableMapSet();

const appRoot = document.getElementById('app-root')!;
createRoot(appRoot).render(
  <SettingsProvider>
    <LangProvider>
      <ForkListLoader/>
    </LangProvider>
  </SettingsProvider>
);
