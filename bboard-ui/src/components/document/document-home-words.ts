// A document's line on the records list (AppHome.tsx): one plain status, dated or waiting for
// its date (secretary walkthrough, 18 Nov). The key's date stamp is not on it: a document's
// date comes from its batch, and "key not date stamped yet" on every row made finished
// documents look unfinished. The key stamp is under "Technical details" on the document's page.
// Kept apart from the components so it loads without the UI library.
// SPDX-License-Identifier: Apache-2.0

import type { ProofState } from '../../veilcore/proofs';
import type { AnchorState } from '../verify/anchor-words';
import { enT, type Translator } from '../../i18n/translate';

/** What the line says, for tests and the page's data attribute. */
export type DocumentHomeMark = 'checking' | 'waiting' | 'dated' | 'reported' | 'failed';

/**
 * The same answer the document's page gives (recordDateRow): "Dated …" only once this browser
 * found the batch root in the named transaction on Midnight (useAnchorCheck.ts, one cached
 * look-up per batch); the registry's report alone is said to be its report; a look-up that
 * contradicts it is "not confirmed". Before any batch: "Sealed … · waiting for its date".
 */
export const documentHomeDate = (
  proof: ProofState | 'checking',
  anchor: AnchorState | undefined,
  loggedAt: number,
  tr: Translator = enT,
): { mark: DocumentHomeMark; text: string } => {
  const sealed = tr.t('app.doc.home.sealedOn', { date: tr.date(loggedAt) });
  if (proof === 'checking') return { mark: 'checking', text: sealed };
  if (proof.status !== 'anchor-reported')
    return { mark: 'waiting', text: `${sealed} · ${tr.t('app.doc.home.waiting')}` };
  if (anchor !== undefined && anchor !== 'checking') {
    if (anchor.status === 'checked')
      return { mark: 'dated', text: tr.t('app.doc.home.dated', { date: tr.date(anchor.blockTime) }) };
    if (anchor.status === 'failed') return { mark: 'failed', text: `${sealed} · ${tr.t('app.doc.home.notConfirmed')}` };
    const at = proof.proof.anchor?.anchoredAt;
    if (at && !Number.isNaN(Date.parse(at)))
      return { mark: 'reported', text: tr.t('app.doc.home.datedReported', { date: tr.date(at) }) };
  }
  return { mark: 'checking', text: `${sealed} · ${tr.t('app.doc.home.checkingDate')}` };
};
