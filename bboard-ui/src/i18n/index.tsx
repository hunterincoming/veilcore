// Languages, for the public pages (landing, header, footer) and the record app. The public
// pages' text is here (en.ts and its translations); the app's is in app/ (app/en/*.ts and
// its translations), loaded with the app's pages and used through useT() (app.tsx).
//
// Which language a visitor sees, in order: a ?lang= link, the language they picked
// before on this browser, then their browser's own language list. Not their location: a
// visitor's browser language says what they read, where they happen to be does not.
//
// English comes with the first file. Another language's words are their own file, fetched
// before the first page is drawn in it (main.tsx, preloadLanguage) or when the picker
// switches to it: a visitor reading English never downloads the drafts.
//
// A translation goes live only when a fluent speaker has checked it and its flag in
// config/languages.ts (PUBLISHED_LANGUAGES) is switched on; docs/translations/README.md
// says how. Until then it is a draft: veilcore.org (a mainnet build) doesn't offer it, the
// test site and the demo offer it in the picker under a banner saying it is a draft, a
// ?lang=xx link opens it anywhere for checking, and it is never picked automatically.
//
// SPDX-License-Identifier: Apache-2.0

import React, {
  createContext,
  startTransition,
  use,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { en, type StringKey, type Strings } from './en';
import { mainnetStrings } from './en-mainnet';
import { testchainStrings } from './en-testchain';
import { IS_MAINNET, CLAIMS_ON_MAINNET, MAINTENANCE_POLICY_APPROVED } from '../config/network';
import { CHAIN_READY, CHAIN_READS, REAL_CHAIN } from '../veilcore/chain/config';
import { AGREEMENTS_LIVE } from '../config/copy';
import { LANGUAGE_CODES, MAINNET_DRAFTS, PUBLISHED_LANGUAGES, type Lang } from '../config/languages';

export type { Lang };

/** The mainnet overlay in a language that has translated it (en-mainnet.ts's flags). */
export type MainnetOverlay = (o: {
  claimsOnMainnet: boolean;
  policyApproved: boolean;
  chainReads?: boolean;
  chainSends?: boolean;
}) => Strings;

/** A language's words for the public pages: its own, its test-site overlay, and its mainnet one if it has one. */
export type LanguagePack = { strings: Strings; testchain: Strings; mainnet?: MainnetOverlay };

/**
 * Each language's name in the picker. `spaces`: whether the language puts a space between
 * words. Headings written in two halves (`title1` and `title2`) join with a space only where
 * it does; Japanese joins them with nothing, or a stray space shows in the middle of the
 * heading. The words themselves are in the packs (below; all of them at once: catalogs.ts).
 */
export const LANGUAGE_NAMES: Record<Lang, { label: string; short: string; spaces: boolean }> = {
  en: { label: 'English', short: 'EN', spaces: true },
  es: { label: 'Español', short: 'ES', spaces: true },
  ja: { label: '日本語', short: 'JA', spaces: false },
  de: { label: 'Deutsch', short: 'DE', spaces: true },
  fr: { label: 'Français', short: 'FR', spaces: true },
};

const packs: Partial<Record<Lang, LanguagePack>> = { en: { strings: en, testchain: {} } };
const packLoading = new Map<Lang, Promise<LanguagePack>>();

const PACK_LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<LanguagePack>> = {
  ja: () => import('./ja').then((m) => ({ strings: m.ja, testchain: m.jaTestchain, mainnet: m.jaMainnet })),
  es: () =>
    Promise.all([import('./es'), import('./es-mainnet')]).then(([m, o]) => ({
      strings: m.es,
      testchain: m.esTestchain,
      mainnet: o.esMainnet,
    })),
  de: () =>
    Promise.all([import('./de'), import('./de-mainnet')]).then(([m, o]) => ({
      strings: m.de,
      testchain: m.deTestchain,
      mainnet: o.deMainnet,
    })),
  fr: () =>
    Promise.all([import('./fr'), import('./fr-mainnet')]).then(([m, o]) => ({
      strings: m.fr,
      testchain: m.frTestchain,
      mainnet: o.frMainnet,
    })),
};

/** Fetch a language's public-page words (once; the same promise every time, as `use` needs). */
export const loadLanguage = (lang: Lang): Promise<LanguagePack> => {
  const have = packs[lang];
  if (have) return Promise.resolve(have);
  let p = packLoading.get(lang);
  if (!p) {
    p = PACK_LOADERS[lang as Exclude<Lang, 'en'>]().then(
      (pack) => (packs[lang] = pack),
      (e: unknown) => {
        packLoading.delete(lang); // asked for again on the next render
        throw e;
      },
    );
    packLoading.set(lang, p);
  }
  return p;
};

/**
 * The language's words, or English if they can't be fetched (offline, a deploy in between):
 * the page then shows in English rather than not at all. Kept per language for this visit,
 * so a page that draws again doesn't ask again and again.
 */
const packOrEnglish = new Map<Lang, Promise<LanguagePack>>();
const loadPackOrEnglish = (lang: Lang): Promise<LanguagePack> => {
  let p = packOrEnglish.get(lang);
  if (!p) {
    p = loadLanguage(lang).catch(() => packs.en as LanguagePack);
    packOrEnglish.set(lang, p);
  }
  return p;
};

/** What kind of build this is, for choosing the network strings. */
export type BuildKind = {
  isMainnet: boolean;
  /** VITE_REAL_CHAIN=1: the browser sends transactions (the public test site). */
  realChain: boolean;
  claimsOnMainnet: boolean;
  policyApproved: boolean;
  /** The check page reads Midnight itself (mainnet: a read-only relay is configured). */
  chainReads?: boolean;
  /** Mainnet: the browser sends transactions through the mainnet sponsor, which also anchors batches. */
  chainSends?: boolean;
  /** Mainnet: licenses are switched on (config/copy.ts AGREEMENTS_LIVE). */
  agreementsLive?: boolean;
};

/**
 * The strings that replace a language's own (`pack`) for this build. catalogs.ts gives it
 * by language, for tests.
 *
 *   - mainnet build: en-mainnet.ts, with the language's own translation of it where it has
 *     one (Japanese, ja.ts `jaMainnet`); otherwise in English (the language's ordinary
 *     strings describe a test network, which would be wrong there);
 *   - real-chain test build (test.veilcore.org): en-testchain.ts, with the language's own
 *     translation of it where it has one. The English overlay still beats the language's
 *     ordinary strings, which describe the demo;
 *   - every other build: nothing; en.ts and the translations as they are.
 */
export const networkOverlayOf = (build: BuildKind, pack: LanguagePack): Strings => {
  if (build.isMainnet) {
    const flags = {
      claimsOnMainnet: build.claimsOnMainnet,
      policyApproved: build.policyApproved,
      chainReads: build.chainReads ?? false,
      chainSends: build.chainSends ?? false,
      agreementsLive: build.agreementsLive ?? false,
    };
    return { ...mainnetStrings(flags), ...(pack.mainnet?.(flags) ?? {}) };
  }
  if (build.realChain) return { ...testchainStrings, ...pack.testchain };
  return {};
};

export const THIS_BUILD: BuildKind = {
  isMainnet: IS_MAINNET,
  realChain: REAL_CHAIN && !IS_MAINNET,
  claimsOnMainnet: CLAIMS_ON_MAINNET,
  policyApproved: MAINTENANCE_POLICY_APPROVED,
  chainReads: CHAIN_READS,
  chainSends: IS_MAINNET && CHAIN_READY,
  agreementsLive: IS_MAINNET && AGREEMENTS_LIVE,
};

/** veilcore.org sends real transactions (the mainnet sponsor is live in this build). */
export const MAINNET_SENDS = THIS_BUILD.chainSends === true;

/** This build is the public test site (test.veilcore.org): it sends real transactions on a test network. */
export const IS_TEST_SITE = THIS_BUILD.realChain;

const isLang = (x: string): x is Lang => Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, x);

