// The record app's text in one language: a key's text with its {placeholders} filled, a
// plural chosen the language's own way, and dates and numbers written the language's way.
// No React here: the app's word files (plant-status-words.ts and the like) use it too, and
// default to English (enT), so their own tests read the English as before.
//
// English is written exactly as the app wrote it before it was translated: numbers as
// String(n) and dates in the browser's own format (toLocaleDateString() with no language).
// Other languages use Intl with the chosen language.
// SPDX-License-Identifier: Apache-2.0

import type { Lang } from '../config/languages';
import { appEn, type AppKey } from './app/en';

/** A placeholder's value: text as it is, a number written the language's way. */
export type Vars = Record<string, string | number>;

/** The keys that come in plural forms: `x.one`, `x.other` (and other CLDR forms) give `x`. */
export type PluralKey = AppKey extends infer K ? (K extends `${infer B}.other` ? B : never) : never;

/** A key's plural `.one` form: English, Spanish, German and French have it; Japanese doesn't. */
export type OneKey = AppKey extends infer K ? (K extends `${string}.one` ? K : never) : never;

/**
 * A translation of the app: every key, except that a `.one` plural form is optional (a
 * language whose plurals have no "one", like Japanese, leaves it out). A form the language
 * has and the translation leaves out (French "many") falls back to `.other`.
 */
export type AppTranslation = { [K in Exclude<AppKey, OneKey>]: string } & { [K in OneKey]?: string };

export type AppDict = Partial<Record<string, string>>;

export type Translator = {
  readonly lang: Lang;
  /** The key's text with `{name}` placeholders filled from `vars`. */
  t: (key: AppKey, vars?: Vars) => string;
  /** The plural form of `key` for `n` (Intl.PluralRules), with `{count}` set to n. */
  tp: (key: PluralKey, n: number, vars?: Vars) => string;
  /** A number written the language's way (English: as before, String(n)). */
  num: (n: number) => string;
  /** A date the language's way (English: the browser's own format, as before). */
  date: (t: number | string | Date, opts?: Intl.DateTimeFormatOptions) => string;
  /** The locale for Intl and toLocale*String: undefined in English (the browser's own, as before). */
  readonly locale: string | undefined;
};

/** `{name}` placeholders filled from `vars`, in one pass over the text (a value is never read as a placeholder). */
export const fill = (text: string, vars: Vars | undefined, num: (n: number) => string): string =>
  vars
    ? text.replace(/\{(\w+)\}/g, (m, k: string) => {
        const v = vars[k];
        return v === undefined ? m : typeof v === 'number' ? num(v) : v;
      })
    : text;

export const makeTranslator = (lang: Lang, dict: AppDict): Translator => {
  const locale = lang === 'en' ? undefined : lang;
  const numberFormat = locale ? new Intl.NumberFormat(locale) : undefined;
  const plurals = new Intl.PluralRules(lang);
  const num = (n: number) => (numberFormat ? numberFormat.format(n) : String(n));
  // A key the language hasn't got yet shows in English: never the key itself.
  const raw = (key: string): string => dict[key] ?? (appEn as AppDict)[key] ?? key;
  const t = (key: AppKey, vars?: Vars) => fill(raw(key), vars, num);
  const tp = (key: PluralKey, n: number, vars?: Vars) => {
    const form = `${key}.${plurals.select(n)}`;
    const text = dict[form] ?? dict[`${key}.other`] ?? (appEn as AppDict)[form] ?? raw(`${key}.other`);
    return fill(text, { count: n, ...vars }, num);
  };
  const date = (v: number | string | Date, opts?: Intl.DateTimeFormatOptions) =>
    new Date(v).toLocaleDateString(locale, opts);
  return { lang, t, tp, num, date, locale };
};

/** The app in English: the default for the word files. */
export const enT: Translator = makeTranslator('en', appEn);
