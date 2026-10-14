// Languages for the public pages (landing, header, footer). The record tool itself stays
// in English for now.
//
// Which language a visitor sees, in order: a ?lang= link, the language they picked
// before on this browser, then their browser's own language list. Not their location: a
// visitor's browser language says what they read, where they happen to be does not.
//
// A translation goes live only when a fluent speaker has checked it, by adding its code
// to VITE_PUBLISHED_LANGUAGES. Until then it can be opened with ?lang=xx for checking,
// under a banner saying it is a draft, and it is never picked automatically.
//
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { en, type StringKey, type Strings } from './en';
import { es, esTestchain } from './es';
import { ja, jaTestchain } from './ja';
import { de, deTestchain } from './de';
import { fr, frTestchain } from './fr';
import { mainnetStrings } from './en-mainnet';
import { testchainStrings } from './en-testchain';
import { IS_MAINNET, CLAIMS_ON_MAINNET, MAINTENANCE_POLICY_APPROVED } from '../config/network';
import { REAL_CHAIN } from '../veilcore/chain/config';

export const LANGUAGES = {
  en: { label: 'English', short: 'EN', strings: en as Strings, testchain: {} as Strings },
  es: { label: 'Español', short: 'ES', strings: es, testchain: esTestchain },
  ja: { label: '日本語', short: 'JA', strings: ja, testchain: jaTestchain },
  de: { label: 'Deutsch', short: 'DE', strings: de, testchain: deTestchain },
  fr: { label: 'Français', short: 'FR', strings: fr, testchain: frTestchain },
} as const;

export type Lang = keyof typeof LANGUAGES;

/** What kind of build this is, for choosing the network strings. */
export type BuildKind = {
  isMainnet: boolean;
  /** VITE_REAL_CHAIN=1: the browser sends transactions (the public test site). */
  realChain: boolean;
  claimsOnMainnet: boolean;
  policyApproved: boolean;
};

/**
 * The strings that replace a language's own for this build. Exported for tests.
 *
 *   - mainnet build: en-mainnet.ts, in English in every language (a draft translation of
 *     the test-network sentence would be wrong there);
 *   - real-chain test build (test.veilcore.org): en-testchain.ts, with the language's own
 *     translation of it where it has one. The English overlay still beats the language's
 *     ordinary strings, which describe the demo;
 *   - every other build: nothing; en.ts and the translations as they are.
 */
export const networkOverlay = (build: BuildKind, lang: Lang): Strings => {
  if (build.isMainnet)
    return mainnetStrings({ claimsOnMainnet: build.claimsOnMainnet, policyApproved: build.policyApproved });
  if (build.realChain) return { ...testchainStrings, ...LANGUAGES[lang].testchain };
  return {};
};

const THIS_BUILD: BuildKind = {
  isMainnet: IS_MAINNET,
  realChain: REAL_CHAIN && !IS_MAINNET,
  claimsOnMainnet: CLAIMS_ON_MAINNET,
  policyApproved: MAINTENANCE_POLICY_APPROVED,
};

const isLang = (x: string): x is Lang => Object.prototype.hasOwnProperty.call(LANGUAGES, x);

/** Languages a fluent speaker has checked. English always. */
export const publishedLanguages = (
  configured = import.meta.env.VITE_PUBLISHED_LANGUAGES as string | undefined,
): Lang[] => {
  const listed = (configured ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(isLang);
  return Array.from(new Set<Lang>(['en', ...listed]));
};

/** Show drafts in the picker too: local development, or a preview build made for checking. */
const showDrafts = (): boolean =>
  Boolean(import.meta.env.DEV) || (import.meta.env.VITE_SHOW_DRAFT_LANGUAGES as string | undefined) === '1';

const STORAGE_KEY = 'veilcore.lang';

const readStored = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStored = (lang: Lang): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private windows and blocked storage: the choice lasts for this visit only.
  }
};

/** The language to start in. Exported for tests. */
export const initialLanguage = (
  search: string,
  stored: string | null,
  browser: readonly string[],
  published: readonly Lang[],
): Lang => {
  // An explicit link wins, published or not: that is how a checker opens a draft.
  const asked = new URLSearchParams(search).get('lang')?.toLowerCase();
  if (asked && isLang(asked)) return asked;
  if (stored && isLang(stored) && published.includes(stored)) return stored;
  for (const tag of browser) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base) && published.includes(base)) return base;
  }
  return 'en';
};

/** `{name}` placeholders filled from `vars`. */
export const format = (text: string, vars?: Record<string, string>): string =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m) : text;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string>) => string;
  /** Languages the picker offers. */
  choices: Lang[];
  /** The current language is a draft nobody fluent has checked yet. */
  isDraft: boolean;
};

const LanguageContext = createContext<Ctx | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const published = useMemo(() => publishedLanguages(), []);
  const [lang, setLangState] = useState<Lang>(() =>
    initialLanguage(window.location.search, readStored(), navigator.languages ?? [navigator.language], published),
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      if (published.includes(l)) writeStored(l);
    },
    [published],
  );

  const value = useMemo<Ctx>(() => {
    const strings = LANGUAGES[lang].strings;
    const overlay = networkOverlay(THIS_BUILD, lang);
    return {
      lang,
      setLang,
      t: (key, vars) => format(overlay[key] ?? strings[key] ?? en[key], vars),
      choices: showDrafts() ? (Object.keys(LANGUAGES) as Lang[]) : published,
      isDraft: !published.includes(lang),
    };
  }, [lang, setLang, published]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useI18n = (): Ctx => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n outside LanguageProvider');
  return ctx;
};
