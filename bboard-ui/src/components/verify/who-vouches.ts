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
//   - a record's own timestamp (veilcore/instant-stamp.ts) is a timestamp authority's signed
//     word, checked here against the proof code: 'signed', as a lab's signature is, when the link
//     carried that proof code, and the registry's word ('registry') when it didn't. One row per
//     token, so two authorities are two facts. A token that doesn't check is never passed in;
//   - a document's file is checked only once a picked file matched;
//   - the name and details are always the holder's own words;
//   - the Bitcoin stamp is this browser's check only once block N's header carried the stamp's
//     value and linked to a checkpoint this release pins (veilcore/bitcoin/stamp-check.ts), and
//     only for a bound link (otherwise the batch is checked, and the registry ties the record to
//     it); a link up from an earlier checkpoint says it rests on mined work;
//     the block explorers' word when both agree but it couldn't be linked; otherwise the
//     registry's report.
//
// SPDX-License-Identifier: Apache-2.0

import type { AppKey } from '../../i18n/app/en';
import { enT, type Translator } from '../../i18n/translate';
import { utcSeconds } from '../../veilcore/time';

/**
 * Who a row rests on, for its mark: checked here, signed by a lab, the registry's word, the
 * block explorers' word, the holder's.
 */
export type Basis = 'checked' | 'signed' | 'registry' | 'explorer' | 'holder' | 'none';
export type WhoRow = { readonly fact: string; readonly who: string; readonly basis: Basis; readonly id?: 'bitcoin' };

/** The batch's Bitcoin stamp, as the check page found it (useBitcoinCheck.ts). */
export type BitcoinRow =
  | { readonly state: 'pending' }
  | { readonly state: 'reported' | 'checking' | 'unreachable'; readonly height?: number }
  | {
      readonly state: 'linked';
      readonly height: number;
      readonly checkpoint: number;
      readonly time: number;
      /** Down to a later checkpoint (the hash chain), or up from an earlier one (proof of work). */
      readonly direction: 'down' | 'up';
    }
  | { readonly state: 'explorers'; readonly height: number; readonly explorers: readonly string[] }
  | { readonly state: 'failed'; readonly kind: 'stamp' | 'mismatch' | 'headers' };

/** A block's time, in the visitor's language, always in UTC (as Bitcoin keeps it). */
export const blockTime = (seconds: number, tr: Translator): string =>
  `${new Intl.DateTimeFormat(tr.locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(seconds * 1000))} UTC`;

/**
 * `bound`: the link carried the record's proof code and the registry reported the same one. Without
 * it, a checked stamp dates the batch, and only the registry puts this record in it (as the date
 * row says it).
 */
const bitcoinRow = (b: BitcoinRow, bound: boolean, tr: Translator): WhoRow => {
  const fact = t(tr, 'app.verify.who.btc');
  const row = (who: string, basis: Basis): WhoRow => ({ fact, who, basis, id: 'bitcoin' });
  switch (b.state) {
    case 'pending':
      return row(t(tr, 'app.verify.who.btc.pending'), 'none');
    case 'reported':
      return b.height === undefined
        ? row(t(tr, 'app.verify.who.btc.reportedAny'), 'registry')
        : row(t(tr, 'app.verify.who.btc.reported', { height: String(b.height) }), 'registry');
    case 'checking':
      return row(t(tr, 'app.verify.who.btc.checking'), 'registry');
    case 'unreachable':
      return row(t(tr, 'app.verify.who.btc.unreachable'), 'registry');
    case 'linked': {
      const v = { height: String(b.height), checkpoint: String(b.checkpoint), time: blockTime(b.time, tr) };
      if (!bound) return row(t(tr, 'app.verify.who.btc.batchOnly', v), 'registry');
      return row(
        t(tr, b.direction === 'up' ? 'app.verify.who.btc.linkedUp' : 'app.verify.who.btc.linked', v),
        'checked',
      );
    }
    case 'explorers':
      return row(
        t(tr, 'app.verify.who.btc.explorers', { height: String(b.height), explorers: b.explorers.join(', ') }),
        'explorer',
      );
    case 'failed':
      return row(t(tr, `app.verify.who.btc.failed.${b.kind}`), 'none');
  }
};

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
  /** The record's own timestamps, each checked on this page against the proof code (instant-stamp.ts). */
  readonly instant?: readonly { readonly tsa: string; readonly at: string }[];
  /** Those timestamps are more than five minutes apart (instant-stamp.ts DISAGREE_MS). */
  readonly instantDisagree?: boolean;
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
  /** The batch's Bitcoin stamp; no row when the registry reports none. */
  readonly bitcoin?: BitcoinRow;
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
  for (const tok of i.instant ?? [])
    rows.push({
      fact: t(tr, 'app.verify.who.tsa', { tsa: tok.tsa }),
      who:
        t(tr, i.bound ? 'app.verify.who.tsa.checked' : 'app.verify.who.tsa.unbound', { time: utcSeconds(tok.at) }) +
        (i.instantDisagree ? `${t(tr, 'app.signer.sep')}${t(tr, 'app.verify.who.tsa.disagree')}` : ''),
      basis: i.bound ? 'signed' : 'registry',
    });
  if (i.bitcoin) rows.push(bitcoinRow(i.bitcoin, i.bound || !!i.document, tr));
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
