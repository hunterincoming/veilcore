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
import { EvidenceBundle, DOWNLOAD_EVIDENCE_LABEL } from '../EvidenceBundle';
import { SettlementStatus } from '../SettlementStatus';
import { labReportPageLines } from './record-kinds';

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
  const row = recordDateRow(proof, anchor);
  const needsBackup = REAL_CHAIN && !!keys && keys.backedUpAt === undefined;

  return (
    <Stack spacing={2.5} data-lab-report-page="">
      <Paper sx={{ p: { xs: 2.25, md: 3 } }}>
        <Stack spacing={1}>
          <Typography variant="h6" component="h2" sx={{ overflowWrap: 'anywhere' }}>
            This record dates a lab report for{' '}
            {plant?.recordId ? (
              <Link component={RouterLink} to={`/record/${plant.recordId}`}>
                {plant.name}
              </Link>
            ) : (
              (plant?.name ?? 'a plant')
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            It holds only the report&apos;s SHA-256, its lab report code and the lab&apos;s name as signed, never the
            report. When its batch is dated, it shows the report existed by then, without showing anyone the markers.
          </Typography>
          {labReportPageLines(record).map((l) => (
            <Typography key={l} variant="body2" sx={{ overflowWrap: 'anywhere' }}>
              {l}
            </Typography>
          ))}
          <Typography variant="body2" sx={{ fontWeight: 700 }} data-lab-report-record-date={row.value}>
            Record dated: {row.value}
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
              Save it
            </Button>
          }
        >
          <b>Save your backup.</b> This record&apos;s key is only on this device.
        </Alert>
      )}

      {record.recordFingerprint && record.nonce && (
        <EvidenceBundle
          record={record}
          keys={keys}
          trigger={(open) => (
            <Typography variant="body2">
              <Link component="button" type="button" onClick={open} sx={{ verticalAlign: 'baseline' }}>
                {DOWNLOAD_EVIDENCE_LABEL}
              </Link>{' '}
              <Box component="span" sx={{ color: 'text.secondary' }}>
                to check this record’s date without VeilCore
              </Box>
            </Typography>
          )}
        />
      )}

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          More you can do
        </Typography>
        <Paper sx={{ px: { xs: 1.5, md: 2 } }}>
          <ActionRow
            section="prove"
            label="Show someone"
            hint="Pick what they see"
            last={!(REAL_CHAIN && keys)}
            onClick={onShare}
          />
          {REAL_CHAIN && keys && <ActionRow section="log" label="Save a fresh backup" last onClick={onBackup} />}
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
          Technical details
        </Button>
        <Collapse in={details} id="record-technical-details">
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2}>
                <Field label="Sealed by">{record.bredBy}</Field>
                <Field label="Sealed (this device's clock)">{fmt(record.loggedAt)}</Field>
                <Field label="Notes, as sealed">
                  <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>
                    {record.notes}
                  </Box>
                </Field>
                <Divider />
                <Field label="Record fingerprint">
                  <Box component="span" sx={{ fontFamily: '"Space Grotesk", monospace' }}>
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
                  Evidence bundle
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The record as sealed, its inclusion proof, the batch root and where the batch was recorded, in one
                  .zip. Its verify.html checks it with no internet and nothing from VeilCore.
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
