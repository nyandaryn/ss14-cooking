import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { intersperse } from '../helpers';
import { useT } from '../i18n';
import { ArrowRightIcon } from '../icons';
import { Notice } from '../notices';
import { AllStorageKeys } from '../storage';
import { UrlGenerator, useUrl } from '../url';

type ExportState =
  | NotAvailableState
  | AlreadyCanonicalState
  | LoadingState
  | NoDataState
  | ReadyState
  | ErrorState
  ;

interface NotAvailableState {
  readonly type: 'notAvailable';
}
const NotAvailableState: NotAvailableState = { type: 'notAvailable' };

interface AlreadyCanonicalState {
  readonly type: 'alreadyCanonical';
}
const AlreadyCanonicalState: AlreadyCanonicalState = { type: 'alreadyCanonical' };

interface LoadingState {
  readonly type: 'loading';
}
const LoadingState: LoadingState = { type: 'loading' };

interface NoDataState {
  readonly type: 'noData';
}
const NoDataState: NoDataState = { type: 'noData' };

interface ReadyState {
  readonly type: 'ready';
  readonly targetUrl: string;
}

interface ErrorState {
  readonly type: 'error';
  readonly targetUrl: string | null;
  readonly failedKeys: readonly string[];
}

const RedirectTimeout = 1000; // ms

export const ExportSection = (): ReactElement => {
  const [state, setState] = useState(getInitialState);

  const url = useUrl();
  const t = useT();
  useEffect(() => {
    switch (state.type) {
      case 'loading':
        setState(prepareExport(url));
        break;
      case 'ready': {
        const timeoutId = window.setTimeout(() => {
          window.location.href = state.targetUrl;
        }, RedirectTimeout);
        return () => window.clearTimeout(timeoutId);
      }
    }
  }, [state]);

  let children: ReactElement;
  switch (state.type) {
    case 'notAvailable':
      children = <>
        <p>
          {t.misc.export.notAvailablePrefix}
          <code>{'CANONICAL_URL'}</code>
          {t.misc.export.notAvailableSuffix}
        </p>
        <p>
          {t.misc.export.ownerHintPrefix}
          <code>.env.example</code>
          {t.misc.export.ownerHintSuffix}
        </p>
      </>;
      break;
    case 'alreadyCanonical':
      children = <>
        <p>{t.misc.export.alreadyCanonical}</p>
        <p>{t.misc.export.visitOld}</p>
      </>;
      break;
    case 'loading':
      children = <p>{t.misc.export.preparing}</p>;
      break;
    case 'noData':
      children =
        <Notice kind='info'>
          {t.misc.export.noData}
        </Notice>;
      break;
    case 'ready':
      children = <>
        <p>{t.misc.export.ready}</p>
        <p>{t.misc.export.notRedirected}</p>
        <p>
          {/* Explicitly no `rel='noreferrer'`: we need the target URL to have
            * a valid referrer.
            */}
          <a href={state.targetUrl}>
            {t.misc.export.continue} <ArrowRightIcon/>
          </a>
        </p>
      </>;
      break;
    case 'error':
      children = <>
        <Notice kind='error'>
          {t.misc.export.error}
        </Notice>
        <p>
          {t.misc.export.failedKeys}
          {intersperse<ReactNode>(
            state.failedKeys.map(key => <i key={key}>{key}</i>),
            ', '
          )}
        </p>
        {state.targetUrl !== null && <>
          <p>{t.misc.export.continueManually}</p>
          <p>
            <a href={state.targetUrl}>
              {t.misc.export.continuePartial} <ArrowRightIcon/>
            </a>
          </p>
        </>}
      </>;
      break;
  }

  return (
    <main>
      <section className='migrate'>
        {children}
      </section>
    </main>
  );
};

const getInitialState = (): ExportState => {
  if (!CANONICAL_URL) {
    return NotAvailableState;
  }

  const currentUrl = new URL(window.location.href);
  const canonicalUrl = new URL(CANONICAL_URL);
  if (currentUrl.host === canonicalUrl.host) {
    return AlreadyCanonicalState;
  }

  return LoadingState;
};

const prepareExport = (url: UrlGenerator): ExportState => {
  const data: Record<string, unknown> = {};
  const exportedKeys: string[] = [];
  const failedKeys: string[] = [];

  for (const key of AllStorageKeys) {
    let value: unknown;
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) {
        // No data at this key
        continue;
      }

      value = JSON.parse(raw);
      exportedKeys.push(key);
    } catch (e) {
      console.warn(`prepareExport: ${key}: error reading local storage:`, e);
      failedKeys.push(key);
      continue;
    }

    data[key] = value;
  }

  const targetUrl = exportedKeys.length > 0
    ? `${CANONICAL_URL!}${url.migrateImport(JSON.stringify(data))}`
    : null;

  if (failedKeys.length > 0) {
    return { type: 'error', failedKeys, targetUrl };
  }
  if (!targetUrl) {
    return NoDataState;
  }
  return { type: 'ready', targetUrl };
};
