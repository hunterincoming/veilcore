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
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
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
import { ACCENT } from '../config/theme';
import type { SavedReport } from '../veilcore/saved-report';

type Step = {
  /** Some steps render their own control rather than a plain button. */
  custom?: React.ReactNode;
  title: string;
  /** What this gets them. Never a description of the state they can already see. */
  why: string;
  action?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
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

  // A record that arrived through a delivery is the lab's (or the next holder's). Telling
  // them to "send it to a lab for confirmation" is telling the lab to send it to a lab —
  // the page has to know which side of the delivery the reader is on.
  const isReceived = Boolean(record.receivedFrom);
  const firstWaiting = waiting?.[0];

  // Keys that live only in this browser come first: everything else can wait, a lost
  // browser can't be undone. Then the date stamp, which the logging flow normally did.
  if (REAL_CHAIN && keys && !keys.backedUpAt && onBackup) {
    step = {
      title: 'Save your backup',
      why: 'This plant’s keys are only on this device right now. If it breaks or the browser is cleared, nobody can prove you hold it. Saving takes a minute.',
      action: 'Save my backup',
      icon: <SaveIcon />,
      onClick: onBackup,
    };
  } else if (REAL_CHAIN && !isReceived && !keys?.anchor && onStamp) {
    step = {
      title: 'Add the date stamp',
      // The date stamp here dates the plant's key (what proving uses), not its details.
      why: 'It’s sealed. Its key isn’t date stamped yet, and you need that to prove you hold it. It takes about a minute and it’s free.',
      action: 'Add the date stamp',
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
        title: 'You turned this sample away',
        why: 'Nothing was signed. VeilCore doesn’t tell the breeder: let them know yourself, so they can send another.',
      };
    } else if (lab.kind === 'not-signed' && !loadAttester()) {
      step = {
        title: 'Set up your lab’s signature',
        why: 'Then you can sign that this sample arrived, and send the lab report back signed by your lab.',
        action: 'Set it up',
        icon: <BadgeIcon />,
        onClick: () => window.dispatchEvent(new Event(OPEN_SIGNING_KEY_EVENT)),
      };
    } else if (lab.kind === 'not-signed' && onSignReceipt) {
      step = {
        title: 'Sign that it arrived',
        why: 'Your signed receipt is what lets the breeder trust a lab report from you: it shows your key had the sample.',
        action: 'Sign receipt',
        icon: <VerifiedIcon />,
        onClick: onSignReceipt,
      };
    } else if (lab.kind === 'signed' && !lab.linked && onSignReceipt) {
      step = {
        title: 'Link your receipt to the delivery',
        why: 'Your receipt is signed, but the breeder’s page only counts a receipt linked to their delivery. Only whoever used the lab code can link it.',
        action: 'Link it',
        icon: <VerifiedIcon />,
        onClick: onSignReceipt,
      };
    } else if (!LAB_RESULTS_ENABLED) {
      step = {
        title: 'Receipt signed',
        why: 'The breeder sees your signed receipt. Lab reports can’t be sent back through VeilCore on this network yet: send yours the way you usually do.',
      };
    } else {
      // The locked flow: signed by the lab, locked so only the breeder can open it.
      step = {
        title:
          (labSent ?? 0) > 0
            ? 'Lab report sent'
            : (labSentEver ?? 0) > 0
              ? 'Lab report withdrawn'
              : 'Send results back to the breeder',
        why:
          (labSent ?? 0) > 0
            ? 'Only the breeder can open it. You can withdraw it, or send a corrected file.'
            : (labSentEver ?? 0) > 0
              ? 'You withdrew what you sent, so the breeder has no current lab report from you. You can send a new one.'
              : 'Signed with your lab’s key and locked so only the breeder can open it. VeilCore can’t read it.',
        // Round 6: after a withdrawal the lab can still see what it sent (and send a new one).
        action: (labSentEver ?? 0) > 0 ? 'See what you sent' : 'Send results back',
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
              title: 'Save the corrected lab report',
              why: 'The lab replaced the lab report saved to this plant. Until you save the corrected one, your plant page, certificate and links say the saved one was replaced.',
              action: 'Open the corrected one',
              icon: <LockIcon />,
              onClick: onOpenResult ? () => onOpenResult(newer.result.id) : undefined,
            }
          : {
              title: `No current lab report from ${saved.lab}`,
              why: 'The original was replaced and the correction withdrawn. Ask the lab to send one again. Until then your certificate and links say the saved one was replaced.',
            }
        : {
            title: 'The lab withdrew the lab report saved here',
            why: newer
              ? 'It stays saved to this plant, and your certificate and links say it was withdrawn. A newer lab report is here: open it and save it instead.'
              : 'It stays saved to this plant, and your certificate and links say it was withdrawn. Ask the lab for a new one.',
            ...(newer && onOpenResult
              ? { action: 'Open the newer one', icon: <LockIcon />, onClick: () => onOpenResult(newer.result.id) }
              : {}),
          };
  } else if (firstWaiting && onOpenResult) {
    step = {
      title: `Open the lab report from ${firstWaiting.transfer.to_handle}`,
      why: 'It’s locked so only you can open it, with this plant’s key. Opening it checks the lab’s signature here.',
      action: 'Open',
      icon: <LockIcon />,
      onClick: () => onOpenResult(firstWaiting.result.id),
    };
  } else if (labOnly) {
    // Read-only for a lab-only account: the breeder's next steps aren't theirs.
    step = null;
  } else if ((receipt as BreederReceipt | null | undefined)?.kind !== 'signed') {
    // No lab signature yet, whether or not a lab report is saved: a report the holder
    // saved is still the holder's own statement, and a used code is nobody's statement.
    step = {
      title: 'Send a sample to a lab',
      why: record.dnaFingerprint
        ? 'You’ve saved a lab report to this plant, which is your own statement. A lab signing that it received a sample adds a second party, which is stronger evidence than your statement alone.'
        : 'Right now this record is your own account of the plant. A lab signing that it received a sample, and sending a lab report back, makes it stronger evidence than your own account.',
      action: 'Send to a lab',
      icon: <VerifiedIcon />,
      custom: <SendToLab record={record} />,
    };
  } else if (!record.dnaFingerprint) {
    step = {
      title: 'Save the lab report to this plant',
      why: 'A lab signed that it received a sample. When its lab report comes back, save it to this plant so a later test can be compared with it.',
      action: 'Save it to this plant',
      icon: <ScienceIcon />,
      onClick: onPairDna,
    };
  } else {
    step = {
      title: 'This record is ready to use',
      why: 'A lab signed that it received a sample, and a lab report is saved to this plant. You can send material onward or license it, with terms that apply to offspring declared from this record.',
      action: 'Start an agreement',
      icon: <SendIcon />,
      onClick: onAgreement,
    };
  }

  if (!step) return null;

  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 }, borderColor: ACCENT, borderWidth: 1, borderStyle: 'solid' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: ACCENT, display: 'block' }}>
            Next step
          </Typography>
          <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
            {step.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {step.why}
          </Typography>
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
