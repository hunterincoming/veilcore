// Every privacy sentence says what the sealed registry really reads (sealed records round 2).
//
// Since sealed records, VeilCore's server can read only a record's ID, the public name its
// holder chose, its profile, fingerprint and key binding, correction links, what the registry
// writes itself, when it first saw the record, values the holder chose to publish, a
// delivery's sample details (not locked yet), recipient tags, registered parent links, batch
// and date-stamp data, and rows saved before sealing until they are converted. Everything
// else the holder types is locked with a key VeilCore doesn't have (CONTRACT.md #4).
//
// So no English sentence that says VeilCore (its server, registry, site, "we") keeps, stores,
// sees or can read something may name a sealed field (breeder, notes, parents, quantity,
// license or agreement terms, dates), unless the same sentence says it is locked. And no
// sentence claims more than "stored locked, and we don't have the key": VeilCore also serves
// the app's code. The old, false sentences are checked to be caught, so the test can't pass
// by matching nothing.
// Run: npx vitest run src/i18n/sealed-copy.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { en } from './en';
import { mainnetStrings } from './en-mainnet';
import { testchainStrings } from './en-testchain';
import { appEn } from './app/en';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Fields that are sealed, as the copy would name them. */
const SEALED: readonly (readonly [string, RegExp])[] = [
  ['breeder', /\bbreeders?\b(?![’']s (record|own))|\bbred by\b/i],
  ['notes', /\bnotes?\b/i],
  ['parents', /\bparents\b|\bparent names\b|\bsire\b|\bdam\b/i],
  ['quantity', /\bquantit(y|ies)\b/i],
  ['license terms', /\b(license|licence|agreement) terms\b|\bterms and counterparties\b/i],
  ['dates', /\bdates\b|\bdate of birth\b/i],
];
/** The sentence says someone keeps, stores, sees or reads something... */
const READ = /\b(can read|reads|readable|can see|sees|keeps?|kept|stores?|stored|holds?|saved|saves)\b/i;
/** ...and that someone is VeilCore. */
const PARTY = /\b(VeilCore|VeilCore[’']s|server|registry|website|site|we|us)\b/i;
/** Unless the sentence says it is locked. */
const LOCKED =
  /\block(ed|s)?\b|without the key|(don|doesn)[’']t have (the|its) key|never sent|never uploaded|(isn|aren)[’']t uploaded/i;

/** Claims that are false since sealing, or more than the design shows. */
const NEVER: readonly RegExp[] = [
  /kept on VeilCore[’']s server/i,
  /everything you type is (kept|stored|saved)/i,
  /don[’']t type anything you need to keep secret/i,
  /a key only this browser has/i,
  /VeilCore can[’']t read/i,
  /unreadable to us/i,
  /This website keeps what you type/i,
];

const sentences = (s: string): string[] => s.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);

/** The sealed fields a text names as something VeilCore reads or keeps readable. */
const readableSealed = (text: string): string[] =>
  sentences(text).flatMap((sen) =>
    READ.test(sen) && PARTY.test(sen) && !LOCKED.test(sen)
      ? SEALED.filter(([, re]) => re.test(sen)).map(([name]) => `${name}: “${sen}”`)
      : [],
  );

/** Every English string a build can show, with the privacy note's titles joined to their text. */
const english = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const overlays: Record<string, string | undefined>[] = [
    en,
    { ...en, ...testchainStrings },
    ...[true, false].flatMap((claimsOnMainnet) =>
      [true, false].flatMap((policyApproved) =>
        [true, false].map((chainReads) => ({
          ...en,
          ...mainnetStrings({ claimsOnMainnet, policyApproved, chainReads }),
        })),
      ),
    ),
  ];
  overlays.forEach((strings, i) => {
    for (const [k, v] of Object.entries(strings)) {
      if (typeof v !== 'string') continue;
      // "Stored on our server: <list>" is one statement: read the title with the text.
      const title = k.endsWith('.text') ? strings[k.replace(/\.text$/, '.title')] : undefined;
      out[`${String(i)}:${k}`] = title ? `${title}: ${v}` : v;
    }
  });
  for (const [k, v] of Object.entries(appEn as Record<string, string>)) out[`app:${k}`] = v;
  // The holder-key file the app downloads, and the explainer video's words.
  out['holder.ts'] = fs.readFileSync(path.join(SRC, 'veilcore/holder.ts'), 'utf8');
  out['explainer.html'] = fs.readFileSync(path.join(SRC, '..', 'media-src/explainer/explainer.html'), 'utf8');
  return out;
};

describe('the English privacy copy (sealed records round 2)', () => {
  it('never names a sealed field as something VeilCore can read', () => {
    const found = Object.entries(english()).flatMap(([k, v]) => readableSealed(v).map((f) => `${k} ${f}`));
    expect(found).toEqual([]);
  });

  it('never says what sealing made false, or more than "stored locked, and we don’t have the key"', () => {
    const found = Object.entries(english()).flatMap(([k, v]) =>
      NEVER.filter((re) => re.test(v)).map((re) => `${k} ${String(re)}`),
    );
    expect(found).toEqual([]);
  });

  it('catches the sentences that were false before this round', () => {
    const OLD = {
      step1:
        "What it is and where it came from. The plant name and breeder you type are kept on VeilCore's server, and anyone with the record's link sees the name.",
      stored:
        'Stored on our server: What you type and what your browser computes from it: cultivar and breeder names, species if you enter one, dates, notes, reference numbers, parents, fingerprints of records, agreement terms and counterparties, material you send to a lab (who it is addressed to, and the quantity).',
      faq: "This website keeps what you type (names, dates, notes, agreement terms) and your lab files' names, so you can come back to them.",
      quantity: 'The registry keeps the quantity you send a lab.',
    };
    expect(readableSealed(OLD.step1).join()).toMatch(/^breeder/);
    expect(readableSealed(OLD.stored).map((f) => f.split(':')[0])).toEqual(
      expect.arrayContaining(['breeder', 'notes', 'parents', 'quantity', 'license terms', 'dates']),
    );
    expect(readableSealed(OLD.faq).map((f) => f.split(':')[0])).toEqual(
      expect.arrayContaining(['notes', 'license terms', 'dates']),
    );
    expect(readableSealed(OLD.quantity)).toHaveLength(1);
    // Saying it is locked is what makes the same list true.
    expect(
      readableSealed('Our server stores your breeder, dates and notes locked, and we don’t have the key.'),
    ).toEqual([]);
    for (const old of [
      "Everything you type is kept on our server, and a record's cultivar name is shown on its public check page. Don't type anything you need to keep secret.",
      'Your records are now locked with a key only this browser has.',
      "The locked file waits on VeilCore's server for you to open; VeilCore can't read it.",
    ])
      expect(
        NEVER.some((re) => re.test(old)),
        old,
      ).toBe(true);
  });

  it('the name field says the name is public, and suggests a code name', () => {
    const a = appEn as Record<string, string>;
    expect(a['app.log.nameLabel']).toMatch(/\(public\)$/);
    expect(a['app.plant.fix.name']).toMatch(/\(public\)$/);
    expect(a['app.animal.nameField']).toMatch(/\(public\)$/);
    expect(a['app.animal.v.app.plant.fix.name']).toMatch(/\(public\)$/);
    expect(a['app.log.nameHelp']).toMatch(/Anyone with a check link sees this name\. .*use a code name\./);
    for (const [file, key] of [
      ['components/flow/LogFlow.tsx', 'app.log.nameLabel'],
      ['components/flow/AnimalForm.tsx', 'app.animal.nameField'],
      ['components/CorrectRecord.tsx', 'app.plant.fix.name'],
    ] as const) {
      const src = fs.readFileSync(path.join(SRC, file), 'utf8');
      expect(src, file).toContain(`label={t('${key}')}`);
      expect(src, file).toContain(`helperText={t('app.log.nameHelp')}`);
    }
    expect(a['app.import.cols.intro']).toMatch(/The plant name is public/);
  });
});
