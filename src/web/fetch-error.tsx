import { ReactElement } from 'react';
import { useT } from './i18n';

export interface FetchErrorProps {
  message: string;
}

export const FetchError = ({ message }: FetchErrorProps): ReactElement => {
  const t = useT();
  return <>
    <p>{message} :(</p>
    <p>
      {t.common.errors.reloadHint}
      {' '}
      {t.common.errors.reportPrefix}
      <a href={`${REPO_URL}/issues`} target='_blank' rel='noopener'>
        {t.common.errors.reportLink}
      </a>
      {t.common.errors.reportSuffix}
    </p>
  </>;
}
