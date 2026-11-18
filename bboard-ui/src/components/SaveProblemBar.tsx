// Shown when the registry refused part of a save. The app reloads what the registry
// actually holds, so what is on screen matches it; this says what did not go through.
// SPDX-License-Identifier: Apache-2.0

import React, { useSyncExternalStore } from 'react';
import { Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { clearSaveProblem, describeRefusals, useSaveProblem } from '../veilcore/save-status';
import { useT } from '../i18n/app';
import { SupportDetails } from './SupportDetails';
import {
  clearRemovedAsDeleted,
  linksDeletedFirst,
  onLinksDeleted,
  onRemovedAsDeleted,
  removedAsDeletedCount,
} from '../veilcore/records';

/** Records removed here because their holder deleted them elsewhere, or a restore still had them. */
const RemovedAsDeleted: React.FC = () => {
  const n = useSyncExternalStore(onRemovedAsDeleted, removedAsDeletedCount);
  const tr = useT();
  if (!n) return null;
  return (
    <Alert
      severity="info"
      variant="outlined"
      onClose={clearRemovedAsDeleted}
      sx={{ mb: 2 }}
      data-removed-as-deleted={n}
    >
      {tr.tp('app.plant.delete.goneHere', n)}
    </Alert>
  );
};

/**
 * A correction kept here that VeilCore will never take: its link names a record its holder
 * deleted. Said, with the way to its page, where it can be let go (RecordSaveNotices).
 */
const LinksDeleted: React.FC = () => {
  const id = useSyncExternalStore(onLinksDeleted, linksDeletedFirst);
  const tr = useT();
  const navigate = useNavigate();
  if (!id) return null;
  return (
    <Alert
      severity="warning"
      variant="outlined"
      sx={{ mb: 2 }}
      data-links-deleted={id}
      action={
        <Button color="inherit" onClick={() => void navigate(`/record/${id}`)} sx={{ minHeight: 44 }}>
          {tr.t('app.sealed.linksDeletedOpen')}
        </Button>
      }
    >
      {tr.t('app.sealed.linksDeletedBar')}
    </Alert>
  );
};

export const SaveProblemBar: React.FC = () => (
  <>
    <RemovedAsDeleted />
    <LinksDeleted />
    <SaveProblem />
  </>
);

const SaveProblem: React.FC = () => {
  const problem = useSaveProblem();
  const tr = useT();
  if (!problem) return null;
  // `what` is 'records' or 'agreements' (records.ts, licenses.ts); the registry's own reasons stay as it gave them.
  const what =
    problem.what === 'records'
      ? tr.t('app.home.saveProblem.records')
      : problem.what === 'agreements'
        ? tr.t('app.home.saveProblem.agreements')
        : problem.what;
  // VeilCore couldn't be reached at all: nothing was refused and nothing was put back. Said
  // as that, with what happens next (the record's own line: app.sealed.unsaved.retry). The
  // general line read "…have been put back to what it holds: …nothing was saved", which on a
  // phone with a bad signal sounded like the record just sealed was lost.
  const unreachable = problem.refused.every((r) => r.words === 'app.sealed.refuse.unknown');
  return (
    <Alert
      severity="warning"
      variant="outlined"
      onClose={clearSaveProblem}
      sx={{ mb: 2 }}
      data-save-problem={unreachable ? 'unreachable' : 'refused'}
    >
      {unreachable
        ? tr.t('app.home.saveProblem.unreachable', { what })
        : tr.t('app.home.saveProblem.text', { what, list: describeRefusals(problem.refused, tr) })}
      <SupportDetails
        step={problem.what === 'agreements' ? 'agreement' : 'save to VeilCore'}
        error={describeRefusals(problem.refused)}
      />
    </Alert>
  );
};