/** Languages a fluent speaker has checked (config/languages.ts). English always. */
export const publishedLanguages = (flags: Record<Lang, boolean> = PUBLISHED_LANGUAGES): Lang[] =>
  LANGUAGE_CODES.filter((l) => l === 'en' || flags[l]);

/**
 * Languages the picker offers. veilcore.org (a mainnet build): the published ones, plus the
 * drafts in MAINNET_DRAFTS under the draft banner. The
 * test site and the demo build: every language, drafts under the draft banner, so they can
 * be tried and checked on every page.
 */
export const offeredLanguages = (
  build: Pick<BuildKind, 'isMainnet'>,
  published: readonly Lang[],
  mainnetDrafts: readonly Lang[] = MAINNET_DRAFTS,
): Lang[] =>
  build.isMainnet
    ? LANGUAGE_CODES.filter((l) => published.includes(l) || mainnetDrafts.includes(l))
    : [...LANGUAGE_CODES];

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

/**
 * The language to start in. Exported for tests. A language picked before is kept if the
 * picker still offers it (on the test site, a draft someone chose); the browser's own list
 * only ever picks a published one.
 */
export const initialLanguage = (
  search: string,
  stored: string | null,
  browser: readonly string[],
  published: readonly Lang[],
  offered: readonly Lang[] = published,
): Lang => {
  // An explicit link wins, published or not: that is how a checker opens a draft.
  const asked = new URLSearchParams(search).get('lang')?.toLowerCase();
  if (asked && isLang(asked)) return asked;
  if (stored && isLang(stored) && offered.includes(stored)) return stored;
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
  /** What goes between the two halves of a heading: a space, or nothing in Japanese. */
  sp: string;
};

