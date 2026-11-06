import { ReactNode, useEffect, useRef } from 'react';
import { useLang } from './i18n';

export const DepartmentHeading = ({ code, title, description }: {
  code: string; title: [string, string]; description: [string, string];
}) => {
  const { lang } = useLang();
  const i = lang === 'ru' ? 0 : 1;
  return <div className='department-heading'>
    <span className='department-kicker'>{code}</span>
    <h1>{title[i]}</h1><p>{description[i]}</p>
  </div>;
};

export const CatalogSelection = ({ id, children }: { id: string; children: ReactNode }) => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'start' });
    ref.current?.focus({ preventScroll: true });
  }, [id]);
  return <section className='catalog-selected' ref={ref} tabIndex={-1}>{children}</section>;
};
