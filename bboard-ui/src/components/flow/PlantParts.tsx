// The plant page's two plain parts: where the plant stands, and a row per thing to do.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, ButtonBase, Paper, Stack, Typography } from '@mui/material';
import DoneIcon from '@mui/icons-material/CheckCircle';
import WaitIcon from '@mui/icons-material/RadioButtonUnchecked';
import FailIcon from '@mui/icons-material/HighlightOff';
import ChevronIcon from '@mui/icons-material/ChevronRight';
import type { StrainRecord } from '../../veilcore/records';
import type { RecordKeys } from '../../veilcore/record-keys';
import { REAL_CHAIN } from '../../veilcore/chain/config';
import { LAB_RESULTS_ENABLED } from '../../config/network';
import { useRecordDate } from '../verify/useAnchorCheck';
import { SECTIONS, type Section } from './FlowFrame';
import type { BreederReceipt, LabReceipt } from '../../veilcore/custody';
import { signerLabel } from '../../veilcore/attesters';
import type { ArrivedResult } from './LabResults';
import { savedReportRow, type SavedReport } from '../../veilcore/saved-report';
import { keyStampLine, labReceiptRow, labSentRow, recordDateRow, type RowMark } from './plant-status-words';

export { keyStampLine, labReceiptRow, labSentRow, recordDateRow };

const day = (ms?: number | string) => (ms === undefined ? '' : new Date(ms).toLocaleDateString());

const Row: React.FC<{
  done: boolean;
  /** Overrides `done`: ✓ done, ○ reported (the registry's word) or waiting, ⊗ failed. */
  mark?: RowMark;
  label: string;
  value: string;
  sub?: string;
  last?: boolean;
}> = ({ done, mark = done ? 'done' : 'wait', label, value, sub, last }) => (
  <Box
    sx={{ py: 1.25, borderBottom: last ? 0 : '1px solid', borderColor: 'divider' }}
    data-status-row={label}
    data-mark={mark}
  >
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      {mark === 'done' ? (
        <DoneIcon color="primary" titleAccess="done" />
      ) : mark === 'failed' ? (
        <FailIcon color="error" titleAccess="not confirmed" />
      ) : (
        <WaitIcon
          sx={{ color: 'text.secondary' }}
          titleAccess={mark === 'reported' ? 'reported by the registry, not checked' : 'not yet'}
        />
      )}
      <Typography
        variant="body1"
        sx={{
          flex: 1,
          fontWeight: mark === 'done' ? 700 : 500,
          color:
            mark === 'done' || mark === 'reported' ? undefined : mark === 'failed' ? 'error.main' : 'text.secondary',
        }}
      >
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
    {sub && (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 4.25, pt: 0.25 }}>
        {sub}
      </Typography>
    )}
  </Box>
);

/**
 * The breeder's "Lab report" line: saved to the plant (and whether the lab still stands
 * behind it: round 5, a report the lab replaced or withdrew is never a tick), waiting to be
 * opened, or none.
 */
export const reportRow = (
  record: StrainRecord,
  arrived?: readonly ArrivedResult[] | null,
  waiting = 0,
  saved?: SavedReport | null,
) => {
  if (record.dnaFingerprint) {
    if (saved === null) return { done: false, value: 'checking…' };
    return (saved && savedReportRow(saved)) ?? { done: true, value: record.dnaFileName ?? 'saved to this plant' };
  }
  if (waiting > 0) return { done: false, value: 'arrived, not opened' };
  if (arrived?.some((a) => a.state === 'live')) return { done: false, value: 'opened, not saved to this plant' };
  return { done: false, value: 'none yet' };
};

/**
 * The breeder's receipt line: only a receipt the lab linked to one of this plant's
 * deliveries, verified here (custody.ts breederReceipt). It names the signer plainly only
 * with a current name check, and then says what was matched, where and when
 * (attesters.ts signerLabel, round 4); never "Confirmed by a lab" (round 3).
 */
export const breederReceiptRow = (receipt: BreederReceipt | null | undefined) => {
  if (receipt === null || receipt === undefined) return { done: false, label: 'Lab receipt', value: 'checking…' };
  if (receipt.kind === 'signed')
    return { done: true, label: 'Receipt signed', value: signerLabel(receipt.by, 'by').text };
  if (receipt.kind === 'code-used') return { done: false, label: 'Lab code used', value: 'no receipt signed' };
  return { done: false, label: 'Lab receipt', value: 'not signed yet' };
};

