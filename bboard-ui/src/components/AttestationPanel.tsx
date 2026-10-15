// What a second party has said about this record, and what it is worth.
//
// A record can carry attestations of very different weight: unsigned, signed by a key,
// or signed by a key whose holder names an external accreditor. Showing them
// identically overstates the weakest, which is the failure the simulate button was.
//
// Signatures are verified in this browser rather than taken from the registry's word.
//
// On the breeder's own plant (round 3) only the receipt a lab tied to one of the
// breeder's deliveries is shown as a receipt (custody.ts breederReceipt). The plant's
// fingerprint is public, so anyone can sign a statement about it: other receipt
// signatures are only counted, in a neutral line.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { attestationsFor, signerLabel, strengthLabel, type ResolvedAttestation } from '../veilcore/attesters';
import type { BreederReceipt } from '../veilcore/custody';
import { NameCheckText } from './NameCheckText';
import type { StrainRecord } from '../veilcore/records';

/** The breeder's own plant: its tied receipt, and a count of anything else. */
const BreederReceiptPanel: React.FC<{ receipt: BreederReceipt }> = ({ receipt }) => {
  // One label for every screen (attesters.ts signerLabel, round 4).
  const s = receipt.kind === 'signed' ? signerLabel(receipt.by) : undefined;
  return (
    <Stack spacing={1.5}>
      <Typography variant="overline" sx={{ display: 'block' }}>
        Lab receipt
      </Typography>
      {receipt.kind === 'signed' ? (
        <Box sx={{ pl: 1.5, borderLeft: '2px solid rgba(22,32,27,0.12)' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {s?.lead}
            {s?.checked ? '.' : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {new Date(receipt.by.issuedAt).toLocaleDateString()} · linked to your delivery {receipt.transferId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The signature was verified in this browser.
            {s?.checked ? (
              <NameCheckText label={s} />
            ) : (
              ' Anyone can register a key under any name, so the name doesn’t show who signed.'
            )}
            {receipt.by.retractionUnverified
              ? ' The registry also reports a retraction that is not signed by the lab, so it is ignored here.'
              : ''}
          </Typography>
        </Box>
      ) : receipt.kind === 'code-used' ? (
        <Typography variant="body2" color="text.secondary">
          Someone used your lab code, but no lab has signed a receipt for it. A used code doesn&apos;t show who took the
          sample.
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No lab has signed a receipt for this plant yet. A record only you stand behind is weaker evidence than one a
          lab signs for. Send a sample to a lab: their receipt is signed with their key, not yours.
        </Typography>
      )}
      {receipt.others > 0 && (
        <Typography variant="body2" color="text.secondary" data-other-signatures="">
          Other signatures name this record: {receipt.others}, not tied to your deliveries. Anyone can sign a statement
          about a public fingerprint, so they aren&apos;t counted as a receipt.
        </Typography>
      )}
    </Stack>
  );
};

export const AttestationPanel: React.FC<{
  record: StrainRecord;
  /** The breeder's own plant: show only its tied receipt (custody.ts). Absent for a received record. */
  receipt?: BreederReceipt | null;
}> = ({ record, receipt }) => {
  const [items, setItems] = useState<ResolvedAttestation[] | null>(null);

  useEffect(() => {
    void attestationsFor(record.recordFingerprint).then(setItems);
  }, [record.recordFingerprint]);

  // The legacy transfer-claim attestation, which predates signing.
  const legacy = record.attestation;

  if (receipt !== undefined) return receipt === null ? null : <BreederReceiptPanel receipt={receipt} />;
  if (items === null) return null;

  if (items.length === 0 && !legacy) {
    return (
      <Stack spacing={1}>
        <Typography variant="overline" sx={{ display: 'block' }}>
          Signatures about this record
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Nobody else has confirmed this record yet. A record only you stand behind is weaker evidence than one a second
          party confirms. Send the material to a lab: their confirmation is recorded under their key, not yours.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="overline" sx={{ display: 'block' }}>
        Signatures about this record
      </Typography>

      {legacy && items.length === 0 && (
        <Alert severity="info" variant="outlined">
          {/* The lead sentence used to read "Confirmed by bob", which asserts the thing
              the caveat below then walks back. A transfer claim establishes that
              someone holding the sender's code took delivery — the handle is who the
              sender addressed, not a party this confirms, because a recipient holds no
              key when the offer is made. */}
          Delivery taken on {new Date(legacy.attestedAt).toLocaleDateString()} by a party holding the code the sender
          issued
          {(legacy.addressedTo ?? legacy.attesterHandle)
            ? `, addressed to ${legacy.addressedTo ?? legacy.attesterHandle}`
            : ''}
          . Recorded before signing existed, so it establishes that a second party took delivery without proving who
          they are.
        </Alert>
      )}

      {items.map((a) => {
        const s = strengthLabel(a);
        return (
          <Box key={a.attestationId} sx={{ pl: 1.5, borderLeft: '2px solid rgba(22,32,27,0.12)' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
              <Chip size="small" variant="outlined" color={s.ok ? 'primary' : 'default'} label={s.label} />
              <Typography variant="caption" color="text.secondary">
                {a.type} · {new Date(a.issuedAt).toLocaleDateString()}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {s.why}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
};
