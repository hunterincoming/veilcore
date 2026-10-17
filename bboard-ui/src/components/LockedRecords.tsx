// Records and agreements this browser can't open (sealed records, CONTRACT.md #11): sealed
// with a vault key it doesn't have. Shown plainly by the name anyone can see, with the one way back (the
// backup file that has the key) and the one thing a locked record allows: deleting it.
// They can't be edited or sent, and a save never sends them back (api-store.ts).
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LockIcon from '@mui/icons-material/LockOutlined';
import { abandonLostKey, adoptOlderCopy, deleteLockedRecord, useSealedView } from '../veilcore/records';
import { deleteLockedLicense, useLockedLicenses } from '../veilcore/licenses';
import type { LockedRow } from '../veilcore/api-store';
import { useT } from '../i18n/app';
import type { Translator } from '../i18n/translate';

/**
 * What a locked record needs, in words: a backup saved after the key that locked it was made,
 * when this browser knows that date (it made the key, api-store.ts LockedRow.since). Never a
 * received or corrected date: a backup from after one of those can still predate the key
 * (review L8).
 */
export const lockedWords = (rows: readonly LockedRow[], tr: Translator): string => {
  const dates = rows.map((r) => r.since).filter((d): d is number => d !== undefined);
  return dates.length
    ? tr.t('app.sealed.locked.text', { date: tr.date(Math.min(...dates)) })
    : tr.t('app.sealed.locked.textNoDate');
};

const LockedRowLine: React.FC<{
  row: LockedRow;
  name: string;
  confirm: string;
  remove: (id: string) => Promise<{ ok: true } | { error: string }>;
  kind: 'record' | 'agreement';
  note?: string;
  /** For an older copy (L2): take it as the record. */
  useIt?: () => void;
}> = ({ row, name, confirm, remove: removeRow, kind, note, useIt }) => {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const remove = async () => {
    if (!window.confirm(confirm)) return;
    setBusy(true);
    setProblem(undefined);
    const out = await removeRow(row.id);
    setBusy(false);
    if ('error' in out) setProblem(t('app.sealed.locked.deleteFailed', { error: out.error }));
  };
  return (
    <Box {...(kind === 'record' ? { 'data-locked-record': row.id } : { 'data-locked-agreement': row.id })}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {row.id}
          </Typography>
          {note && (
            <Typography variant="body2" data-older-copy="">
              {note}
            </Typography>
          )}
        </Box>
        <Stack direction="row" sx={{ flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {useIt && (
            <Button variant="outlined" onClick={useIt} disabled={busy} sx={{ minHeight: 44 }} data-use-older="">
              {t('app.sealed.older.use')}
            </Button>
          )}
          <Button color="inherit" onClick={() => void remove()} disabled={busy} sx={{ minHeight: 44 }}>
            {t('app.sealed.locked.delete')}
          </Button>
        </Stack>
      </Stack>
      {problem && (
        <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
          {problem}
        </Alert>
      )}
    </Box>
  );
};

/** Home's list of locked records, or nothing when there are none. */
export const LockedRecords: React.FC<{ only?: string }> = ({ only }) => {
  const { locked } = useSealedView();
  const tr = useT();
  const { t, tp } = tr;
  const rows = only ? locked.filter((l) => l.id === only) : locked;
  if (rows.length === 0) return null;
  // Rows sealed with a key this browser lacks, and rows the registry sent an older copy of
  // (CONTRACT.md #20), which this browser has no newer copy of to show.
  const keyless = rows.filter((r) => !r.older);
  const onlyOlder = keyless.length === 0;
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 } }} data-locked-records="">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <LockIcon aria-hidden="true" />
        <Typography variant="subtitle1" component={only ? 'h1' : 'h2'} sx={{ fontWeight: 700 }}>
          {only
            ? onlyOlder
              ? t('app.sealed.older.pageTitle')
              : t('app.sealed.locked.pageTitle')
            : tp('app.sealed.locked.title', rows.length)}
        </Typography>
      </Stack>
      {keyless.length > 0 && (
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          {lockedWords(keyless, tr)}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t('app.sealed.locked.cantChange')}
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 1.5 }}>
        {rows.map((r) => {
          const name = r.strainName || t('app.sealed.locked.unnamed');
          return (
            <LockedRowLine
              key={r.id}
              row={r}
              name={name}
              // An older copy is the only copy on the server (L2): Delete says so.
              confirm={t(r.older ? 'app.sealed.older.deleteConfirm' : 'app.sealed.locked.deleteConfirm', { name })}
              remove={deleteLockedRecord}
              kind="record"
              {...(r.older ? { note: t('app.sealed.older'), useIt: () => void adoptOlderCopy(r.id) } : {})}
            />
          );
        })}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button component={RouterLink} to="/restore" variant="outlined" sx={{ minHeight: 44 }}>
          {t('app.sealed.locked.restore')}
        </Button>
        {keyless.some((r) => r.kid) && <LostKeyButton />}
      </Stack>
    </Paper>
  );
};