/** Where the plant stands, in a few plain lines. One date: the public one. */
export const PlantStatus: React.FC<{
  record: StrainRecord;
  keys?: RecordKeys;
  /** The breeder's: lab reports back on this plant (null while loading). */
  arrived?: readonly ArrivedResult[] | null;
  /** The breeder's: how many of those haven't been opened on this device. */
  waiting?: number;
  /** From verified signatures (veilcore/custody.ts); null while loading. */
  receipt?: BreederReceipt | LabReceipt | null;
  /** The lab's: lab reports it sent on this delivery that still stand. */
  labSent?: number;
  /** The lab's: every lab report it sent on this delivery, withdrawn ones too. */
  labSentEver?: number;
  /** The breeder's: where the lab report saved to this plant stands (null while loading). */
  saved?: SavedReport | null;
}> = ({ record, keys, arrived, waiting, receipt, labSent, labSentEver, saved }) => {
  // The record's date, from the same look-up the "Date on Midnight" section, the History
  // and the check page use (useAnchorCheck.ts): ✓ only once this browser found the batch
  // root in the named transaction on Midnight, ○ while it is the registry's report.
  const { proof, anchor } = useRecordDate(record.recordFingerprint);

  const received = Boolean(record.receivedFrom);
  // Two different dates, never mixed (docs/identity-in-record.md): the record's own date is
  // its fingerprint's batch (which covers its key too, for a record that names one); the
  // key's date stamp, on test builds, dates the key only. Neither date is made up here:
  // the batch's comes from its inclusion proof and Midnight, the key's from its anchor.
  const dated = recordDateRow(proof, anchor);
  const batch = { done: dated.mark === 'done', mark: dated.mark, value: dated.value };
  const datedSub = (extra?: string) => [dated.sub, extra].filter(Boolean).join(' ') || undefined;

  // Round 5: one main date, the record's. The key's stamp is a second line under it with
  // one line of why, so a breeder never reads two competing "dates".
  const rows: { done: boolean; mark?: RowMark; label: string; value: string; sub?: string }[] = [
    ...(received
      ? []
      : [{ ...batch, label: 'Record dated', sub: datedSub(REAL_CHAIN ? keyStampLine(keys) : undefined) }]),
    received
      ? labReceiptRow(receipt as LabReceipt | null | undefined)
      : breederReceiptRow(receipt as BreederReceipt | null | undefined),
    ...(received
      ? LAB_RESULTS_ENABLED
        ? [labSentRow(labSent, labSentEver)]
        : []
      : [{ label: 'Lab report', ...reportRow(record, arrived, waiting, saved) }]),
    ...(REAL_CHAIN && keys
      ? [
          {
            done: Boolean(keys.backedUpAt),
            label: 'Backup checked',
            value: keys.backedUpAt ? day(keys.backedUpAt) : 'not yet',
          },
        ]
      : []),
  ];
  return (
    <Paper sx={{ px: { xs: 2, md: 2.5 }, py: 0.5 }}>
      {rows.map((r, i) => (
        <Row key={r.label} {...r} last={i === rows.length - 1} />
      ))}
    </Paper>
  );
};

/** One thing to do: the section's icon, the words, and nothing else to decode. */
export const ActionRow: React.FC<{
  section: Section;
  label: string;
  hint?: string;
  tag?: string;
  last?: boolean;
  onClick: () => void;
}> = ({ section, label, hint, tag, last, onClick }) => {
  const s = SECTIONS[section];
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        textAlign: 'left',
        minHeight: 56,
        borderBottom: last ? 0 : '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
        '&:hover, &:focus-visible': { background: 'rgba(22,32,27,0.04)' },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: '100%', px: 0.5 }}>
        <s.Icon sx={{ color: s.color }} aria-label={s.name} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            {label}
          </Typography>
          {hint && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </Box>
        {tag && (
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, px: 1, py: 0.25, borderRadius: 5, background: '#FFF1D6', color: '#6B4100' }}
          >
            {tag}
          </Typography>
        )}
        <ChevronIcon sx={{ color: 'text.secondary' }} />
      </Stack>
    </ButtonBase>
  );
};
