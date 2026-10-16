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
import { useT } from '../i18n/app';

/** The breeder's own plant: its tied receipt, and a count of anything else. */
const BreederReceiptPanel: React.FC<{ receipt: BreederReceipt }> = ({ receipt }) => {
  const tr = useT();
  const { t } = tr;
  // One label for every screen (attesters.ts signerLabel, round 4).
  const s = receipt.kind === 'signed' ? signerLabel(receipt.by, undefined, undefined, tr) : undefined;
  return (
    <Stack spacing={1.5}>
      <Typography variant="overline" sx={{ display: 'block' }}>
        {t('app.plant.labReceipt')}
      </Typography>
      {receipt.kind === 'signed' ? (
        <Box sx={{ pl: 1.5, borderLeft: '2px solid rgba(30,34,39,0.12)' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {s?.lead}
            {s?.checked ? t('app.common.period') : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {t('app.plant.att.linked', { date: tr.date(receipt.by.issuedAt), id: receipt.transferId })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('app.plant.att.verified')}
            {s?.checked ? <NameCheckText label={s} /> : t('app.lab.results.anyName')}
            {receipt.by.retractionUnverified ? t('app.plant.att.unverifiedRetraction') : ''}
          </Typography>
        </Box>
      ) : receipt.kind === 'code-used' ? (
        <Typography variant="body2" color="text.secondary">
          {t('app.plant.att.codeUsed')}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('app.plant.att.noReceipt')}
        </Typography>
      )}
      {receipt.others > 0 && (
        <Typography variant="body2" color="text.secondary" data-other-signatures="">
          {t('app.plant.att.others', { n: receipt.others })}
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
  const tr = useT();
  const { t } = tr;
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
          {t('app.plant.att.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('app.plant.att.nobody')}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="overline" sx={{ display: 'block' }}>
        {t('app.plant.att.title')}
      </Typography>

      {legacy && items.length === 0 && (
        <Alert severity="info" variant="outlined">
          {/* The lead sentence used to read "Confirmed by bob", which asserts the thing
              the caveat below then walks back. A transfer claim establishes that
              someone holding the sender's code took delivery — the handle is who the
              sender addressed, not a party this confirms, because a recipient holds no
              key when the offer is made. */}
          {t('app.plant.att.legacy', {
            date: tr.date(legacy.attestedAt),
            addressed:
              (legacy.addressedTo ?? legacy.attesterHandle)
                ? t('app.plant.att.addressed', { who: legacy.addressedTo ?? legacy.attesterHandle ?? '' })
                : '',
          })}
        </Alert>
      )}

      {items.map((a) => {
        const s = strengthLabel(a, tr);
        return (
          <Box key={a.attestationId} sx={{ pl: 1.5, borderLeft: '2px solid rgba(30,34,39,0.12)' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
              <Chip size="small" variant="outlined" color={s.ok ? 'primary' : 'default'} label={s.label} />
              <Typography variant="caption" color="text.secondary">
                {a.type} · {tr.date(a.issuedAt)}
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
