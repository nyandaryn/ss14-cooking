import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { intersperse, joinListNatural } from '../helpers';
import { useT } from '../i18n';
import { ArrowRightIcon } from '../icons';
import { Notice } from '../notices';
import { AllStorageKeys } from '../storage';
import { useUrl } from '../url';

type ImportState =
  | LoadingState
  | MissingDataState
  | SuccessState
  | UntrustedDataState
  | ErrorState
  ;

interface LoadingState {
  readonly type: 'loading';
}
const LoadingState: LoadingState = { type: 'loading' };

interface MissingDataState {
  readonly type: 'missingData';
}
const MissingDataState: MissingDataState = { type: 'missingData' };

interface SuccessState {
  readonly type: 'success';
}
const SuccessState: SuccessState = { type: 'success' };

interface UntrustedDataState {
  readonly type: 'untrustedData';
  readonly data: Record<string, unknown>;
}

interface ErrorState {
  readonly type: 'error';
  readonly message: string | null;
  /** If true, the data was parsed but is not an object; message is null. */
  readonly badFormat?: boolean;
  readonly failedKeys: readonly string[];
  readonly importedKeys: readonly string[];
}

const TrustedHosts = TRUSTED_HOSTS;

export const ImportSection = (): ReactElement => {
  const [query] = useSearchParams();

  const url = useUrl();
  const t = useT();

  const [state, setState] = useState<ImportState>(LoadingState);

  useEffect(() => {
    if (state.type === 'loading') {
      setState(prepareImport(query));
    }
  }, [state]);

  let children: ReactElement;
  switch (state.type) {
    case 'loading':
      children = <p>{t.misc.import.importing}</p>;
      break;
    case 'missingData':
      children = <>
        <Notice kind='warning'>
          {t.misc.import.missingData}
        </Notice>
        <p>{t.misc.import.missingDataHint}</p>
      </>;
      break;
    case 'success':
      children = <>
        <p>{t.misc.import.success}</p>
        <p>{t.misc.import.reloadToSee}</p>
        <p>
          <Link to={url.recipes} replace>
            {t.misc.migrate.continueToCookbook} <ArrowRightIcon/>
          </Link>
        </p>
      </>;
      break;
    case 'untrustedData': {
      const { data } = state;
      children = <>
        <Notice kind='warning'>
          {t.misc.import.untrusted}
        </Notice>
        {TrustedHosts.length > 0 ? (
          <p>
            {t.misc.import.untrustedFrom(
              joinListNatural(TrustedHosts, ', ', t.misc.import.listOr)
            )}
          </p>
        ) : (
          <p>{t.misc.import.noTrustedSources}</p>
        )}
        <p>
          {t.misc.import.warning1}
          {' '}
          {t.misc.import.warning2Prefix}
          <strong>{t.misc.import.warning2Strong}</strong>
          {t.misc.import.warning2Suffix}
          {' '}
          {t.misc.import.warning3}
        </p>
        <p>
          <button onClick={() => setState(performImport(data))}>
            {t.misc.import.importAnyway}
          </button>
          {' '}
          <Link to={url.recipes} replace className='btn'>
            {t.misc.import.abort}
          </Link>
        </p>
      </>;
      break;
    }
    case 'error':
      children = <>
        <Notice kind='error'>
          {t.misc.import.error}
        </Notice>
        {(state.message != null || state.badFormat) && (
          <p>
            {t.misc.import.errorMessage}
            {state.badFormat ? t.misc.import.badFormat : state.message}
          </p>
        )}
        {state.failedKeys.length > 0 && (
          <p>
            {t.misc.import.failedKeys}
            {intersperse<ReactNode>(
              state.failedKeys.map(key => <i key={key}>{key}</i>),
              ', '
            )}
          </p>
        )}
        {state.importedKeys.length > 0 && (
          <p>
            {t.misc.import.importedKeys}
            {intersperse<ReactNode>(
              state.importedKeys.map(key => <i key={key}>{key}</i>),
              ', '
            )}
          </p>
        )}
        <p>{t.misc.import.reloadToRetry}</p>
        <p>
          <button onClick={() => window.location.reload()}>
            {t.misc.import.reloadPage}
          </button>
        </p>
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

const prepareImport = (query: URLSearchParams): ImportState => {
  const dataRaw = query.get('data');
  if (!dataRaw) {
    return MissingDataState;
  }

  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(dataRaw);
    if (
      parsed == null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return {
        type: 'error',
        message: null,
        badFormat: true,
        failedKeys: [],
        importedKeys: [],
      };
    }

    data = parsed;
  } catch (e) {
    return {
      type: 'error',
      message: e instanceof Error ? e.message : String(e),
      failedKeys: [],
      importedKeys: [],
    };
  }

  if (isTrustedReferrer()) {
    return performImport(data) ?? SuccessState;
  }
  return { type: 'untrustedData', data };
};

const performImport = (data: Record<string, unknown>): SuccessState | ErrorState => {
  const importedKeys: string[] = [];
  const failedKeys: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (!AllStorageKeys.includes(key)) {
      // Skip unknown key
      continue;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`prepareImport: ${key}: error writing to localStorage:`, e);
      failedKeys.push(key);
    }
  }

  if (failedKeys.length > 0) {
    return {
      type: 'error',
      message: null,
      failedKeys,
      importedKeys,
    };
  }
  return SuccessState;
};

const isTrustedReferrer = (): boolean => {
  if (!document.referrer) {
    return false;
  }
  const referrer = new URL(document.referrer);
  return TrustedHosts.includes(referrer.host);
};
