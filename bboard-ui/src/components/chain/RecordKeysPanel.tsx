// The record's two secrets, as the holder sees them: whether this browser holds them,
// whether a backup exists, and the controls to download, restore or forget them.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import UploadIcon from '@mui/icons-material/FileUploadOutlined';
import {
  downloadBackup,
  forgetKeys,
  hexBytes,
  keysFitRecord,
  restoreBackup,
  useRecordKeys,
} from '../../veilcore/record-keys';
import { identityOf } from '../../veilcore/chain/identity';
import type { StrainRecord } from '../../veilcore/records';
import { NETWORK } from '../../config/network';
import { CHAIN_CONTRACT } from '../../veilcore/chain/config';
import { useT } from '../../i18n/app';
import { backupMessageWords } from '../flow/backup-words';

export const RecordKeysPanel: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const keys = useRecordKeys()[record.id];
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string>();
  const tr = useT();
  const { t } = tr;

  const extra = {
    cultivar: record.strainName,
    network: NETWORK,
    contract: CHAIN_CONTRACT,
  };

  const onRestore = async (f: File | undefined) => {
    if (!f) return;
    try {
      const k = await restoreBackup(f);
      if (k.recordId !== record.id) setMsg(t('app.plant.keys.restoredFor', { id: k.recordId }));
      else if (!keysFitRecord(k, record)) {
        setMsg(t('app.plant.keys.notNamed'));
      } else if (k.anchor && identityOf(hexBytes(k.recordSecret)) !== k.anchor.identity) {
        setMsg(t('app.plant.keys.notIdentity'));
      } else setMsg(t('app.plant.keys.restored'));
    } catch (e) {
      setMsg(e instanceof Error ? backupMessageWords(e.message, tr) : String(e));
    }
  };

  const onForget = () => {
    if (!keys) return;
    const warning = keys.backedUpAt ? t('app.plant.keys.removeBacked') : t('app.plant.keys.removeUnbacked');
    if (window.confirm(warning)) forgetKeys(record.id);
  };

  return (
    <Stack spacing={1.25}>
      <Typography variant="overline">{t('app.plant.keys.title')}</Typography>
      {keys ? (
        <>
          <Typography variant="body2" color="text.secondary">
            {t('app.plant.keys.holds')}
          </Typography>
          {!keys.backedUpAt && (
            <Alert severity="warning" variant="outlined">
              {t('app.plant.keys.noBackup')}
            </Alert>
          )}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => downloadBackup(keys, extra)}
            >
              {keys.backedUpAt ? t('app.plant.keys.downloadAgain') : t('app.plant.keys.download')}
            </Button>
            <Button size="small" variant="text" color="inherit" onClick={onForget}>
              {t('app.plant.keys.remove')}
            </Button>
          </Stack>
        </>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            {t('app.plant.keys.notHeld')}
          </Typography>
          <Button size="small" variant="outlined" startIcon={<UploadIcon />} onClick={() => fileRef.current?.click()}>
            {t('app.plant.keys.restore')}
          </Button>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void onRestore(e.target.files?.[0])}
      />
      {msg && <Typography variant="caption">{msg}</Typography>}
    </Stack>
  );
};
