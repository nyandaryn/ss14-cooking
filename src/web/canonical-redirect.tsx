import { ReactElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { FocusTrap } from './focus';
import { useT } from './i18n';
import { ArrowRightIcon, CloseIcon, InformationIcon } from './icons';
import { getPopupRoot } from './popup';
import { hasImportantStoredData } from './storage';
import { Tooltip } from './tooltip';
import { useUrl } from './url';

export const CanonicalRedirect = (): ReactElement | null => {
  if (!CANONICAL_URL) {
    // No canonical URL to redirect to.
    return null;
  }

  const currentUrl = new URL(window.location.href);
  const canonicalUrl = new URL(CANONICAL_URL);

  // We assume the cookbook won't be hosted in more than one place per origin.
  // If there is a canonical URL and the origin is different, then we show the
  // notice. Otherwise, don't.
  if (currentUrl.origin === canonicalUrl.origin) {
    return null;
  }

  return <CanonicalRedirectDialog/>;
};

const CanonicalRedirectDialog = (): ReactElement | null => {
  const [open, setOpen] = useState(true);
  const t = useT();

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className='overlay'>
      <FocusTrap>
        <section
          className='dialog dialog--basic redirect'
          tabIndex={-1}
          ref={ref}
        >
          <h2>{t.misc.redirect.title}</h2>

          <div className='dialog_body redirect_body thin-scroll'>
            <p>{t.misc.redirect.body1}</p>
            <p className='redirect_canonical'>
              <ArrowRightIcon/>
              <a href={CANONICAL_URL!} rel='noopener'>
                {CANONICAL_URL}
              </a>
            </p>
            <p>{t.misc.redirect.body2}</p>
            <p><strong>{t.misc.redirect.body3}</strong></p>
            <DataMigrationNotice onClose={() => setOpen(false)}/>
          </div>

          <Tooltip text={t.common.close} placement='left' provideLabel>
            <button className='dialog_close' onClick={() => setOpen(false)}>
              <CloseIcon/>
            </button>
          </Tooltip>
        </section>
      </FocusTrap>
    </div>,
    getPopupRoot()
  );
};

interface DataMigrationNoticeProps {
  onClose: () => void;
}

const DataMigrationNotice = ({
  onClose,
}: DataMigrationNoticeProps): ReactElement | null => {
  const url = useUrl();
  const t = useT();

  if (!hasImportantStoredData()) {
    return null;
  }

  return (
    <div className='redirect_data'>
      <InformationIcon/>
      <div className='redirect_data-body'>
        <p>{t.misc.redirect.dataNotice}</p>
        <Link
          to={url.migrateExport}
          className='btn'
          onClick={onClose}
        >
          {t.misc.redirect.migrateButton}
        </Link>
      </div>
    </div>
  );
};
