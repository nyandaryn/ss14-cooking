import { useEffect } from 'react';
import { useLocation } from 'react-router';
import config from '../seo.json';
import { useLang } from './i18n';

/** Keep route metadata correct after client-side navigation as well as direct loads. */
export const Seo = () => {
  const { pathname } = useLocation();
  const { lang } = useLang();
  useEffect(() => {
    const path = pathname.replace(/\/$/, '') || '/';
    const page = config.pages[path as keyof typeof config.pages];
    const canonical = config.origin + (page && path !== '/' ? path + '/' : '/');
    const title = (page?.title ?? 'Справочник SS14 — личные инструменты');
    const description = (page?.description ?? 'Планировщик меню и перенос настроек справочника SS14.');
    document.title = title;
    const meta = (attribute: 'name' | 'property', key: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.append(element);
      }
      element.content = value;
    };
    meta('name', 'description', description);
    meta('name', 'robots', page ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' : 'noindex,follow');
    meta('property', 'og:site_name', config.siteName);
    meta('property', 'og:title', title);
    meta('property', 'og:description', description);
    meta('property', 'og:url', canonical);
    meta('property', 'og:locale', lang === 'ru' ? 'ru_RU' : 'en_US');
    meta('name', 'twitter:title', title);
    meta('name', 'twitter:description', description);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.append(link);
    }
    link.href = canonical;
    let schema = document.getElementById('seo-schema');
    if (!schema) {
      schema = document.createElement('script');
      schema.setAttribute('type', 'application/ld+json');
      schema.id = 'seo-schema';
      document.head.append(schema);
    }
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', '@id': config.origin + '/#website', url: config.origin + '/', name: config.siteName, inLanguage: ['ru', 'en'] },
        ...(page ? [{ '@type': 'CollectionPage', '@id': canonical + '#webpage', url: canonical, name: title, description, inLanguage: lang, isPartOf: { '@id': config.origin + '/#website' }, about: { '@type': 'VideoGame', name: 'Space Station 14' } }] : []),
      ],
    });
  }, [pathname, lang]);
  return null;
};
