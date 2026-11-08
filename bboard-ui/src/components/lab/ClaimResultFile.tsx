// Beside a claim on a lab result's call (/check-claim; veilcore/lab-result.ts): the claim proves
// only the call ("not detected", "same genotype", "consistent"), never what was tested for or
// which records were compared. Those are in the lab's result file. The checker can choose that
// file here: it is checked in this browser, and shown only when its code is the record the claim
// names, so the call and the statement are about the same signed result. Nothing is sent.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { readResultsText, resultCode, type LabResultStatement } from '../../veilcore/lab-result';
import { ResultFacts } from './ResultFacts';

export const ClaimResultFile: React.FC<{ record: string }> = ({ record }) => {
  const { t } = useT();
  const pick = useRef<HTMLInputElement>(null);
  const [found, setFound] = useState<{ statement: LabResultStatement } | { problem: string }>();
  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-claim-result-file="">
      <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
        {t('app.lr.claim.onlyCall')}
      </Alert>
      <Button variant="outlined" onClick={() => pick.current?.click()} sx={{ minHeight: 44 }}>
        {t('app.lr.claim.choose')}
      </Button>
      <input
        ref={pick}
        type="file"
        hidden
        data-claim-result-input=""
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          setFound(undefined);
          if (!f) return;
          void f
            .text()
            .then(readResultsText)
            .then((all) => {
              const hit = all.find((r) => r.ok && resultCode(r.bundle) === record);
              if (hit?.ok) return setFound({ statement: hit.bundle.statement });
              const bad = all.find((r) => !r.ok);
              setFound({
                problem: bad && !bad.ok ? t(`app.lr.problem.${bad.code}` as AppKey) : t('app.lr.claim.otherResult'),
              });
            });
        }}
      />
      {found && 'statement' in found && (
        <Box sx={{ mt: 2 }} data-claim-result-match="">
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
            {t('app.lr.claim.same')}
          </Typography>
          <ResultFacts statement={found.statement} code={record} />
        </Box>
      )}
      {found && 'problem' in found && (
        <Alert severity="warning" variant="outlined" sx={{ mt: 1.5 }} data-claim-result-problem="">
          {found.problem}
        </Alert>
      )}
    </Paper>
  );
};
