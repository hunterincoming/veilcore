// "VeilCore's server" is a phrase put into sentences ({server}, app/<lang>/copy.ts ourServer). In
// Spanish, French and German it starts with a small letter ("el servidor de VeilCore"), so a
// sentence that starts with it shows a lowercase start (easy-mode review, 19 Nov: the Spanish bulk
// import page read "… una planta. el servidor de VeilCore …"). Such a sentence is reworded so
// the phrase sits inside it.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { appEs } from './app/es';
import { appFr } from './app/fr';
import { appDe } from './app/de';

const SENTENCE_START = /(^|[.!?]\s+)\{server\}/;

describe('the server phrase never starts a sentence where it is written in lowercase', () => {
  for (const [lang, dict] of [
    ['es', appEs],
    ['fr', appFr],
    ['de', appDe],
  ] as const) {
    it(lang, () => {
      const starts = Object.entries(dict as Record<string, string>)
        .filter(([, v]) => SENTENCE_START.test(v))
        .map(([k]) => k);
      expect(starts).toEqual([]);
    });
  }
});