const LanguageContext = createContext<Ctx | null>(null);

/** The language this visit starts in: a ?lang= link, the kept choice, the browser's (initialLanguage). */
export const startingLanguage = (): Lang => {
  const published = publishedLanguages();
  return initialLanguage(
    window.location.search,
    readStored(),
    navigator.languages ?? [navigator.language],
    published,
    offeredLanguages(THIS_BUILD, published),
  );
};

/**
 * Fetch the starting language's words before the first page is drawn (main.tsx), so a
 * visitor reading Japanese never sees the page in English first. Nothing to fetch in English.
 */
export const preloadLanguage = (): Promise<unknown> => loadLanguage(startingLanguage());

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const published = useMemo(() => publishedLanguages(), []);
  const offered = useMemo(() => offeredLanguages(THIS_BUILD, published), [published]);
  const [lang, setLangState] = useState<Lang>(startingLanguage);
  // Fetched before the first page (preloadLanguage); a language picked later is fetched
  // in the picker's transition, and the page shows the old language until it is here.
  const pack = packs[lang] ?? use(loadPackOrEnglish(lang));

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // A transition: an app page whose text in the new language is still loading (app.tsx)
  // keeps showing the old language until it is here, rather than going blank.
  const setLang = useCallback(
    (l: Lang) => {
      startTransition(() => setLangState(l));
      if (offered.includes(l)) writeStored(l);
    },
    [offered],
  );

  const value = useMemo<Ctx>(() => {
    const strings = pack.strings;
    const overlay = networkOverlayOf(THIS_BUILD, pack);
    return {
      lang,
      setLang,
      t: (key, vars) => format(overlay[key] ?? strings[key] ?? en[key], vars),
      choices: offered,
      isDraft: !published.includes(lang),
      sp: LANGUAGE_NAMES[lang].spaces ? ' ' : '',
    };
  }, [lang, pack, setLang, published, offered]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useI18n = (): Ctx => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n outside LanguageProvider');
  return ctx;
};
