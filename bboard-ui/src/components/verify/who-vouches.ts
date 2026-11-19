// "What each fact rests on": one short box at the top of a check page, so a stranger sees
// at once which facts this page checked itself, which a laboratory signed, which VeilCore's
// registry reports, and which are the holder's own words (authenticity plan, P1).
//
// Every row comes from something the page already worked out; nothing here checks anything or
// adds a claim. A row says the strongest thing the page has, never more:
//   - the date is Midnight's only once this page found the batch's anchor on Midnight itself
//     (anchorConfirmed), and a test network says it is practice;
//   - the proof code is this page's only when the link carried it and the registry reported
//     the same one (bound);
//   - a signature is a laboratory's word only as signerLabel words it ("a key named X (name not
//     checked)" unless VeilCore's operator matched the name), and only checked against a bound
//     link; a matched name says who matched it, so it never reads as VeilCore vouching;
//   - a document's file is checked only once a picked file matched;
//   - the name and details are always the holder's own words.
//
// SPDX-License-Identifier: Apache-2.0

import type { AppKey } from '../../i18n/app/en';
import { enT, type Translator } from '../../i18n/translate';

/** Who a row rests on, for its mark: checked here, signed by a lab, the registry's word, the holder's. */
export type Basis = 'checked' | 'signed' | 'registry' | 'holder' | 'none';
export type WhoRow = { readonly fact: string; readonly who: string; readonly basis: Basis };

export type WhoInput = {
  /** The link carried the proof code and the registry reported the same one. */
  readonly bound: boolean;
  /** Where the record's batch stands, as this page found it. */
  readonly proof: 'checking' | 'none' | 'pending' | 'anchor-reported';
  /** This page found the batch's anchor on Midnight itself. */
  readonly anchorConfirmed: boolean;
  /** This page tried to check the anchor on Midnight and the check failed or couldn't reach it. */
  readonly anchorFailed?: boolean;
  /** What the page found for the name and details: they match the proof code, they differ, or neither was checked. */
  readonly words?: 'matches' | 'differs' | 'unchecked';
  /** The network the anchor is on is a test network. */
  readonly testNetwork: boolean;
  /** The signatures this page verified, each as the page already words it. */
  readonly signers: readonly {
    readonly kind: string;
    readonly who: string;
    readonly nameChecked: boolean;
    /** The website the key named has since stopped listing it (signerLabel `published.state`). */
    readonly withdrawn?: boolean;
  }[];
  /** How many signatures to list before "and N more". */
  readonly max?: number;
  /**
   * A document's check page (DocumentCheck.tsx): the proof code is worked out there from what the
   * link carries, the file is compared on the checker's own device, and lab signatures are not
   * part of that page, so it has no laboratory row.
   */
  readonly document?: boolean;
  /** A document's file, as FileCompare found it: none sealed, not picked yet, or the result. */
  readonly file?: 'none' | 'waiting' | 'match' | 'no-match';
};

const t = (tr: Translator, k: string, v?: Record<string, string>) => tr.t(k as AppKey, v);

export const whoVouches = (i: WhoInput, tr: Translator = enT): WhoRow[] => {
  const rows: WhoRow[] = [];
  const date = t(tr, 'app.verify.who.date');
  if (i.proof === 'anchor-reported' && i.anchorFailed) {
    rows.push({ fact: date, who: t(tr, 'app.verify.who.date.failed'), basis: 'none' });
  } else if (i.proof === 'anchor-reported') {
    rows.push(
      i.anchorConfirmed && i.bound
        ? {
            fact: date,
            who: t(tr, i.testNetwork ? 'app.verify.who.date.chainTest' : 'app.verify.who.date.chain'),
            basis: 'checked',
          }
        : i.anchorConfirmed
          ? // The batch's date was checked on Midnight; only the registry ties this record to that batch.
            { fact: date, who: t(tr, 'app.verify.who.date.batchOnly'), basis: 'registry' }
          : { fact: date, who: t(tr, 'app.verify.who.date.registry'), basis: 'registry' },
    );
  } else if (i.proof === 'pending') {
    rows.push({ fact: date, who: t(tr, 'app.verify.who.date.pending'), basis: 'none' });
  } else if (i.proof === 'none') {
    rows.push({ fact: date, who: t(tr, 'app.verify.who.date.none'), basis: 'none' });
  }
  if (i.document) {
    rows.push({ fact: t(tr, 'app.verify.who.code'), who: t(tr, 'app.verify.who.code.recomputed'), basis: 'checked' });
    const file = i.file ?? 'waiting';
    rows.push({
      fact: t(tr, 'app.verify.who.file'),
      who: t(tr, `app.verify.who.file.${file === 'no-match' ? 'noMatch' : file}`),
      basis: file === 'match' ? 'checked' : 'none',
    });
    rows.push({ fact: t(tr, 'app.verify.who.typed'), who: t(tr, 'app.verify.who.typed.holder'), basis: 'holder' });
    return rows;
  }
  rows.push(
    i.bound
      ? { fact: t(tr, 'app.verify.who.code'), who: t(tr, 'app.verify.who.code.page'), basis: 'checked' }
      : { fact: t(tr, 'app.verify.who.code'), who: t(tr, 'app.verify.who.code.registry'), basis: 'registry' },
  );
  const words = i.words ?? 'unchecked';
  rows.push({
    fact: t(tr, 'app.verify.who.words'),
    who: t(tr, words === 'matches' ? 'app.verify.who.words.holder' : `app.verify.who.words.${words}`),
    basis: words === 'differs' ? 'none' : 'holder',
  });
  const max = i.max ?? 3;
  if (i.signers.length === 0) {
    rows.push({ fact: t(tr, 'app.verify.who.lab'), who: t(tr, 'app.verify.who.lab.none'), basis: 'none' });
  } else {
    for (const s of i.signers.slice(0, max)) {
      // signerLabel's words: any unmatched name as "a key named … (name not checked)". A matched
      // name says VeilCore's operator matched it and that this isn't VeilCore vouching.
      const who = s.who.charAt(0).toLocaleUpperCase(tr.locale) + s.who.slice(1);
      const key = s.nameChecked ? 'Matched' : '';
      // A lab disowning its key on its website is said here too, briefly; the line below has it
      // in full (docs/lab-key-on-website.md). The row's mark doesn't change.
      const gone = s.withdrawn ? `${t(tr, 'app.signer.sep')}${t(tr, 'app.verify.who.withdrawn')}` : '';
      rows.push(
        i.bound
          ? { fact: s.kind, who: t(tr, `app.verify.who.signed${key}`, { who }) + gone, basis: 'signed' }
          : { fact: s.kind, who: t(tr, `app.verify.who.signedUnbound${key}`, { who }) + gone, basis: 'registry' },
      );
    }
    if (i.signers.length > max) {
      rows.push({
        fact: t(tr, 'app.verify.who.more'),
        who: t(tr, 'app.verify.who.moreText', { n: String(i.signers.length - max) }),
        basis: i.bound ? 'signed' : 'registry',
      });
    }
  }
  return rows;
};
