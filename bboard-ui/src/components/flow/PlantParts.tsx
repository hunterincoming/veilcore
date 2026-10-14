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
import { proofFor, type ProofState } from '../../veilcore/proofs';
import { SECTIONS, type Section } from './FlowFrame';
import type { BreederReceipt, LabReceipt } from '../../veilcore/custody';
import { signerName } from '../../veilcore/custody';
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

/** The breeder's receipt line: only a lab's verified signature says "Confirmed by a lab". */
const breederReceiptRow = (receipt: BreederReceipt | null | undefined) => {
  if (receipt === null || receipt === undefined)
    return { done: false, label: 'Confirmed by a lab', value: 'checking…' };
  if (receipt.kind === 'signed') {
    const { name, checked } = signerName(receipt.by);
    const shown = checked ? name : (receipt.by.registeredAs?.displayName ?? receipt.by.attester.displayName);
    return {
      done: true,
      label: 'Confirmed by a lab',
      value: shown ? `signed by ${shown}${checked ? '' : ' (name not checked)'}` : 'signed by an unnamed key',
    };
  }
  if (receipt.kind === 'code-used') {
    return { done: false, label: 'Code used', value: 'someone took delivery (not signed)' };
  }
  return { done: false, label: 'Confirmed by a lab', value: 'not yet' };
};

/** The lab's own receipt line for a received sample: its own key's signature, nothing else. */
const labReceiptRow = (receipt: LabReceipt | null | undefined) => {
  if (receipt === null || receipt === undefined)
    return { done: false, label: 'You confirmed receipt', value: 'checking…' };
  if (receipt.kind === 'signed')
    return { done: true, label: 'You confirmed receipt', value: `signed ${day(receipt.at)}` };
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
    if (!REAL_CHAIN) void proofFor(record.recordFingerprint).then(setProof);
  }, [record.recordFingerprint]);

  const received = Boolean(record.receivedFrom);
  const stamp: { done: boolean; value: string } = REAL_CHAIN
    ? keys?.anchor
      ? { done: true, value: day(keys.anchor.anchoredAt) || 'done' }
      : { done: false, value: 'not yet' }
    : proof.status === 'anchor-reported'
      ? { done: true, value: day(proof.proof.anchor?.anchoredAt) || 'in a dated batch' }
      : proof.status === 'pending'
        ? { done: false, value: 'in a batch, waiting' }
        : { done: false, value: 'waiting for a batch' };

  const rows = [
    ...(received ? [] : [{ done: stamp.done, label: 'Public date stamp', value: stamp.value }]),
    received
      ? labReceiptRow(receipt as LabReceipt | null | undefined)
      : breederReceiptRow(receipt as BreederReceipt | null | undefined),
    received
      ? {
          done: (labSent ?? 0) > 0,
          label: 'Lab report sent',
          value: labSent === undefined ? 'checking…' : labSent > 0 ? `${labSent} sent` : 'not yet',
        }
      : { label: 'Lab report', ...reportRow(record, arrived, waiting) },
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
