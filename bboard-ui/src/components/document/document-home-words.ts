// A document's line on the records list (AppHome.tsx): one plain status, dated or waiting for
// its date (secretary walkthrough, 18 Nov). The key's date stamp is not on it: a document's
// date comes from its batch, and "key not date stamped yet" on every row made finished
// documents look unfinished. The key stamp is under "Technical details" on the document's page.
// Kept apart from the components so it loads without the UI library.
// SPDX-License-Identifier: Apache-2.0

import type { ProofState } from '../../veilcore/proofs';
import { enT, type Translator } from '../../i18n/translate';

/**
 * "Dated 18 Nov 2026" once the registry reports the record's batch on Midnight (the proof is
 * checked against the record here; the document's own page looks the transaction up), and
 * "Sealed 18 Nov 2026 · waiting for its date" before that. While the answer is on its way,
 * just when it was sealed.
 */
export const documentHomeDate = (proof: ProofState | 'checking', loggedAt: number, tr: Translator = enT): string => {
  const sealed = tr.t('app.doc.home.sealedOn', { date: tr.date(loggedAt) });
  if (proof === 'checking') return sealed;
  const at = proof.status === 'anchor-reported' ? proof.proof.anchor?.anchoredAt : undefined;
  if (at && !Number.isNaN(Date.parse(at))) return tr.t('app.doc.home.dated', { date: tr.date(at) });
  return `${sealed} · ${tr.t('app.doc.home.waiting')}`;
};
