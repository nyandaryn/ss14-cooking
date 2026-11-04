/** Site languages. The first one is the fallback. */
export const Languages = ['en', 'ru'] as const;

export type Lang = typeof Languages[number];

export const DefaultLang: Lang = 'en';

/** BCP 47 locale for each language: used for collation, dates, numbers. */
export const LangLocales: Readonly<Record<Lang, string>> = {
  en: 'en-US',
  ru: 'ru-RU',
};

/** Language names, always written in that language. */
export const LangNames: Readonly<Record<Lang, string>> = {
  en: 'English',
  ru: 'Русский',
};

/** Short labels for the language switcher. */
export const LangShortNames: Readonly<Record<Lang, string>> = {
  en: 'EN',
  ru: 'RU',
};

export const isLang = (value: unknown): value is Lang =>
  typeof value === 'string' && (Languages as readonly string[]).includes(value);

/** Picks a language from the browser's preferences. */
export const detectLang = (): Lang => {
  const preferred = typeof navigator !== 'undefined'
    ? navigator.languages ?? [navigator.language]
    : [];
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split('-')[0];
    if (isLang(base)) {
      return base;
    }
    // People who read Russian mostly have one of these set.
    if (base === 'uk' || base === 'be' || base === 'kk') {
      return 'ru';
    }
  }
  return DefaultLang;
};

/**
 * Picks the value for `lang` from a per-language record (as found in the fork
 * index), falling back to English and then to any available value.
 */
export const pickLocalized = (
  values: Readonly<Record<string, string>> | string,
  lang: Lang
): string => {
  if (typeof values === 'string') {
    return values;
  }
  return values[lang] ?? values[DefaultLang] ?? Object.values(values)[0] ?? '';
};
