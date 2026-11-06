import {
  ReactElement,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { setCollatorLocale } from '../helpers';
import { useSettings } from '../settings';
import { Lang, LangLocales, detectLang, isLang } from './lang';
import { AllMessages, Messages } from './messages';

export {
  DefaultLang,
  Lang,
  LangLocales,
  LangNames,
  LangShortNames,
  Languages,
  isLang,
  pickLocalized,
} from './lang';
export { Messages } from './messages';
export { pluralEn, pluralRu } from './plural';

export interface LangContextValue {
  /** The current site language. */
  readonly lang: Lang;
  /** BCP 47 locale of the current language, e.g. `ru-RU`. */
  readonly locale: string;
  readonly setLang: (lang: Lang) => void;
  /** Translated strings for the current language. */
  readonly t: Messages;
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  locale: LangLocales.en,
  setLang: () => {},
  t: AllMessages.en,
});

export interface LangProviderProps {
  children: ReactNode;
}

// Set the collator before anything renders, so the first sort is correct.
const initialLang = detectLang();
setCollatorLocale(LangLocales[initialLang]);

export const LangProvider = ({ children }: LangProviderProps): ReactElement => {
  const [settings, updateSettings] = useSettings();

  // No saved language = follow the browser.
  const lang: Lang = isLang(settings.language) ? settings.language : initialLang;
  const locale = LangLocales[lang];

  // Must happen during render: children sort with this collator in useMemo.
  setCollatorLocale(locale);

  const setLang = useCallback((next: Lang) => {
    updateSettings(draft => {
      draft.language = next;
    });
  }, [updateSettings]);

  const t = AllMessages[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang, t]);

  const value = useMemo<LangContextValue>(() => ({
    lang,
    locale,
    setLang,
    t,
  }), [lang, locale, setLang, t]);

  return (
    <LangContext.Provider value={value}>
      {children}
    </LangContext.Provider>
  );
};

/** Returns the current language, its locale and a setter. */
export const useLang = (): LangContextValue => useContext(LangContext);

/** Returns the translated strings for the current language. */
export const useT = (): Messages => useContext(LangContext).t;
