// "How someone who disagrees can check this" on a check page (summit 5b item 13; the judge's two
// layers): what this record has that anyone can check with tools VeilCore didn't write, and what
// rests on VeilCore's own code, not yet audited. Only what the record actually has is listed.
// SPDX-License-Identifier: Apache-2.0

import type { AppKey } from '../../i18n/app/en';
import { enT, type Translator } from '../../i18n/translate';

export type LayersInput = {
  /** The registry reports a Bitcoin stamp for the record's batch. */
  readonly bitcoin: boolean;
  /** The record has a timestamp authority's token this page checked. */
  readonly timestamp: boolean;
  /** The registry reports a Midnight transaction for the record's batch. */
  readonly midnight: boolean;
  /** The record is in a batch, with a path from its proof code to the batch root. */
  readonly path: boolean;
  /** This page checked at least one lab signature. */
  readonly signatures: boolean;
  /** The record names its own key. */
  readonly keyBound: boolean;
};

const list = (items: string[], tr: Translator): string =>
  // English pages have no locale of their own (translate.ts), so the list words would follow the
  // browser's language ("und", "y"); the words around them are English, so the list is too.
  new Intl.ListFormat(tr.locale ?? 'en', { style: 'long', type: 'conjunction' }).format(items);

/** The two lines; `standard` is null when the record has nothing anyone can check yet. */
export const evidenceLayers = (i: LayersInput, tr: Translator = enT): { standard: string | null; veilcore: string } => {
  const t = (k: string) => tr.t(k as AppKey);
  const standard = [
    i.bitcoin ? t('app.verify.layers.btc') : null,
    i.timestamp ? t('app.verify.layers.tsa') : null,
    i.midnight ? t('app.verify.layers.tx') : null,
    i.path ? t('app.verify.layers.path') : null,
    i.signatures ? t('app.verify.layers.sigs') : null,
  ].filter((x): x is string => x !== null);
  const veilcore = [
    t('app.verify.layers.page'),
    i.midnight ? t('app.verify.layers.root') : null,
    i.keyBound ? t('app.verify.layers.key') : null,
  ].filter((x): x is string => x !== null);
  return {
    standard: standard.length ? tr.t('app.verify.layers.standard', { list: list(standard, tr) }) : null,
    veilcore: tr.t('app.verify.layers.veilcore', { list: list(veilcore, tr) }),
  };
};
