// What to say when a lab's name was taken off a result (claims-key.ts findBinding "retracted").
// For a lab result v2 the lab's signature still checks and the result is what the lab signed:
// a re-test or correction REPLACED it ("superseded"), anything else WITHDREW it. Neither is
// "read the numbers as the holder's own", which is version 1's wording for its numbers.
// SPDX-License-Identifier: Apache-2.0

import type { LabSigner } from '../../veilcore/claim-link';
import type { Translator } from '../../i18n/translate';

export const withdrawnWords = (signer: LabSigner, v2: boolean, tr: Translator): string => {
  if (!v2) return tr.t('app.claim.check.labWithdrawn');
  const a =
    signer.kind === 'retracted' ? (signer.attestation as { retraction?: { reason?: string } | null }) : undefined;
  return tr.t(a?.retraction?.reason === 'superseded' ? 'app.lr.check.replaced' : 'app.lr.check.withdrawn');
};
