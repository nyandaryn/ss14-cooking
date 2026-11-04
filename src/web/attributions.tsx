import {
  MouseEvent,
  ReactElement,
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useBlocker } from 'react-router';
import { MetaData, SpriteAttribution } from '../types';
import { FocusTrap } from './focus';
import { GitHubFolderUrl } from './helpers';
import { useT } from './i18n';
import { CloseIcon } from './icons';
import { Overlay } from './overlay';
import { getPopupRoot } from './popup';
import { RawSprite } from './sprites';
import { Tooltip } from './tooltip';

// TODO: Move this somewhere else probably
const TexturesSubPath = 'Resources/Textures';

export interface Props {
  value: readonly SpriteAttribution[];
  meta: MetaData,
}

export const AttributionsLink = memo(({ value, meta }: Props): ReactElement => {
  const [open, setOpen] = useState(false);

  const handleClick = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const t = useT();

  return <>
    <a href='#' onClick={handleClick}>
      {t.misc.attributions.showLink}
    </a>
    {open && createPortal(
      <AttributionsDialog value={value} meta={meta} onClose={close}/>,
      getPopupRoot()
    )}
  </>;
});

interface AttributionsDialogProps {
  value: readonly SpriteAttribution[];
  meta: MetaData,
  onClose: () => void;
}

const AttributionsDialog = memo(({
  value,
  meta,
  onClose,
}: AttributionsDialogProps): ReactElement => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const t = useT();

  // Always prevent navigation while this is open
  useBlocker(true);

  return (
    <Overlay>
      <FocusTrap onPointerDownOutside={onClose}>
        <section className='dialog attributions' ref={ref} tabIndex={-1}>
          <h2>{t.misc.attributions.title}</h2>

          <p>
            <i>{t.misc.attributions.disclaimerPrefix}</i>
            {' '}
            {t.misc.attributions.disclaimerField}
            {' '}
            <i>{t.misc.attributions.disclaimerSuffix}</i>
          </p>

          <ul className='attributions_list thin-scroll'>
            {value.map(attr =>
              <AttributionItem key={attr.path} attr={attr} meta={meta}/>
            )}
          </ul>

          <Tooltip text={t.common.close} placement='left' provideLabel>
            <button className='dialog_close' onClick={onClose}>
              <CloseIcon/>
            </button>
          </Tooltip>
        </section>
      </FocusTrap>
    </Overlay>
  );
});

interface AttributionItemProps {
  attr: SpriteAttribution;
  meta: MetaData;
}

const AttributionItem = ({ attr, meta }: AttributionItemProps) => {
  const t = useT();
  const pathUrl = GitHubFolderUrl(
    meta.repo,
    meta.commit,
    `${TexturesSubPath}/${attr.path}`
  );

  return (
    <li className='attributions_item'>
      <div className='attributions_sprites'>
        {attr.sprites.map((pos, i) =>
          <RawSprite key={i} position={pos} alt=''/>
        )}
      </div>
      <p>
        <b>{t.misc.attributions.path}</b>
        {' '}
        <a href={pathUrl} target='_blank' rel='noopener'>{attr.path}</a>
      </p>
      <p>
        <b>{t.misc.attributions.license}</b>
        {' '}
        <LicenseText license={attr.license}/>
      </p>
      <p>
        <b>{t.misc.attributions.copyright}</b>
        {' '}
        <CopyrightText copyright={attr.copyright}/>
      </p>
    </li>
  );
};

const PublicDomainUrl = 'https://creativecommons.org/publicdomain/zero/1.0/';
const CreativeCommonsUrl = (kind: string, version: string) =>
  `https://creativecommons.org/licenses/${kind.toLowerCase()}/${version}/`;

const PublicDomainRegex = /^CC[- ]?0(-1\.0)?$/;
const CreativeCommonsRegex = /^CC[- ](BY(?:-SA|-NC|-ND)*)-([0-9]+\.[0-9]+)$/;

interface LicenceTextProps {
  license: string;
}

const LicenseText = ({ license }: LicenceTextProps): ReactElement => {
  let url: string | null = null;
  const m = license.match(CreativeCommonsRegex);
  if (m) {
    url = CreativeCommonsUrl(m[1], m[2]);
  } else if (PublicDomainRegex.test(license)) {
    url = PublicDomainUrl;
  }

  return (
    url ? (
      <a href={url} target='_blank' rel='noopener'>
        {license}
      </a>
    ) : <>{license}</>
  );
};

const TrailingPunctuationRegex = /[.,]+$/;

interface CopyrightTextProps {
  copyright: string;
}

const CopyrightText = memo(({ copyright }: CopyrightTextProps): ReactNode => {
  // This regex is intentionally quite limited, to URLs of the following forms:
  //    https?://github.com/USER/REPO
  //    https?://github.com/USER/REPO/commit/HASH
  //    https?://github.com/USER/REPO/blob/HASH/PATH
  // If the PATH at the end of a blob URL ends with `.` or `,`, we ignore it.
  const githubUrlRegex = /https?:\/\/github\.com\/[^ /]+\/[^ /]+(?:\/commit\/[a-fA-F0-9]+\/?|\/blob\/[a-fA-F0-9]+(?:\/[^ /]+)+)?/g;

  const parts: ReactNode[] = [];
  let lastPartEnd = 0;

  let m: RegExpExecArray | null;
  while ((m = githubUrlRegex.exec(copyright))) {
    // If there's any text between where this URL starts and where
    // the previous part ended, insert that text.
    if (lastPartEnd < m.index) {
      parts.push(copyright.slice(lastPartEnd, m.index));
    }

    let url = m[0];
    const trailingPunct = TrailingPunctuationRegex.exec(url);
    if (trailingPunct) {
      url = url.slice(0, url.length - trailingPunct[0].length);
    }

    parts.push(
      <a key={m.index} href={url} target='_blank' rel='noopener'>
        {url}
      </a>
    );

    lastPartEnd = m.index + url.length;
  }
  if (lastPartEnd < copyright.length) {
    parts.push(copyright.slice(lastPartEnd));
  }

  return parts;
});
