// After sealing: anchor the record's identity on Midnight's test network, from this
// browser, with VeilCore paying the fee. Real-chain builds only (VITE_REAL_CHAIN=1).
//
// In order: make the record's keys here, download the backup, then anchor. The anchor
// publishes the identity, commit(record secret), and a commitment to the recovery
// secret. Neither secret leaves this browser.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/LinkOutlined';
import {
  ensureKeys,
  ensureKeysFor,
  hexBytes,
  setAnchor,
  storageKeeps,
  useRecordKeys,
} from '../../veilcore/record-keys';
import { getRecord, useRecords } from '../../veilcore/records';
import { localStamp } from '../../veilcore/time';
import { CHAIN_CONTRACT, chainNotReady } from '../../veilcore/chain/config';
import { NETWORK } from '../../config/network';
import { useT } from '../../i18n/app';
import { networkWords } from '../../i18n/network-words';
import { identityOf } from '../../veilcore/chain/identity';
import { useChainCall } from './useChainCall';
import { ChainStatusLine, TxLine } from './ChainStatusLine';
import { RecordKeysPanel } from './RecordKeysPanel';

export const AnchorOnChainPanel: React.FC<{ recordId: string }> = ({ recordId }) => {
  useRecords();
  const record = getRecord(recordId);
  const keys = useRecordKeys()[recordId];
  const anchored = keys?.anchor;
  const [privateOk, setPrivateOk] = useState(false);
  const call = useChainCall<void>();
  const tr = useT();
  const { t } = tr;
  if (!record) return null;

  const notReady = chainNotReady();
  const keeps = storageKeeps();

  const anchor = () =>
    call.run(async (progress) => {
      // A record that names its key is anchored only with that key (key-binding.ts).
      const k = ensureKeysFor(record);
      const { anchorOnChain } = await import('../../veilcore/chain/actions');
      const secret = hexBytes(k.recordSecret);
      const receipt = await anchorOnChain(secret, hexBytes(k.recoverySecret), { progress });
      setAnchor(recordId, {
        identity: identityOf(secret),
        network: NETWORK,
        contractAddress: CHAIN_CONTRACT ?? '',
        txId: receipt.txId,
        txHash: receipt.txHash,
        blockHeight: receipt.blockHeight,
        anchoredAt: receipt.blockTime,
      });
    });

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <LinkIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="subtitle1">
            {t('app.plant.anchor.title', { network: networkWords(undefined, tr) })}
          </Typography>
        </Stack>

        {anchored ? (
          <>
            <Alert severity="success" variant="outlined">
              {t('app.plant.anchor.anchored', {
                id: anchored.identity.slice(0, 16),
                block: String(anchored.blockHeight),
                when: anchored.anchoredAt
                  ? t('app.plant.anchor.chainClock', { when: localStamp(anchored.anchoredAt, tr.locale) })
                  : '',
              })}
            </Alert>
            <TxLine label={t('app.plant.anchor.label')} txHash={anchored.txHash} blockHeight={anchored.blockHeight} />
            <RecordKeysPanel record={record} />
          </>
        ) : notReady ? (
          <Typography variant="body2" color="text.secondary">
            {t('app.plant.anchor.notAvailable', { why: notReady })}
          </Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              {t('app.plant.anchor.intro')}
            </Typography>
            {!keeps && (
              <>
                <Alert severity="warning" variant="outlined">
                  {t('app.plant.anchor.notKeeping')}
                </Alert>
                <FormControlLabel
                  control={<Checkbox checked={privateOk} onChange={(e) => setPrivateOk(e.target.checked)} />}
                  label={<Typography variant="body2">{t('app.plant.anchor.understand')}</Typography>}
                />
              </>
            )}
            {!keys && record.keyBinding ? (
              <>
                {/* This record named its key when it was sealed: a new key would never match. */}
                <RecordKeysPanel record={record} />
                <Typography variant="body2" color="text.secondary">
                  {t('app.plant.anchor.keysNotHere')}
                </Typography>
              </>
            ) : !keys ? (
              <>
                {/* Restore comes first (no-wallet run, 13 Oct 2026): after "Remove" the page
                    offered only "Make this record's keys", and the restore button was not
                    on the page at all. New keys would be a second, unrelated identity. */}
                <RecordKeysPanel record={record} />
                <Typography variant="body2" color="text.secondary">
                  {t('app.plant.anchor.onlyNew')}
                </Typography>
                <Button
                  variant="outlined"
                  disabled={!keeps && !privateOk}
                  onClick={() => ensureKeys(recordId)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {t('app.plant.anchor.makeKeys')}
                </Button>
              </>
            ) : (
              <>
                <RecordKeysPanel record={record} />
                <Button
                  variant="contained"
                  disabled={call.busy || !keys.backedUpAt}
                  onClick={() => void anchor()}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {keys.backedUpAt ? t('app.plant.anchor.anchorTest') : t('app.plant.anchor.backupFirst')}
                </Button>
              </>
            )}
            <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} />
          </>
        )}
      </Stack>
    </Paper>
  );
};
