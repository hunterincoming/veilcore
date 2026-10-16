// The page of a record that dates a lab report (lab-report-date.ts). It is not a plant, so
// none of a plant's jobs are offered: no certificate, no sending to a lab, no agreement, no
// lab report of its own, no next stage. What it is for, its date, and the four things that
// make sense for it: show someone, the evidence bundle, the technical details and the backup.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, Collapse, Divider, Link, Paper, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Link as RouterLink } from 'react-router-dom';
import type { StrainRecord } from '../../veilcore/records';
import type { RecordKeys } from '../../veilcore/record-keys';
import { REAL_CHAIN } from '../../veilcore/chain/config';
import { shortFingerprint } from '../../veilcore/commitment';
import { utcStamp as fmt } from '../../veilcore/time';
import { useRecordDate } from '../verify/useAnchorCheck';
import { recordDateRow } from '../flow/plant-status-words';
import { ActionRow } from '../flow/PlantParts';
import { EvidenceBundle } from '../EvidenceBundle';
import { SettlementStatus } from '../SettlementStatus';
import { labReportPageLines } from './record-kinds';
import { rich, useT } from '../../i18n/app';
import { CODE_TEXT } from '../../config/theme';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box>
    <Typography variant="overline" sx={{ display: 'block' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
      {children}
    </Typography>
  </Box>
);

export const LabReportOverview: React.FC<{
  record: StrainRecord;
  keys?: RecordKeys;
  onShare: () => void;
  onBackup: () => void;
}> = ({ record, keys, onShare, onBackup }) => {
  const [details, setDetails] = useState(false);
  const plant = record.parents?.[0];
  const { proof, anchor } = useRecordDate(record.recordFingerprint);
  const tr = useT();
  const { t } = tr;
  // The data attribute keeps the English (tests and support); the page says it in the visitor's language.
  const enRow = recordDateRow(proof, anchor);
  const row = recordDateRow(proof, anchor, tr);
  const needsBackup = REAL_CHAIN && !!keys && keys.backedUpAt === undefined;

  return (
    <Stack spacing={2.5} data-lab-report-page="">
      <Paper sx={{ p: { xs: 2.25, md: 3 } }}>
        <Stack spacing={1}>
          <Typography variant="h6" component="h2" sx={{ overflowWrap: 'anywhere' }}>
            {rich(t('app.plant.datingPage.title'), {
              plant: () =>
                plant?.recordId ? (
                  <Link component={RouterLink} to={`/record/${plant.recordId}`}>
                    {plant.name}
                  </Link>
                ) : (
                  <>{plant?.name ?? t('app.home.aPlant')}</>
                ),
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('app.plant.datingPage.holds')}
          </Typography>
          {labReportPageLines(record, tr).map((l) => (
            <Typography key={l} variant="body2" sx={{ overflowWrap: 'anywhere' }}>
              {l}
            </Typography>
          ))}
          <Typography variant="body2" sx={{ fontWeight: 700 }} data-lab-report-record-date={enRow.value}>
            {t('app.plant.datingPage.recordDated', { value: row.value })}
          </Typography>
          {row.sub && (
            <Typography variant="caption" color="text.secondary">
              {row.sub}
            </Typography>
          )}
        </Stack>
      </Paper>

      {needsBackup && (
        <Alert
          severity="warning"
          variant="outlined"
          action={
            <Button color="inherit" variant="outlined" onClick={onBackup} sx={{ minHeight: 44 }}>
              {t('app.home.saveIt')}
            </Button>
          }
        >
          {rich(t('app.plant.datingPage.backup'), { b: (c) => <b>{c}</b> })}
        </Alert>
      )}

      {record.recordFingerprint && record.nonce && (
        <EvidenceBundle
          record={record}
          keys={keys}
          trigger={(open) => (
            <Typography variant="body2">
              {rich(t('app.plant.evidenceLine'), {
                link: (c) => (
                  <Link component="button" type="button" onClick={open} sx={{ verticalAlign: 'baseline' }}>
                    {c}
                  </Link>
                ),
                muted: (c) => (
                  <Box component="span" sx={{ color: 'text.secondary' }}>
                    {c}
                  </Box>
                ),
              })}
            </Typography>
          )}
        />
      )}

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          {t('app.plant.moreYouCanDo')}
        </Typography>
        <Paper sx={{ px: { xs: 1.5, md: 2 } }}>
          <ActionRow
            section="prove"
            label={t('app.plant.action.show')}
            hint={t('app.plant.action.showHint')}
            last={!(REAL_CHAIN && keys)}
            onClick={onShare}
          />
          {REAL_CHAIN && keys && (
            <ActionRow section="log" label={t('app.plant.action.freshBackup')} last onClick={onBackup} />
          )}
        </Paper>
      </Box>

      <Box>
        <Button
          onClick={() => setDetails(!details)}
          aria-expanded={details}
          aria-controls="record-technical-details"
          color="inherit"
          endIcon={details ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ minHeight: 44 }}
        >
          {t('app.plant.technicalDetails')}
        </Button>
        <Collapse in={details} id="record-technical-details">
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2}>
                <Field label={t('app.plant.datingPage.sealedBy')}>{record.bredBy}</Field>
                <Field label={t('app.plant.f.sealedClock')}>{fmt(record.loggedAt)}</Field>
                <Field label={t('app.plant.datingPage.notesAsSealed')}>
                  <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>
                    {record.notes}
                  </Box>
                </Field>
                <Divider />
                <Field label={t('app.plant.f.recordFingerprint')}>
                  <Box component="span" sx={CODE_TEXT}>
                    {shortFingerprint(record.recordFingerprint)}
                  </Box>
                </Field>
              </Stack>
            </Paper>
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <SettlementStatus record={record} />
            </Paper>
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={1}>
                <Typography variant="overline" sx={{ display: 'block' }}>
                  {t('app.plant.evidenceBundle')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('app.plant.datingPage.bundleText')}
                </Typography>
                <Box>
                  <EvidenceBundle record={record} keys={keys} />
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </Collapse>
      </Box>
    </Stack>
  );
};
