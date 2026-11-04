import { ReactElement } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useT } from '../i18n';
import { ArrowRightIcon } from '../icons';
import { useUrl } from '../url';
import { ExportSection } from './export-section';
import { ImportSection } from './import-section';

export const MigratePage = (): ReactElement => {
  const [query] = useSearchParams();

  const url = useUrl();
  const t = useT();

  if (query.has('import')) {
    return <ImportSection/>;
  }
  if (query.has('export')) {
    return <ExportSection/>;
  }

  let children: ReactElement;
  if (!CANONICAL_URL) {
    children = <>
      <p>{t.misc.migrate.noTarget}</p>
      <p>{t.misc.migrate.nothingToDo}</p>
    </>;
  } else {
    const currentUrl = new URL(window.location.href);
    const canonicalUrl = new URL(CANONICAL_URL);
    if (currentUrl.host === canonicalUrl.host) {
      children = <p>{t.misc.migrate.onCanonical}</p>;
    } else {
      children = <>
        <p>{t.misc.migrate.offer}</p>
        <p>
          <Link to={url.migrateExport}>
            {t.misc.migrate.exportLink} <ArrowRightIcon/>
          </Link>
        </p>
      </>;
    }
  }

  return (
    <main>
      <section className='migrate'>
        <p>{t.misc.migrate.howDidYouGetHere}</p>
        {children}
        <p>
          <Link to={url.recipes} replace>
            {t.misc.migrate.continueToCookbook} <ArrowRightIcon/>
          </Link>
        </p>
      </section>
    </main>
  );
};
