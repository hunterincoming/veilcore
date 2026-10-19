// Which translations veilcore.org shows: THE switch for languages. One flag per language.
//
//   true   published: offered in the language picker on every build, with no draft banner,
//          and picked automatically for a visitor whose browser asks for it;
//   false  a draft: on veilcore.org (a mainnet build) it is offered only if it is also in
//          MAINNET_DRAFTS below, always under the draft banner; otherwise only a ?lang=xx
//          link opens it, for checking. On the test site
//          (test.veilcore.org) and the demo build it is offered in the picker, always under
//          the draft banner, and never picked automatically.
//
// A language is switched on only after a fluent speaker has checked it, site and app, and
// signed it off in docs/translations/README.md ("Sign-off"). translations.test.ts fails if a
// language is true here without a sign-off line there. English is the source text: always on.
// SPDX-License-Identifier: Apache-2.0

/** Every language the site has text for, in the picker's order. */
export const LANGUAGE_CODES = ['en', 'ja', 'es', 'de', 'fr'] as const;

export type Lang = (typeof LANGUAGE_CODES)[number];

export const PUBLISHED_LANGUAGES: Record<Lang, boolean> = {
  en: true,
  ja: false,
  es: false,
  de: false,
  fr: false,
};

/**
 * Drafts veilcore.org offers in its picker anyway, under the draft banner ("Machine-drafted
 * translation, under review"). Only a language whose mainnet wording is translated too
 * (its own `mainnet` overlay: Japanese, ja.ts jaMainnet); any other would show the
 * main-network sentences in English in the middle of its own text.
 */
export const MAINNET_DRAFTS: readonly Lang[] = ['ja'];
