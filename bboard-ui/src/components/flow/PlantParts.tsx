// The plant page's two plain parts: where the plant stands, and a row per thing to do.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Box, ButtonBase, Paper, Stack, Typography } from '@mui/material';
import DoneIcon from '@mui/icons-material/CheckCircle';
import WaitIcon from '@mui/icons-material/RadioButtonUnchecked';
import ChevronIcon from '@mui/icons-material/ChevronRight';
import type { StrainRecord } from '../../veilcore/records';
import type { RecordKeys } from '../../veilcore/record-keys';
import { REAL_CHAIN } from '../../veilcore/chain/config';
import { LAB_RESULTS_ENABLED } from '../../config/network';
import { proofFor, type ProofState } from '../../veilcore/proofs';
import { SECTIONS, type Section } from './FlowFrame';
import type { BreederReceipt, LabReceipt } from '../../veilcore/custody';
import { signerLabel } from '../../veilcore/attesters';
import type { ArrivedResult } from './LabResults';

const day = (ms?: number | string) => (ms === undefined ? '' : new Date(ms).toLocaleDateString());

const Row: React.FC<{ done: boolean; label: string; value: string; last?: boolean }> = ({
  done,
  label,
  value,
  last,
}) => (
  <Stack
    direction="row"
    spacing={1.25}
    sx={{ alignItems: 'center', py: 1.25, borderBottom: last ? 0 : '1px solid', borderColor: 'divider' }}
  >
    {done ? <DoneIcon color="primary" /> : <WaitIcon sx={{ color: 'text.secondary' }} />}
    <Typography
      variant="body1"
      sx={{ flex: 1, fontWeight: done ? 700 : 500, color: done ? undefined : 'text.secondary' }}
    >
      {label}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
      {value}
    </Typography>
  </Stack>
);

const REJECTED: Record<'damaged' | 'wrong-sample', string> = {
  damaged: 'arrived damaged',
  'wrong-sample': 'wrong sample',
};

/** The breeder's "Lab report" line: saved to the plant, waiting to be opened, or none. */
const reportRow = (record: StrainRecord, arrived?: readonly ArrivedResult[] | null, waiting = 0) => {
  if (record.dnaFingerprint) return { done: true, value: record.dnaFileName ?? 'saved to this plant' };
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

/** The lab's own receipt line for a received sample: its own key's signature, nothing else. */
const labReceiptRow = (receipt: LabReceipt | null | undefined) => {
  if (receipt === null || receipt === undefined)
    return { done: false, label: 'You confirmed receipt', value: 'checking…' };
  if (receipt.kind === 'signed')
    return {
      done: receipt.linked,
      label: 'You confirmed receipt',
      value: receipt.linked ? `signed ${day(receipt.at)}` : `signed ${day(receipt.at)}, not linked to the delivery yet`,
    };
  if (receipt.kind === 'rejected') return { done: true, label: 'You turned it away', value: REJECTED[receipt.reason] };
  return { done: false, label: 'You confirmed receipt', value: 'not signed yet' };
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
}> = ({ record, keys, arrived, waiting, receipt, labSent }) => {
  const [proof, setProof] = useState<ProofState>({ status: 'none' });
  useEffect(() => {
    if (record.recordFingerprint) void proofFor(record.recordFingerprint).then(setProof);
  }, [record.recordFingerprint]);

  const received = Boolean(record.receivedFrom);
  // Two different dates, never mixed (docs/identity-in-record.md): the record's own date is
  // its fingerprint's batch (which covers its key too, for a record that names one); the
  // key's date stamp, on test builds, dates the key only. Neither date is made up here:
  // the batch's comes from its inclusion proof, the key's from its anchor.
  const batch: { done: boolean; value: string } =
    proof.status === 'anchor-reported'
      ? { done: true, value: day(proof.proof.anchor?.anchoredAt) || 'in a dated batch' }
      : proof.status === 'pending'
        ? { done: false, value: 'in a batch, waiting' }
        : { done: false, value: 'waiting for a batch' };
  const key: { done: boolean; value: string } = keys?.anchor
    ? { done: true, value: day(keys.anchor.anchoredAt) || 'done' }
    : { done: false, value: 'not yet' };

  const rows = [
    ...(received
      ? []
      : REAL_CHAIN
        ? [
            { done: key.done, label: 'Key date stamped', value: key.value },
            { done: batch.done, label: 'Record dated', value: batch.value },
          ]
        : [{ done: batch.done, label: 'Public date stamp', value: batch.value }]),
    received
      ? labReceiptRow(receipt as LabReceipt | null | undefined)
      : breederReceiptRow(receipt as BreederReceipt | null | undefined),
    ...(received
      ? LAB_RESULTS_ENABLED
        ? [
            {
              done: (labSent ?? 0) > 0,
              label: 'Lab report sent',
              value: labSent === undefined ? 'checking…' : labSent > 0 ? `${labSent} sent` : 'not yet',
            },
          ]
        : []
      : [{ label: 'Lab report', ...reportRow(record, arrived, waiting) }]),
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
