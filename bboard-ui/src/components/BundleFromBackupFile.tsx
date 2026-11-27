// "Make an evidence bundle from a backup file" (review 7 of PR #233). With VeilCore's registry out
// of reach, the bundle is made straight from the holder's backup file: the file is read in memory
// (with its password when it has one), each date proof in it is checked for form, nothing is kept
// in this browser, and every page of the bundle says it comes from that backup file, not
// confirmed with VeilCore's registry (veilcore/stamps.ts evidenceFromFile). Offered in the
// evidence bundle dialog when the registry can't be reached, and on the restore page under
// Technical details.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useT } from '../i18n/app';
import { errorWords } from '../i18n/error-words';
import { allRecords, type StrainRecord } from '../veilcore/records';
import { BackupNeedsPassword, readBackupStamps } from '../veilcore/backup';
import { fileCovers, type BackupFileStamps } from '../veilcore/stamps';
import { recordTitle } from '../veilcore/animal-profile';
import { BackupPasswordAsk } from './flow/BackupStep';

type Made = { ok: true; name: string } | { error: string };

export const BundleFromBackupFile: React.FC<{
  /** The record it is for (the evidence bundle dialog). Without it, the holder picks one of the file's records held here. */
  readonly record?: StrainRecord;
  /** How the bundle is made: the dialog passes its own, with the holder's ticked choices. */
  readonly make?: (record: StrainRecord, file: BackupFileStamps) => Promise<Made>;
}> = ({ record, make }) => {
  const tr = useT();
  const { t } = tr;
  const pick = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ stamps: BackupFileStamps; covers: Set<string> }>();
  const [waiting, setWaiting] = useState<File>();
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string>();
  const [chosen, setChosen] = useState('');

  const picked = async (f: File, password?: string) => {
    setProblem(undefined);
    setDone(undefined);
    setFile(undefined);
    try {
      const stamps = await readBackupStamps(f, password);
      setWaiting(undefined);
      setFile({ stamps, covers: fileCovers(stamps) });
    } catch (e) {
      if (e instanceof BackupNeedsPassword) setWaiting(f);
      else setProblem(errorWords(e, tr));
    }
  };

  const held = file
    ? record
      ? [record]
      : allRecords().filter((r) => !!r.recordFingerprint && file.covers.has(r.recordFingerprint))
    : [];
  const target = record ?? held.find((r) => r.id === chosen) ?? held[0];
  const covered = !!target?.recordFingerprint && !!file?.covers.has(target.recordFingerprint);

  const run = async () => {
    if (!file || !target) return;
    setBusy(true);
    setProblem(undefined);
    setDone(undefined);
    try {
      // Loaded when used: the bundle code waits for the fingerprint circuit (load-split.test.ts).
      const { downloadEvidenceBundle, NOTHING_IN_FILE } = await import('../veilcore/evidence/bundle');
      const out = make
        ? await make(target, file.stamps)
        : await downloadEvidenceBundle(target, undefined, { includeKey: false, fromBackupFile: file.stamps });
      if ('error' in out)
        setProblem(out.error === NOTHING_IN_FILE ? t('app.filebundle.noneForRecord') : errorWords(out.error, tr));
      else setDone(out.name);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1} data-from-file="">
      <Typography variant="body2" color="text.secondary" data-from-file-what="">
        {t('app.filebundle.what')}
      </Typography>
      <Button
        size="small"
        variant="outlined"
        onClick={() => pick.current?.click()}
        sx={{ alignSelf: 'flex-start', minHeight: 44 }}
        data-from-file-pick=""
      >
        {t('app.filebundle.pick')}
      </Button>
      <input
        ref={pick}
        type="file"
        accept="application/json,.json,text/plain,.txt"
        hidden
        aria-label={t('app.filebundle.pick')}
        data-from-file-input=""
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void picked(f);
        }}
      />
      {waiting && <BackupPasswordAsk busy={busy} onOpen={(password) => void picked(waiting, password)} />}
      {file && !record && held.length === 0 && (
        <Alert severity="info" variant="outlined" data-from-file-none-here="">
          {t('app.filebundle.noneHere')}
        </Alert>
      )}
      {file && record && !covered && (
        <Alert severity="info" variant="outlined" data-from-file-none="">
          {t('app.filebundle.noneForRecord')}
        </Alert>
      )}
      {file && !record && held.length > 1 && (
        <TextField
          select
          size="small"
          label={t('app.filebundle.which')}
          value={target?.id ?? ''}
          onChange={(e) => setChosen(e.target.value)}
          slotProps={{ htmlInput: { 'data-from-file-which': '' } }}
        >
          {held.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {recordTitle(r)}
            </MenuItem>
          ))}
        </TextField>
      )}
      {file && target && covered && (
        <Button
          variant="contained"
          disableElevation
          disabled={busy}
          onClick={() => void run()}
          sx={{ alignSelf: 'flex-start', minHeight: 44 }}
          data-from-file-make=""
        >
          {held.length === 1 && !record
            ? t('app.filebundle.makeFor', { name: recordTitle(target) })
            : t('app.filebundle.make')}
        </Button>
      )}
      {problem && (
        <Alert severity="warning" variant="outlined" data-from-file-problem="">
          {problem}
        </Alert>
      )}
      {done && (
        <Alert severity="success" variant="outlined" data-from-file-done="">
          {t('app.plant.bundle.downloaded', { name: done })}
        </Alert>
      )}
    </Stack>
  );
};
