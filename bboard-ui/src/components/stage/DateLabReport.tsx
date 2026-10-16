// "Date this lab report", beside the lab report saved to a plant (lab-report-date.ts). The
// same control on the plant page (StageRows.tsx) and on the saved report's card in Lab
// reports (LabResults.tsx): once a report is dated, both show where and how far along.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Link, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/EventAvailableOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { allRecords, createRecordSaved, hydrate, useRecords, type StrainRecord } from '../../veilcore/records';
import { sealRecord, type SealedRecord } from '../../veilcore/seal-record';
import { forgetKeys, keysFor } from '../../veilcore/record-keys';
import { withTabLock } from '../../veilcore/tab-lock';
import type { SavedReport } from '../../veilcore/saved-report';
import { useRecordDate } from '../verify/useAnchorCheck';
import { recordDateRow } from '../flow/plant-status-words';
import { today } from '../flow/log-flow-state';
import { rich, useT } from '../../i18n/app';
import { enT } from '../../i18n/translate';
import {
  SEALING_ELSEWHERE,
  dateLabReportWith,
  datingRecordFor,
  labReportDatedLine,
  labReportFacts,
  localMarks,
  type DateLabReportDeps,
} from './lab-report-date';

/** Saved and answered by the registry; a refusal throws, so nothing half-made is shown. */
const createAndSave = async (sealed: SealedRecord): Promise<StrainRecord> => {
  const { record, result } = await createRecordSaved(sealed);
  const refused = result.refused.find((r) => r.id === record.id || r.id === '*');
  if (refused) throw new Error(enT.t('app.plant.dated.refused', { reason: refused.reason }));
  return record;
};

const DEPS: DateLabReportDeps = {
  all: allRecords,
  refresh: hydrate,
  lock: withTabLock,
  seal: sealRecord,
  create: createAndSave,
  forget: forgetKeys,
  hasKeys: (id) => !!keysFor(id),
  marks: localMarks,
  now: Date.now,
  today,
};

/**
 * "Lab report dated: in VEIL-… (waiting for a batch)", the id a link to that record. The
 * data attribute keeps the English line (labReportDatedLine) in every language.
 */
const DatedLine: React.FC<{ dating: StrainRecord }> = ({ dating }) => {
  const { proof, anchor } = useRecordDate(dating.recordFingerprint);
  const tr = useT();
  const line = labReportDatedLine(dating.id, recordDateRow(proof, anchor));
  const row = recordDateRow(proof, anchor, tr);
  const status =
    row.mark === 'done' || row.mark === 'reported' ? tr.t('app.plant.dated.dated', { value: row.value }) : row.value;
  return (
    <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }} data-lab-report-dated={line}>
      {rich(
        tr.t('app.plant.dated.line'),
        {
          link: () => (
            <Link component={RouterLink} to={`/record/${dating.id}`}>
              {dating.id}
            </Link>
          ),
        },
        { status },
      )}
    </Typography>
  );
};

export const DateLabReport: React.FC<{
  /** The plant the report is saved to. */
  record: StrainRecord;
  /** Where the saved report stands (LabResults.tsx useSavedReport); null while loading. */
  saved: SavedReport | null | undefined;
  /** 'row': a row in the plant page's list. 'card': inside the saved report's card. */
  variant?: 'row' | 'card';
}> = ({ record, saved, variant = 'row' }) => {
  const records = useRecords();
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const facts = labReportFacts(record, saved);
  const sha = facts?.sha ?? (saved && saved.kind !== 'none' ? saved.sha : undefined);
  const dating = sha ? datingRecordFor(record.id, sha, records) : undefined;
  if (!dating && !facts) return null;

  const date = async () => {
    if (busy || !facts) return;
    setBusy(true);
    setError(undefined);
    try {
      await dateLabReportWith(DEPS, record, facts);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      data-date-lab-report=""
      sx={
        variant === 'row'
          ? { py: 1.5, px: 0.5, borderBottom: '1px solid', borderColor: 'divider' }
          : { pt: 1.5, mt: 1.5, borderTop: '1px solid', borderColor: 'divider' }
      }
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <EventIcon sx={{ color: 'text.secondary', mt: 0.25 }} aria-hidden="true" />
        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
          {dating ? (
            <DatedLine dating={dating} />
          ) : (
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {t('app.plant.dated.action')}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {t('app.plant.dated.why')}
          </Typography>
          {!dating && (
            <>
              <Typography variant="caption" color="text.secondary">
                {t('app.plant.dated.seals')}
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  onClick={() => void date()}
                  {...(busy ? { 'aria-disabled': true as const, className: 'Mui-disabled' } : {})}
                  startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ minHeight: 44 }}
                >
                  {busy ? t('app.log.sealing') : t('app.plant.dated.action')}
                </Button>
              </Box>
            </>
          )}
          {error && (
            <Alert severity="error" variant="outlined">
              {error === SEALING_ELSEWHERE ? t('app.plant.dated.elsewhere') : error}
            </Alert>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};
