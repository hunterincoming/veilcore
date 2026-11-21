// Positioning (founders, 21 Nov 2026): VeilCore is opt-in proof the holder chooses, never a tool
// for exposing fraud or policing a market. "Prove what you want to prove. Keep the rest private."
// This holds the public text to it: every site and app string in all five languages, the README
// and llms.txt. Technical docs (threat models, reviews) may still say what an attacker could try;
// they are not read here.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { llmsTxt, statusFlags } from '../findable';

const UI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Exposure and policing words, in each language the site speaks. */
const POLICING = [
  /\bfraud/i,
  /\bcounterfeit/i,
  /\bbad actors?\b/i,
  /\bcrack(s|ing)? down\b/i,
  /\bexpos(e|es|ing) (fakes?|fraud|cheats?|counterfeits?)\b/i,
  /\b(end|stop|fight|combat)(s|ting|ping|ing)? (the )?(fraud|fakes?|counterfeit|theft)/i,
  /\bhard to fake\b/i,
  /\blaundering\b/i,
  /transparency for the industry/i,
  // The same in German, Spanish, French and Japanese. Nouns and the "hard to fake" lines only:
  // the verbs also say, accurately, that our server can't forge a message (privacy page).
  /Betrug|Fälschungen|Produktfälschung|schwer zu fälschen/i,
  /\bfraude|falsificaci[oó]n|difícil de falsificar/i,
  /contrefaçon|difficile à falsifier/i,
  /偽造品|偽造しにく|詐欺|摘発/,
];

const i18nFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return i18nFiles(p);
    return /\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [p] : [];
  });

describe('public text offers proof the holder chooses, never policing', () => {
  const texts: [string, string][] = [
    ...i18nFiles(path.join(UI, 'src/i18n')).map((f): [string, string] => [
      path.relative(UI, f),
      fs.readFileSync(f, 'utf8'),
    ]),
    ['README.md', fs.readFileSync(path.join(UI, '..', 'README.md'), 'utf8')],
    ['llms.txt', llmsTxt(statusFlags(UI))],
  ];

  it('has no fraud-busting or exposure wording, in any language', () => {
    const hits = texts.flatMap(([name, text]) =>
      text
        .split('\n')
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => POLICING.some((re) => re.test(line)))
        .map(({ line, i }) => `${name}:${i + 1}: ${line.trim()}`),
    );
    expect(hits).toEqual([]);
  });

  it('reads every language', () => {
    for (const lang of ['en', 'de', 'es', 'fr', 'ja'])
      expect(
        texts.some(([n]) => n.includes(`/${lang}.ts`) || n.includes(`/${lang}/`)),
        lang,
      ).toBe(true);
  });
});
