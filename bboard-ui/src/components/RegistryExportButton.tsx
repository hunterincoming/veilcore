// "Download everything VeilCore holds for you" (veilcore/registry-export.ts). Used on the
// records page; the privacy page can use it too.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Button, CircularProgress, Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import { downloadRegistryExport } from '../veilcore/registry-export';
import { InEnglishNote, useT } from '../i18n/app';

/** The button's English (app.home.export.label): the privacy page names it. */
export const REGISTRY_EXPORT_LABEL = 'Download everything VeilCore holds for you';

export const RegistryExportButton: React.FC<{ variant?: 'text' | 'outlined' }> = ({ variant = 'text' }) => {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [done, setDone] = useState(false);
  return (
    <Stack spacing={1} sx={{ alignItems: 'center' }}>
      <Button
        variant={variant}
        disabled={busy}
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
        onClick={() => {
          setBusy(true);
          setProblem(undefined);
          setDone(false);
          void downloadRegistryExport().then((r) => {
            setBusy(false);
            if ('error' in r) setProblem(r.error);
            else setDone(true);
          });
        }}
        sx={{ minHeight: 44 }}
      >
        {t('app.home.export.label')}
      </Button>
      {done && (
        <Alert severity="success" variant="outlined" role="status">
          {t('app.home.export.done')}
          <InEnglishNote />
        </Alert>
      )}
      {problem && (
        <Alert severity="warning" variant="outlined">
          {problem}
        </Alert>
      )}
    </Stack>
  );
};
