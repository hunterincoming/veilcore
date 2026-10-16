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
import { SECTIONS, useSectionName, type Section } from './FlowFrame';
import { WASH } from '../../config/theme';
import { custodyHeadline, type BreederReceipt, type LabReceipt } from '../../veilcore/custody';
import { signerLabel } from '../../veilcore/attesters';
import type { ArrivedResult } from './LabResults';
import { savedReportRow, type SavedReport } from '../../veilcore/saved-report';
import { keyStampLine, labReceiptRow, labSentRow, recordDateRow, type RowMark } from './plant-status-words';
import { useT } from '../../i18n/app';
import { enT, type Translator } from '../../i18n/translate';

export { keyStampLine, labReceiptRow, labSentRow, recordDateRow };

const Row: React.FC<{
  done: boolean;
  /** Overrides `done`: ✓ done, ○ reported (the registry's word) or waiting, ⊗ failed. */
  mark?: RowMark;
  /** The row's English label, in every language: data-status-row, for tests and support. */
  id: string;
  label: string;
  value: string;
  sub?: string;
  /** Kept for callers; rows no longer draw a rule, so the last one needs nothing different. */
  last?: boolean;
}> = ({ done, mark = done ? 'done' : 'wait', id, label, value, sub }) => {
  const { t } = useT();
  return (
    <Box sx={{ py: 1.25 }} data-status-row={id} data-mark={mark}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        {mark === 'done' ? (
          <DoneIcon color="primary" titleAccess={t('app.plant.mark.done')} />
        ) : mark === 'failed' ? (
          <FailIcon color="error" titleAccess={t('app.plant.mark.failed')} />
        ) : (
          <WaitIcon
            sx={{ color: 'text.secondary' }}
            titleAccess={mark === 'reported' ? t('app.plant.mark.reported') : t('app.plant.mark.wait')}
          />
        )}
        {/* The label keeps its own width (up to just over half the row) and the value wraps
            beside it: a long value in any language never squeezes the label to a letter a line. */}
        <Typography
          variant="body1"
          className="vc-short"
          sx={{
            flex: '1 0 auto',
            maxWidth: '55%',
            fontWeight: mark === 'done' ? 700 : 500,
            color:
              mark === 'done' || mark === 'reported' ? undefined : mark === 'failed' ? 'error.main' : 'text.secondary',
          }}
        >
          {label}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flex: '0 1 auto', minWidth: 0, textAlign: 'right', overflowWrap: 'anywhere' }}
        >
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
};

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
  tr: Translator = enT,
) => {
  if (record.dnaFingerprint) {
    if (saved === null) return { done: false, value: tr.t('app.plant.checking') };
    return (
      (saved && savedReportRow(saved, tr)) ?? {
        done: true,
        value: record.dnaFileName ?? tr.t('app.plant.savedToPlant'),
      }
    );
  }
  if (waiting > 0) return { done: false, value: tr.t('app.plant.arrivedNotOpened') };
  if (arrived?.some((a) => a.state === 'live')) return { done: false, value: tr.t('app.plant.openedNotSaved') };
  return { done: false, value: tr.t('app.plant.noneYet') };
};

/**
 * The breeder's receipt line: only a receipt the lab linked to one of this plant's
 * deliveries, verified here (custody.ts breederReceipt). It names the signer plainly only
 * with a current name check, and then says what was matched, where and when
 * (attesters.ts signerLabel, round 4); never "Confirmed by a lab" (round 3). Under it, the
 * sample's chain of custody when the delivery has one: where what arrived differs from what
 * was sent, plainly, or that it matches (custody.ts custodyHeadline).
 */
export const breederReceiptRow = (
  receipt: BreederReceipt | null | undefined,
  tr: Translator = enT,
): { done: boolean; id: string; label: string; value: string; sub?: string } => {
  if (receipt === null || receipt === undefined)
    return { done: false, id: 'Lab receipt', label: tr.t('app.plant.labReceipt'), value: tr.t('app.plant.checking') };
  if (receipt.kind === 'signed') {
    const sub = custodyHeadline(receipt.custody, tr);
    return {
      done: true,
      id: 'Receipt signed',
      label: tr.t('app.plant.receiptSigned'),
      value: signerLabel(receipt.by, 'by', undefined, tr).text,
      ...(sub ? { sub } : {}),
    };
  }
  if (receipt.kind === 'code-used')
    return {
      done: false,
      id: 'Lab code used',
      label: tr.t('app.plant.labCodeUsed'),
      value: tr.t('app.plant.noReceiptSigned'),
    };
  return { done: false, id: 'Lab receipt', label: tr.t('app.plant.labReceipt'), value: tr.t('app.plant.notSignedYet') };
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
  const tr = useT();
  const { t } = tr;

  const received = Boolean(record.receivedFrom);
  // Two different dates, never mixed (docs/identity-in-record.md): the record's own date is
  // its fingerprint's batch (which covers its key too, for a record that names one); the
  // key's date stamp, on test builds, dates the key only. Neither date is made up here:
  // the batch's comes from its inclusion proof and Midnight, the key's from its anchor.
  const dated = recordDateRow(proof, anchor, tr);
  const batch = { done: dated.mark === 'done', mark: dated.mark, value: dated.value };
  const datedSub = (extra?: string) => [dated.sub, extra].filter(Boolean).join(' ') || undefined;

  // Round 5: one main date, the record's. The key's stamp is a second line under it with
  // one line of why, so a breeder never reads two competing "dates".
  const rows: { done: boolean; mark?: RowMark; id: string; label: string; value: string; sub?: string }[] = [
    ...(received
      ? []
      : [
          {
            ...batch,
            id: 'Record dated',
            label: t('app.plant.recordDated'),
            sub: datedSub(REAL_CHAIN ? keyStampLine(keys, tr) : undefined),
          },
        ]),
    received
      ? labReceiptRow(receipt as LabReceipt | null | undefined, tr)
      : breederReceiptRow(receipt as BreederReceipt | null | undefined, tr),
    ...(received
      ? LAB_RESULTS_ENABLED
        ? [labSentRow(labSent, labSentEver, tr)]
        : []
      : [{ id: 'Lab report', label: t('app.plant.labReport'), ...reportRow(record, arrived, waiting, saved, tr) }]),
    ...(REAL_CHAIN && keys
      ? [
          {
            done: Boolean(keys.backedUpAt),
            id: 'Backup checked',
            label: t('app.plant.backupChecked'),
            value: keys.backedUpAt ? tr.date(keys.backedUpAt) : t('app.plant.notYet'),
          },
        ]
      : []),
  ];
  return (
    <Paper sx={{ px: { xs: 2, md: 2.5 }, py: { xs: 1, md: 1.25 } }}>
      {rows.map((r, i) => (
        <Row key={r.id} {...r} last={i === rows.length - 1} />
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
}> = ({ section, label, hint, tag, onClick }) => {
  const s = SECTIONS[section];
  const name = useSectionName(section);
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        textAlign: 'left',
        minHeight: 56,
        // Rows are told apart by their height and icon, not by a rule under each one.
        borderRadius: 2,
        px: { xs: 1, md: 1.25 },
        '&:hover, &.Mui-focusVisible': { background: WASH },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: '100%', px: 0.5 }}>
        <s.Icon sx={{ color: s.color }} aria-label={name} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" className="vc-short" sx={{ fontWeight: 700 }}>
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
