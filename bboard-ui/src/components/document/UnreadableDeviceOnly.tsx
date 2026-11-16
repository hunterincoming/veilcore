// Entries of the device-only store that can't be read as records (damaged storage;
// docs/device-only-records.md, "A damaged entry"). Shown on Home by id, with the raw entry to
// save to a file and a way to delete it. Such an entry is never sent anywhere, never stops a
// backup or another record's save, and the backup file carries it exactly as it is.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { damagedDeviceOnly, deleteDeviceOnly, useRecords } from '../../veilcore/records';
import { useT } from '../../i18n/app';

const save = (id: string, raw: unknown) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ id, entry: raw }, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `veilcore-unreadable-${id}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const UnreadableDeviceOnly: React.FC = () => {
  useRecords();
  const { t } = useT();
  const damaged = damagedDeviceOnly();
  if (damaged.length === 0) return null;
  return (
    <Stack spacing={1.25} sx={{ mb: 2 }}>
      {damaged.map(({ id, raw }) => (
        <Alert key={id} severity="warning" variant="outlined" data-device-only-unreadable={id}>
          <Typography variant="subtitle2" component="h2">
            {t('app.doc.local.unreadable.title')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-word' }}>
            {t('app.doc.local.unreadable.text', { id })}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button variant="outlined" color="inherit" onClick={() => save(id, raw)} sx={{ minHeight: 44 }}>
              {t('app.doc.local.unreadable.export')}
            </Button>
            <Button
              color="inherit"
              onClick={() => {
                if (window.confirm(t('app.doc.local.unreadable.deleteConfirm'))) deleteDeviceOnly(id);
              }}
              sx={{ minHeight: 44 }}
            >
              {t('app.doc.local.unreadable.delete')}
            </Button>
          </Stack>
        </Alert>
      ))}
    </Stack>
  );
};
