// The single most useful thing to do with this record right now.
//
// A record page that presents every panel equally makes the reader do the work of
// deciding what matters. Computing one primary action from the record's state is what
// turns a screen that reports into a screen that helps.
//
// Research on progressive disclosure is consistent here: deferring secondary options
// measurably speeds up the primary task, provided the deferred things stay findable.
// So this never hides anything — it puts one action first.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import type { RecordKeys } from '../veilcore/record-keys';
import { REAL_CHAIN } from '../veilcore/chain/config';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import EventIcon from '@mui/icons-material/EventAvailableOutlined';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import SendIcon from '@mui/icons-material/SendOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import BadgeIcon from '@mui/icons-material/VerifiedUserOutlined';
import type { StrainRecord } from '../veilcore/records';
import type { BreederReceipt, LabReceipt } from '../veilcore/custody';
import { LAB_RESULTS_ENABLED } from '../config/network';
import { loadAttester } from '../veilcore/attester-keys';
import { SendToLab } from './SendToLab';
import { OPEN_SIGNING_KEY_EVENT } from './AttesterSetup';
import type { ArrivedResult } from './flow/LabResults';
import { WASH } from '../config/theme';
import type { SavedReport } from '../veilcore/saved-report';
import { useNavigate } from 'react-router-dom';
import { isLabReportRecord } from './stage/lab-report-notes';
import { DatingNameField, dateErrorWords, useDateReport } from './stage/DateLabReport';
import { useRecordT } from '../i18n/app';
import { recipientName } from '../veilcore/transfers';

type Step = {
  /** Some steps render their own control rather than a plain button. */
  custom?: React.ReactNode;
  title: string;
  /** What this gets them. Never a description of the state they can already see. */
  why: string;
  action?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  /** Ways to do it, under the why, when there is more than one. */
  paths?: React.ReactNode;
};