/**
 * "I don't have that backup" (round 3, L1): without it, these rows can never be opened, and
 * while they are on VeilCore no new key is accepted for this holder, so nothing new saves.
 * Said plainly, confirmed, then the rows are deleted and a new key is made.
 */
const LostKeyButton: React.FC = () => {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string>();
  const go = async () => {
    if (!window.confirm(t('app.sealed.lost.confirm'))) return;
    setBusy(true);
    setSaid(undefined);
    const out = await abandonLostKey();
    setBusy(false);
    setSaid('error' in out ? t('app.sealed.lost.failed', { error: out.error }) : t('app.sealed.lost.done'));
  };
  return (
    <Box>
      <Button color="inherit" onClick={() => void go()} disabled={busy} sx={{ minHeight: 44 }} data-lost-key="">
        {t('app.sealed.lost.button')}
      </Button>
      {said && (
        <Typography variant="body2" role="status" sx={{ mt: 0.5 }}>
          {said}
        </Typography>
      )}
    </Box>
  );
};

/**
 * Agreements (licenses, lab transfers, breeder shares) this browser can't open: sealed with
 * a vault key it doesn't have. Like locked records, shown plainly, deletable, not editable;
 * only their id is known, so that is what is shown. Nothing when there are none.
 */
export const LockedAgreements: React.FC = () => {
  const rows = useLockedLicenses();
  const tr = useT();
  const { t, tp } = tr;
  if (rows.length === 0) return null;
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 } }} data-locked-agreements="">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <LockIcon aria-hidden="true" />
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
          {tp('app.sealed.lockedAgreements.title', rows.length)}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        {t('app.sealed.lockedAgreements.text')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t('app.sealed.lockedAgreements.cantChange')}
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 1.5 }}>
        {rows.map((r) => (
          <LockedRowLine
            key={r.id}
            row={r}
            name={t('app.sealed.lockedAgreements.name')}
            confirm={t('app.sealed.lockedAgreements.deleteConfirm', { id: r.id })}
            remove={deleteLockedLicense}
            kind="agreement"
          />
        ))}
      </Stack>
      <Button component={RouterLink} to="/restore" variant="outlined" sx={{ minHeight: 44 }}>
        {t('app.sealed.locked.restore')}
      </Button>
    </Paper>
  );
};

/** What the last load said beyond the records themselves: a cut-short set, rows that couldn't be read. */
export const LoadNoticeBar: React.FC = () => {
  const { notice } = useSealedView();
  const { t, tp } = useT();
  if (!notice.truncated && notice.unreadable === 0 && !notice.olderKept) return null;
  return (
    <Alert severity="warning" variant="outlined" data-load-notice="">
      {[
        notice.truncated ? t('app.sealed.truncated') : '',
        notice.unreadable ? tp('app.sealed.unreadable', notice.unreadable) : '',
        notice.olderKept ? tp('app.sealed.olderKept', notice.olderKept) : '',
      ]
        .filter(Boolean)
        .join(' ')}
    </Alert>
  );
};
