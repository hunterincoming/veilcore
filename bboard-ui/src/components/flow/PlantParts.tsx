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

/** Where the plant stands, in four plain lines. One date: the public one. */
export const PlantStatus: React.FC<{ record: StrainRecord; keys?: RecordKeys }> = ({ record, keys }) => {
  const [proof, setProof] = useState<ProofState>({ status: 'none' });
  useEffect(() => {
    if (!REAL_CHAIN) void proofFor(record.recordFingerprint).then(setProof);
  }, [record.recordFingerprint]);

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
    { done: stamp.done, label: 'Public date stamp', value: stamp.value },
    {
      done: Boolean(record.dnaFingerprint),
      label: 'Lab report',
      value: record.dnaFingerprint ? (record.dnaFileName ?? 'added') : 'none yet',
    },
    {
      done: Boolean(record.attestation),
      label: record.receivedFrom ? 'You confirmed receipt' : 'Confirmed by a lab',
      value: record.attestation ? 'yes' : 'not yet',
    },
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