export const NextStep: React.FC<{
  record: StrainRecord;
  onPairDna: () => void;
  onAgreement: () => void;
  /** This record's keys in this browser, on builds that use them (test networks). */
  keys?: RecordKeys;
  onBackup?: () => void;
  onStamp?: () => void;
  /** The breeder's: lab reports back on this plant, not yet opened on this device. */
  waiting?: readonly ArrivedResult[];
  onOpenResult?: (resultId: string) => void;
  /** From verified signatures only (veilcore/custody.ts). null or absent while loading. */
  receipt?: BreederReceipt | LabReceipt | null;
  /** The lab's: lab reports it sent on this delivery that still stand. */
  labSent?: number;
  /** The lab's: every lab report it sent on this delivery, withdrawn ones too. */
  labSentEver?: number;
  onSendResults?: () => void;
  onSignReceipt?: () => void;
  /** A lab-only account: no breeder actions (send to a lab, agreements). */
  labOnly?: boolean;
  /** The breeder's: where the lab report saved to this plant stands (veilcore/saved-report.ts). */
  saved?: SavedReport | null;
}> = ({
  record,
  onPairDna,
  onAgreement,
  keys,
  onBackup,
  onStamp,
  waiting,
  onOpenResult,
  receipt,
  labSent,
  labSentEver,
  onSendResults,
  onSignReceipt,
  labOnly,
  saved,
}) => {
  let step: Step | null;
  const navigate = useNavigate();
  const tr = useRecordT(record);
  const { t } = tr;
  // Dating the saved DNA report: the step after saving one (components/stage/DateLabReport.tsx).
  const dateReport = useDateReport(record, saved);
  // A record that dates a lab report (components/stage/lab-report-date.ts) is not a plant:
  // no lab, agreement or key date stamp for it. Its batch is what dates the report.
  const datesReport = isLabReportRecord(record);
  const reportPlant = datesReport ? record.parents?.[0] : undefined;

  // A record that arrived through a delivery is the lab's (or the next holder's). Telling
  // them to "send it to a lab for confirmation" is telling the lab to send it to a lab —
  // the page has to know which side of the delivery the reader is on.
  const isReceived = Boolean(record.receivedFrom);
  const firstWaiting = waiting?.[0];

  // Keys that live only in this browser come first: everything else can wait, a lost
  // browser can't be undone. Then the date stamp, which the logging flow normally did.
  if (REAL_CHAIN && keys && !keys.backedUpAt && onBackup) {
    step = {
      title: t('app.plant.next.backup.title'),
      why: t('app.plant.next.backup.why'),
      action: t('app.plant.next.backup.action'),
      icon: <SaveIcon />,
      onClick: onBackup,
    };
  } else if (datesReport) {
    step = {
      title: t('app.plant.next.dates.title'),
      why: t('app.plant.next.dates.why'),
      ...(reportPlant?.recordId
        ? {
            action: t('app.plant.next.backTo', { name: reportPlant.name }),
            icon: <ScienceIcon />,
            onClick: () => navigate(`/record/${reportPlant.recordId ?? ''}`),
          }
        : {}),
    };
  } else if (REAL_CHAIN && !isReceived && !keys?.anchor && onStamp) {
    step = {
      title: t('app.plant.next.stamp.title'),
      // The date stamp here dates the plant's key (what proving uses), not its details.
      why: t('app.plant.next.stamp.why'),
      action: t('app.plant.next.stamp.action'),
      icon: <VerifiedIcon />,
      onClick: onStamp,
    };
  } else if (isReceived) {
    const lab = receipt as LabReceipt | null | undefined;
    if (!lab) {
      // Still checking the lab's own signature: say nothing rather than the wrong thing.
      step = null;
    } else if (lab.kind === 'rejected') {
      step = {
        title: t('app.plant.next.rejected.title'),
        why: t('app.plant.next.rejected.why'),
      };
    } else if (lab.kind === 'not-signed' && !loadAttester()) {
      step = {
        title: t('app.plant.next.setup.title'),
        why: t('app.plant.next.setup.why'),
        action: t('app.plant.next.setup.action'),
        icon: <BadgeIcon />,
        onClick: () => window.dispatchEvent(new Event(OPEN_SIGNING_KEY_EVENT)),
      };
    } else if (lab.kind === 'not-signed' && onSignReceipt) {
      step = {
        title: t('app.plant.next.sign.title'),
        why: t('app.plant.next.sign.why'),
        action: t('app.plant.next.sign.action'),
        icon: <VerifiedIcon />,
        onClick: onSignReceipt,
      };
    } else if (lab.kind === 'signed' && !lab.linked && onSignReceipt) {
      step = {
        title: t('app.plant.next.link.title'),
        why: t('app.plant.next.link.why'),
        action: t('app.plant.next.link.action'),
        icon: <VerifiedIcon />,
        onClick: onSignReceipt,
      };
    } else if (!LAB_RESULTS_ENABLED) {
      step = {
        title: t('app.plant.next.signed.title'),
        why: t('app.plant.next.signed.why'),
      };
    } else {
      // The locked flow: signed by the lab, locked so only the breeder can open it.
      step = {
        title:
          (labSent ?? 0) > 0
            ? t('app.plant.next.sent.title')
            : (labSentEver ?? 0) > 0
              ? t('app.plant.next.withdrawn.title')
              : t('app.plant.next.send.title'),
        why:
          (labSent ?? 0) > 0
            ? t('app.plant.next.sent.why')
            : (labSentEver ?? 0) > 0
              ? t('app.plant.next.withdrawn.why')
              : t('app.plant.next.send.why'),
        // Round 6: after a withdrawal the lab can still see what it sent (and send a new one).
        action: (labSentEver ?? 0) > 0 ? t('app.plant.next.sent.action') : t('app.plant.next.send.action'),
        icon: <LockIcon />,
        onClick: onSendResults,
      };
    }
  } else if (saved && (saved.kind === 'replaced' || saved.kind === 'withdrawn') && !labOnly) {
    // Round 5: a saved report the lab no longer stands behind comes before anything else
    // about lab work, and says what everyone else sees until it's fixed.
    const newer = saved.newer;
    step =
      saved.kind === 'replaced'
        ? newer
          ? {
              title: t('app.plant.next.corrected.title'),
              why: t('app.plant.next.corrected.why'),
              action: t('app.plant.next.corrected.action'),
              icon: <LockIcon />,
              onClick: onOpenResult ? () => onOpenResult(newer.result.id) : undefined,
            }
          : {
              title: t('app.plant.next.noCurrent.title', { lab: saved.lab }),
              why: t('app.plant.next.noCurrent.why'),
            }
        : {
            title: t('app.plant.next.labWithdrew.title'),
            why: newer ? t('app.plant.next.labWithdrew.whyNewer') : t('app.plant.next.labWithdrew.why'),
            ...(newer && onOpenResult
              ? {
                  action: t('app.plant.next.labWithdrew.action'),
                  icon: <LockIcon />,
                  onClick: () => onOpenResult(newer.result.id),
                }
              : {}),
          };
  } else if (firstWaiting && onOpenResult) {
    step = {
      title: t('app.plant.next.open.title', { lab: recipientName(firstWaiting.transfer, tr) }),
      why: t('app.plant.next.open.why'),
      action: t('app.plant.next.open.action'),
      icon: <LockIcon />,
      onClick: () => onOpenResult(firstWaiting.result.id),
    };
  } else if (labOnly) {
    // Read-only for a lab-only account: the breeder's next steps aren't theirs.
    step = null;
  } else if (!record.dnaFingerprint && (receipt as BreederReceipt | null | undefined)?.kind === 'signed') {
    // A lab signed for a sample: its DNA report is on its way. Save it when it comes.
    step = {
      title: t('app.plant.next.save.title'),
      why: t('app.plant.next.save.why'),
      action: t('app.plant.next.save.action'),
      icon: <ScienceIcon />,
      onClick: onPairDna,
    };
  } else if (!record.dnaFingerprint) {
    // Sealed, and nothing ties the record to the plant yet. A dated record proves a
    // description existed; a DNA report is what ties it to the material. Two ways to one:
    // a lab code (the report comes back locked to the holder, where lab reports are on), or
    // a report the holder already has.
    step = {
      title: t('app.plant.next.dna.title'),
      why: t('app.plant.next.dna.why'),
      paths: (
        <Stack spacing={1.5} data-dna-paths="">
          <Box>
            <Typography variant="subtitle2" component="h3">
              {t('app.plant.next.dna.labTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: LAB_RESULTS_ENABLED ? 1 : 0 }}>
              {LAB_RESULTS_ENABLED ? t('app.plant.next.dna.labText') : t('app.plant.next.dna.labSoon')}
            </Typography>
            {LAB_RESULTS_ENABLED && <SendToLab record={record} />}
          </Box>
          <Box>
            <Typography variant="subtitle2" component="h3">
              {t('app.plant.next.dna.haveTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('app.plant.next.dna.haveText')}
            </Typography>
            <Button variant="contained" startIcon={<ScienceIcon />} onClick={onPairDna} sx={{ minHeight: 44 }}>
              {t('app.plant.next.dna.haveAction')}
            </Button>
          </Box>
        </Stack>
      ),
    };
  } else if (saved === null || saved === undefined) {
    // Still checking whether the lab stands behind the saved report: say nothing yet
    // rather than the wrong next step.
    step = null;
  } else if (dateReport.facts && !dateReport.dating) {
    // Saved, not dated: date it, so the DNA report's existence has a date of its own.
    step = {
      title: t('app.plant.next.date.title'),
      why: t('app.plant.next.date.why'),
      custom: (
        <Stack spacing={1} sx={{ alignItems: { sm: 'flex-end' } }}>
          <DatingNameField name={dateReport.name} setName={dateReport.setName} busy={dateReport.busy} />
          <Button
            variant="contained"
            startIcon={dateReport.busy ? <CircularProgress size={16} color="inherit" /> : <EventIcon />}
            onClick={() => void dateReport.date()}
            {...(dateReport.busy ? { 'aria-disabled': true as const, className: 'Mui-disabled' } : {})}
            sx={{ minHeight: 44 }}
          >
            {dateReport.busy ? t('app.log.sealing') : t('app.plant.dated.action')}
          </Button>
          {dateReport.error && (
            <Alert severity="error" variant="outlined">
              {dateErrorWords(dateReport.error, t)}
            </Alert>
          )}
        </Stack>
      ),
    };
  } else if ((receipt as BreederReceipt | null | undefined)?.kind !== 'signed') {
    // A DNA report is saved but no lab has signed for a sample: a report the holder saved
    // is still the holder's own statement, and a used code is nobody's statement.
    step = {
      title: t('app.plant.next.sample.title'),
      why: t('app.plant.next.sample.whySaved'),
      action: t('app.plant.next.sample.action'),
      icon: <VerifiedIcon />,
      custom: <SendToLab record={record} />,
    };
  } else {
    step = {
      title: t('app.plant.next.ready.title'),
      why: t('app.plant.next.ready.why'),
      action: t('app.plant.next.ready.action'),
      icon: <SendIcon />,
      onClick: onAgreement,
    };
  }

  if (!step) return null;

  return (
    // The one filled sheet on the plant page: Wash, no outline. It is the next thing to do.
    <Paper sx={{ p: { xs: 2.5, md: 3 }, bgcolor: WASH }} data-next-step="">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ display: 'block' }}>
            {t('app.plant.next.label')}
          </Typography>
          <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
            {step.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {step.why}
          </Typography>
          {step.paths && <Box sx={{ mt: 2 }}>{step.paths}</Box>}
        </Box>
        {(step.custom || (step.action && step.onClick)) && (
          <Box sx={{ flexShrink: 0 }}>
            {step.custom ?? (
              <Button variant="contained" startIcon={step.icon} onClick={step.onClick} sx={{ minHeight: 44 }}>
                {step.action}
              </Button>
            )}
          </Box>
        )}
      </Stack>
    </Paper>
  );
};
