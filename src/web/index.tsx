import { enableMapSet } from 'immer';
import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { App } from './app';
import { FetchError } from './fetch-error';
import { LangProvider, useT } from './i18n';
import './index.css';
import { AppRoutes } from './routes';
import { SettingsProvider } from './settings';

const IndexPath = `${BASE_PATH}/data/index.json`;

const ForkListLoader = (): ReactElement => {
  // This is a pretty bad implementation.
  // TODO: Maybe move things to a ForkListContext or something.
  const t = useT();
  const [children, setChildren] = useState<ReactNode>(null);

  useEffect(() => {
    fetch(IndexPath, { cache: 'reload' })
      .then(res => res.json())
      .then(
        index => {
          const router = createBrowserRouter([
            {
              element: <App forks={index}/>,
              children: AppRoutes,
            }
          ], {
            basename: BASE_PATH,
          });
          setChildren(<RouterProvider router={router}/>);
        },
        err => {
          console.error('Error loading fork list:', err);
          setChildren(<ForkListError/>);
        }
      );
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
