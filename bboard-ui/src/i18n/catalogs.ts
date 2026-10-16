// Every language's public-page words at once, for the tests and tools that read them all
// (copy-truth.test.ts). The site itself never imports this file: it fetches a language's
// words only when it is chosen (index.tsx, loadLanguage), so English visitors never
// download the drafts.
// SPDX-License-Identifier: Apache-2.0

import { en, type Strings } from './en';
import { es, esTestchain } from './es';
import { ja, jaMainnet, jaTestchain } from './ja';
import { de, deTestchain } from './de';
import { fr, frTestchain } from './fr';
import { LANGUAGE_NAMES, networkOverlayOf, type BuildKind, type Lang, type LanguagePack } from './index';

/** Each language: its name in the picker and its words (index.tsx LANGUAGE_NAMES and the packs). */
export const LANGUAGES: Record<Lang, { label: string; short: string; spaces: boolean } & LanguagePack> = {
  en: { ...LANGUAGE_NAMES.en, strings: en, testchain: {} },
  es: { ...LANGUAGE_NAMES.es, strings: es, testchain: esTestchain },
  ja: { ...LANGUAGE_NAMES.ja, strings: ja, testchain: jaTestchain, mainnet: jaMainnet },
  de: { ...LANGUAGE_NAMES.de, strings: de, testchain: deTestchain },
  fr: { ...LANGUAGE_NAMES.fr, strings: fr, testchain: frTestchain },
};

/** The strings that replace a language's own for this build (index.tsx networkOverlayOf). */
export const networkOverlay = (build: BuildKind, lang: Lang): Strings => networkOverlayOf(build, LANGUAGES[lang]);
