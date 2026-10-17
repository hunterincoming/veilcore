// Shown when the registry refused part of a save. The app reloads what the registry
// actually holds, so what is on screen matches it; this says what did not go through.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert } from '@mui/material';
import { clearSaveProblem, describeRefusals, useSaveProblem } from '../veilcore/save-status';
import { useT } from '../i18n/app';
import { SupportDetails } from './SupportDetails';

export const SaveProblemBar: React.FC = () => {
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
  return (
    <Alert severity="warning" variant="outlined" onClose={clearSaveProblem} sx={{ mb: 2 }}>
      {tr.t('app.home.saveProblem.text', { what, list: describeRefusals(problem.refused, tr) })}
      <SupportDetails
        step={problem.what === 'agreements' ? 'agreement' : 'save to VeilCore'}
        error={describeRefusals(problem.refused)}
      />
    </Alert>
  );
};
