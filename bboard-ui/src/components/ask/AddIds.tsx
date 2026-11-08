// "Add IDs" for a litter or a calf crop saved without them (users' review, problem 3). Driven by
// the records, not by a job, so the reminder lasts until the IDs exist: microchips go in at 6 to 8
// weeks, long after a job is deleted. The young of one dam born the same day are one group; the
// person pastes a column (from a scanner or a spreadsheet), one ID per young in order, and each is
// saved as a correction (records.ts issueCorrection): a new record that replaces the old, which
// stays on file. Nothing is saved until "Save". Young that already have an ID are listed with it,
// and a column that doesn't line up with them is refused, never guessed at (ask-job/ids.ts).
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
import type { AppKey } from '../../i18n/app/en';
import { correctionWaitsForBackup, issueCorrection } from '../../veilcore/records';
import { assignIds, idsOf, type Litter } from '../../ask-job/ids';

export { littersWithoutIds, type Litter } from '../../ask-job/ids';

export const AddIds: React.FC<{ litter: Litter; onClose: () => void }> = ({ litter, onClose }) => {
  const tr = useT();
  const { t, tp } = tr;
  const [scheme, setScheme] = useState(litter.young[0]?.animal?.idScheme ?? '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  // Saved in this box already: never saved twice if a later one fails.
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set());
  const ids = idsOf(text);
  const plan = ids.length ? assignIds(litter, ids) : { pairs: [] };
  const pairs = 'pairs' in plan ? plan.pairs : [];
  const refusal = 'why' in plan ? plan : undefined;
  const newId = new Map(pairs.map(([r, id]) => [r.id, id] as const));
  const waits = litter.young.some((r) => correctionWaitsForBackup(r.id));
  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const done = new Set(saved);
      for (const [r, id] of pairs) {
        if (done.has(r.id)) continue;
        await issueCorrection(
          r.id,
          {
            refId: id,
            animal: {
              breed: r.animal?.breed ?? '',
              herd: r.animal?.herd ?? '',
              sex: r.animal?.sex ?? 'unknown',
              idScheme: scheme.trim(),
            },
          },
          t('app.job.ids.reason'),
        );
        done.add(r.id);
        setSaved(new Set(done));
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
      <DialogTitle>{tp('app.job.ids.title', litter.missing.length, { dam: litter.dam })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">{tr.date(`${litter.born}T12:00:00`)}</Typography>
          <Box component="ol" sx={{ m: 0, pl: 3 }}>
            {litter.young.map((r) => (
              <Typography component="li" variant="body2" key={r.id} data-add-ids-row="">
                {r.strainName}
                {r.refId?.trim()
                  ? ` · ${t('app.job.ids.already', { id: r.refId.trim() })}`
                  : newId.has(r.id)
                    ? ` · ${newId.get(r.id)}`
                    : ''}
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
            helperText={t('app.job.answer.idsCount', { n: String(ids.length), count: String(litter.missing.length) })}
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
          {refusal && (
            <Alert severity="warning" variant="outlined" role="alert" data-add-ids-refused={refusal.why}>
              {t(`app.job.ids.no.${refusal.why}` as AppKey, {
                ...('id' in refusal ? { id: refusal.id } : {}),
                ...('name' in refusal ? { name: refusal.name } : {}),
                ...('typed' in refusal ? { typed: refusal.typed } : {}),
                ...('n' in refusal ? { n: String(refusal.n), count: String(refusal.count) } : {}),
              })}
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
          disabled={busy || waits || !pairs.length || !!refusal || !scheme.trim()}
          onClick={() => void save()}
          sx={{ minHeight: 44 }}
          data-add-ids-save=""
        >
          {tp('app.job.ids.save', pairs.length)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
