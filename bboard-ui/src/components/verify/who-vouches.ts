// "Who stands behind each fact": one short box at the top of a check page, so a stranger sees
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
//     link;
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
  /** The network the anchor is on is a test network. */
  readonly testNetwork: boolean;
  /** The signatures this page verified, each as the page already words it. */
  readonly signers: readonly { readonly kind: string; readonly who: string; readonly nameChecked: boolean }[];
  /** How many signatures to list before "and N more". */
  readonly max?: number;
  /**
   * A document's check page (DocumentCheck.tsx): the proof code is worked out there from what the
   * link carries, the file is compared on the checker's own device, and lab signatures are not
   * part of that page, so it has no laboratory row.
   */
  readonly document?: boolean;
};

const t = (tr: Translator, k: string, v?: Record<string, string>) => tr.t(k as AppKey, v);

export const whoVouches = (i: WhoInput, tr: Translator = enT): WhoRow[] => {
  const rows: WhoRow[] = [];
  const date = t(tr, 'app.verify.who.date');
  if (i.proof === 'anchor-reported') {
    rows.push(
      i.anchorConfirmed && i.bound
        ? {
            fact: date,
            who: t(tr, i.testNetwork ? 'app.verify.who.date.chainTest' : 'app.verify.who.date.chain'),
            basis: 'checked',
          }
        : { fact: date, who: t(tr, 'app.verify.who.date.registry'), basis: 'registry' },
    );
  } else if (i.proof === 'pending') {
    rows.push({ fact: date, who: t(tr, 'app.verify.who.date.pending'), basis: 'none' });
  } else if (i.proof === 'none') {
    rows.push({ fact: date, who: t(tr, 'app.verify.who.date.none'), basis: 'none' });
  }
  if (i.document) {
    rows.push({ fact: t(tr, 'app.verify.who.code'), who: t(tr, 'app.verify.who.code.recomputed'), basis: 'checked' });
    rows.push({ fact: t(tr, 'app.verify.who.file'), who: t(tr, 'app.verify.who.file.device'), basis: 'checked' });
    rows.push({ fact: t(tr, 'app.verify.who.typed'), who: t(tr, 'app.verify.who.words.holder'), basis: 'holder' });
    return rows;
  }
  rows.push(
    i.bound
      ? { fact: t(tr, 'app.verify.who.code'), who: t(tr, 'app.verify.who.code.page'), basis: 'checked' }
      : { fact: t(tr, 'app.verify.who.code'), who: t(tr, 'app.verify.who.code.registry'), basis: 'registry' },
  );
  rows.push({ fact: t(tr, 'app.verify.who.words'), who: t(tr, 'app.verify.who.words.holder'), basis: 'holder' });
  const max = i.max ?? 3;
  if (i.signers.length === 0) {
    rows.push({ fact: t(tr, 'app.verify.who.lab'), who: t(tr, 'app.verify.who.lab.none'), basis: 'none' });
  } else {
    for (const s of i.signers.slice(0, max)) {
      // signerLabel's words: a checked name plainly, any other as "a key named … (name not
      // checked)". A plain name says where it was matched, so it never reads as VeilCore's word.
      const named = s.nameChecked ? t(tr, 'app.verify.who.nameMatched', { who: s.who }) : s.who;
      const who = named.charAt(0).toLocaleUpperCase(tr.locale) + named.slice(1);
      rows.push(
        i.bound
          ? { fact: s.kind, who: t(tr, 'app.verify.who.signed', { who }), basis: 'signed' }
          : { fact: s.kind, who: t(tr, 'app.verify.who.signedUnbound', { who }), basis: 'registry' },
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
