// "Show on my check link", per lab signature (8 Nov 2026).
//
// The registry keeps a lab's receipts and reports about a record private: only the holder,
// the delivery's parties and the lab can read them. The holder can show chosen ones on their
// check link (disclosure.ts GrantValues.sharedAttestations, under "Whether a DNA report is
// saved"). Each is off until the holder turns it on. When the saved DNA report matches a lab
// report, and the link carries that report's lab salt, showing that report is suggested: the
// check page can then say the lab signed that file.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Box, Button, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { isLabSignature, signerLabel, type ResolvedAttestation } from '../../veilcore/attesters';
import { isBoundLabDocument } from '../../veilcore/lab-doc';
import type { Translator } from '../../i18n/translate';

/** The lab signatures a holder can show: a lab's reports and receipts that verify here. */
export const shareableLabSignatures = (atts: readonly ResolvedAttestation[]): ResolvedAttestation[] =>
  atts.filter((a) => isLabSignature(a) && a.signatureValid);

export const LabSignatureShare: React.FC<{
  /** The holder's view of the record's signatures; null while loading, 'unknown' when it couldn't be read. */
  atts: readonly ResolvedAttestation[] | null | 'unknown';
  /** Ids chosen to show. */
  chosen: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** "Whether a DNA report is saved" is on: shared signatures are published only under it. */
  statusOn: boolean;
  /** The lab report matching the saved DNA report, when the link carries its lab salt. */
  suggested?: { id: string; lab: string } | null;
  tr: Translator;
}> = ({ atts, chosen, onToggle, statusOn, suggested, tr }) => {
  const { t } = tr;
  const list = Array.isArray(atts) ? shareableLabSignatures(atts) : [];
  return (
    <Box data-lab-share-section="">
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
        {t('app.prove.share.labSigs.title')}
      </Typography>
      {!statusOn ? (
        <Typography variant="body2" color="text.secondary" data-lab-share-needs-status="">
          {t('app.prove.share.labSigs.needsStatus')}
        </Typography>
      ) : atts === null ? (
        <Typography variant="body2" color="text.secondary">
          {t('app.prove.share.labSigs.loading')}
        </Typography>
      ) : atts === 'unknown' ? (
        <Typography variant="body2" color="text.secondary" data-lab-share-unknown="">
          {t('app.prove.share.labSigs.couldntLoad')}
        </Typography>
      ) : list.length === 0 ? (
        <Typography variant="body2" color="text.secondary" data-lab-share-none="">
          {t('app.prove.share.labSigs.none')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {t('app.prove.share.labSigs.intro')}
          </Typography>
          {suggested && !chosen.has(suggested.id) && list.some((a) => a.attestationId === suggested.id) && (
            <Alert severity="info" variant="outlined" data-lab-share-suggest={suggested.id}>
              {t('app.prove.share.labSigs.suggest', { lab: suggested.lab })}
              <Box sx={{ mt: 1 }}>
                <Button variant="outlined" size="small" onClick={() => onToggle(suggested.id)} sx={{ minHeight: 44 }}>
                  {t('app.prove.share.labSigs.suggestButton')}
                </Button>
              </Box>
            </Alert>
          )}
          {list.map((a) => {
            const who = signerLabel(a, '', undefined, tr).who;
            const date = tr.date(a.issuedAt);
            return (
              <Box key={a.attestationId} data-lab-share={a.attestationId}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={chosen.has(a.attestationId)}
                      onChange={() => onToggle(a.attestationId)}
                      slotProps={{ input: { 'aria-describedby': `lab-share-${a.attestationId}` } }}
                    />
                  }
                  label={
                    <Box sx={{ py: 0.75 }}>
                      <Typography variant="body2">{t('app.prove.share.labSigs.item', { who })}</Typography>
                      <Typography
                        id={`lab-share-${a.attestationId}`}
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        {a.type === 'chain-of-custody'
                          ? t('app.prove.share.labSigs.receipt', { date })
                          : t('app.prove.share.labSigs.report', { date })}
                        {a.retraction
                          ? `${t('app.common.sentenceSep')}${t('app.prove.share.labSigs.withdrawn', { date: tr.date(a.retraction.retractedAt) })}`
                          : ''}
                        {/* A lab report signed before round 6 names the file's plain SHA-256: shown,
                            anyone holding a copy of the file could tell it is saved to this record. */}
                        {a.type === 'laboratory-report' && !isBoundLabDocument(a)
                          ? `${t('app.common.sentenceSep')}${t('app.prove.share.labSigs.plainHash')}`
                          : ''}
                      </Typography>
                    </Box>
                  }
                  sx={{ minHeight: 44, mr: 0, alignItems: 'flex-start' }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};
