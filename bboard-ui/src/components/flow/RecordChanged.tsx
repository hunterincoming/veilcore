// The warning from the check made when the app opens (veilcore/record-watch.ts): something about a
// record this browser date stamped changed on the network that this browser didn't do. One calm
// line, then "Here's what to do" opens the steps. On the record's page it says what changed and
// offers "I did this myself"; on Home it is one line for all of them, with a link to each.
// Nothing shows when nothing changed, so the default screens are as they were.
// SPDX-License-Identifier: Apache-2.0

import React, { useId, useState } from 'react';
import { Alert, Box, Button, Collapse, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useT, rich } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { markSeen, useRecordChanges, type Finding } from '../../veilcore/record-watch';
import type { StrainRecord } from '../../veilcore/records';
import { recordTitle } from '../../veilcore/animal-profile';

const STEPS = ['you', 'copy', 'files', 'date', 'help'] as const;

const Steps: React.FC = () => {
  const { t } = useT();
  return (
    <Box component="ol" sx={{ pl: 2.5, my: 1, '& li': { mb: 0.75 } }} data-record-changed-steps="">
      {STEPS.map((s) => (
        <li key={s}>
          <Typography variant="body2" component="span">
            {rich(t(`app.watch.step.${s}` as AppKey), {
              mail: (c) => <a href="mailto:hunter@veilcore.org">{c}</a>,
            })}
          </Typography>
        </li>
      ))}
    </Box>
  );
};

const Toggle: React.FC<{ open: boolean; onClick: () => void; controls: string }> = ({ open, onClick, controls }) => {
  const { t } = useT();
  return (
    <Button
      onClick={onClick}
      color="inherit"
      size="small"
      aria-expanded={open}
      aria-controls={controls}
      endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      sx={{ minHeight: 44, ml: -1, px: 1 }}
      data-record-changed-what=""
    >
      {open ? t('app.watch.hide') : t('app.watch.what')}
    </Button>
  );
};

/** On the record's own page: shown only when something changed for this record. */
export const RecordChangedNotice: React.FC<{ readonly recordId: string }> = ({ recordId }) => {
  const found = useRecordChanges().find((f) => f.recordId === recordId);
  return found ? <OneRecord finding={found} /> : null;
};

const OneRecord: React.FC<{ readonly finding: Finding }> = ({ finding }) => {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <Alert severity="warning" variant="outlined" sx={{ mb: 2 }} data-record-changed={finding.recordId}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {t('app.watch.this')}
      </Typography>
      {finding.changes.map((c) => (
        <Typography key={c} variant="body2" data-record-change={c}>
          {t(`app.watch.change.${c}` as AppKey)}
        </Typography>
      ))}
      <Toggle open={open} onClick={() => setOpen(!open)} controls={id} />
      <Collapse in={open} id={id}>
        <Steps />
        <Button
          variant="outlined"
          size="small"
          onClick={() => markSeen(finding.recordId)}
          sx={{ minHeight: 44 }}
          data-record-changed-seen=""
        >
          {t('app.watch.seen')}
        </Button>
      </Collapse>
    </Alert>
  );
};

/** On Home: one line for every record with something changed, and a way to each. */
export const RecordChangesOnHome: React.FC<{ readonly records: readonly StrainRecord[] }> = ({ records }) => {
  const { t, tp } = useT();
  const [open, setOpen] = useState(false);
  const id = useId();
  const byId = new Map(records.map((r) => [r.id, r]));
  const found = useRecordChanges().filter((f) => byId.has(f.recordId));
  if (found.length === 0) return null;
  const first = byId.get(found[0].recordId);
  return (
    <Alert severity="warning" variant="outlined" data-record-changed-home={found.length}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {tp('app.watch.home', found.length, first ? { name: recordTitle(first) } : {})}
      </Typography>
      <Toggle open={open} onClick={() => setOpen(!open)} controls={id} />
      <Collapse in={open} id={id}>
        <Steps />
        <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
          {found.map((f) => {
            const r = byId.get(f.recordId);
            return r ? (
              <Button
                key={f.recordId}
                component={RouterLink}
                to={`/record/${encodeURIComponent(f.recordId)}`}
                size="small"
                sx={{ minHeight: 44, textAlign: 'left' }}
              >
                {t('app.watch.open', { name: recordTitle(r) })}
              </Button>
            ) : null;
          })}
        </Stack>
      </Collapse>
    </Alert>
  );
};
