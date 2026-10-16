// For tests that read a component's source to pin its wording: the words are app keys now
// (i18n/app/en), so a test reads the source with each `t('app.…')` call shown as the English
// it says. `t('app.log.startOver')` reads as `'Start over'`, `tr.t('app.x', { n })` as
// `'The English', { n })`, and a plural `tp('app.y', n)` as `'one form' | 'other form', n)`.
// Nothing in the app imports this.
// SPDX-License-Identifier: Apache-2.0

import { appEn } from './app/en';

const EN = appEn as Record<string, string>;

/** The source with every translated call written as the English it shows. */
export const withEnglish = (src: string): string =>
  src
    .replace(/\b(?:tr\.)?t\('(app\.[\w.-]+)'\)/g, (m, k: string) => (k in EN ? `'${EN[k]}'` : m))
    .replace(/\b(?:tr\.)?t\('(app\.[\w.-]+)',/g, (m, k: string) => (k in EN ? `'${EN[k]}',` : m))
    .replace(/\b(?:tr\.)?tp\('(app\.[\w.-]+)',/g, (m, k: string) =>
      `${k}.other` in EN ? `'${EN[`${k}.one`] ?? ''}' | '${EN[`${k}.other`]}',` : m,
    );

/** Whether the source shows these words, written in it or through an app key. */
export const sourceSays = (src: string, words: string): boolean => withEnglish(src).includes(words);
