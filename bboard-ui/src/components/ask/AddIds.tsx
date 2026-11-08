// "Add IDs" for a litter or a calf crop saved without them (users' review, problem 3). Driven by
// the records, not by a job, so the reminder lasts until the IDs exist: microchips go in at 6 to 8
// weeks, long after a job is deleted. The young of one dam born the same day are one group; the
// person pastes a column (from a scanner or a spreadsheet), one ID per young in order, and each is
// saved as a correction (records.ts issueCorrection): a new record that replaces the old, which
// stays on file. Nothing is saved until "Save".
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useT } from '../../i18n/app';
import { correctionWaitsForBackup, issueCorrection, type StrainRecord } from '../../veilcore/records';
import { isAnimal } from '../../veilcore/animal-profile';
import { isReceivedRecord } from '../../ask/hint';

/** Only young made in this long are asked about. */
const RECENT_DAYS = 180;

export type Litter = {
  readonly key: string;
  readonly dam: string;
  readonly born: string;
  readonly young: StrainRecord[];
};

/** The person's own young with no ID yet, by dam and birth date, newest first. */
export const littersWithoutIds = (records: readonly StrainRecord[], today: string): Litter[] => {
  const since = new Date(`${today}T12:00:00`);
  since.setDate(since.getDate() - RECENT_DAYS);
  const from = since.toISOString().slice(0, 10);
  const groups = new Map<string, Litter>();
  for (const r of records) {
    if (!isAnimal(r) || isReceivedRecord(r) || r.refId?.trim() || r.supersededBy) continue;
    const dam = r.parents?.find((p) => p.role === 'dam');
    if (!dam || !r.dateCreated || r.dateCreated < from) continue;
    const key = `${dam.recordId ?? dam.name}|${r.dateCreated}`;
    const g = groups.get(key) ?? { key, dam: dam.name || dam.individualId || '', born: r.dateCreated, young: [] };
    g.young.push(r);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => ({
      ...g,
      young: [...g.young].sort((a, b) => a.strainName.localeCompare(b.strainName, undefined, { numeric: true })),
    }))
    .sort((a, b) => b.born.localeCompare(a.born));
};

export const AddIds: React.FC<{ litter: Litter; onClose: () => void }> = ({ litter, onClose }) => {
  const tr = useT();
  const { t, tp } = tr;
  const [scheme, setScheme] = useState(litter.young[0]?.animal?.idScheme ?? '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(0);
  const ids = text
    .split(/\r?\n|\t|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, litter.young.length);
  const waits = litter.young.some((r) => correctionWaitsForBackup(r.id));
  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      for (const [i, r] of litter.young.entries()) {
        if (i < done || !ids[i]) continue;
        await issueCorrection(
          r.id,
          {
            refId: ids[i],
            animal: {
              breed: r.animal?.breed ?? '',
              herd: r.animal?.herd ?? '',
              sex: r.animal?.sex ?? 'unknown',
              idScheme: scheme.trim(),
            },
          },
          t('app.job.ids.reason'),
        );
        setDone(i + 1);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth data-add-ids="">
      <DialogTitle>{tp('app.job.ids.title', litter.young.length, { dam: litter.dam })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">{tr.date(`${litter.born}T12:00:00`)}</Typography>
          <Box component="ol" sx={{ m: 0, pl: 3 }}>
            {litter.young.map((r, i) => (
              <Typography component="li" variant="body2" key={r.id}>
                {r.strainName}
                {ids[i] ? ` · ${ids[i]}` : ''}
              </Typography>
            ))}
          </Box>
          <TextField
            label={t('app.animal.idScheme')}
            value={scheme}
            onChange={(e) => setScheme(e.target.value.slice(0, 200))}
          />
          <TextField
            label={t('app.job.answer.ids')}
            multiline
            minRows={4}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 20_000))}
            helperText={t('app.job.answer.idsCount', { n: String(ids.length), count: String(litter.young.length) })}
            slotProps={{ htmlInput: { 'data-add-ids-paste': '' } }}
          />
          <Alert severity="info" variant="outlined">
            {t('app.job.ids.permanent')}
          </Alert>
          {waits && (
            <Alert severity="warning" variant="outlined">
              {t('app.sealed.correctBackupFirst')}
            </Alert>
          )}
          {error && (
            <Alert severity="error" variant="outlined" role="alert">
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} sx={{ minHeight: 44 }}>
          {t('app.common.cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={busy || waits || !ids.length || (!!ids.length && !scheme.trim())}
          onClick={() => void save()}
          sx={{ minHeight: 44 }}
          data-add-ids-save=""
        >
          {tp('app.job.ids.save', ids.length)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
