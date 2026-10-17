// "Prove you held it": answer a verifier's challenge from this browser (proveOwnership).
// The challenge must come from the verifier (32 random bytes they made); a proof that
// answers a challenge the holder chose shows nothing, since anyone could replay it.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { hexBytes, useRecordKeys } from '../../veilcore/record-keys';
import { getRecord, useRecords } from '../../veilcore/records';
import { chainNotReady } from '../../veilcore/chain/config';
import type { ChainReceipt } from '../../veilcore/chain/actions';
import { useChainCall } from './useChainCall';
import { useRecordT } from '../../i18n/app';
import { ChainStatusLine } from './ChainStatusLine';
import { proveLinkParams } from '../../veilcore/prove-link';
import { nameParam, verifyPath } from '../../veilcore/verify-link';

export const ProveOwnershipPanel: React.FC<{ recordId: string; initialChallenge?: string }> = ({
  recordId,
  initialChallenge = '',
}) => {
  useRecords();
  const record = getRecord(recordId);
  const keys = useRecordKeys()[recordId];
  const [challenge, setChallenge] = useState(initialChallenge);
  const call = useChainCall<ChainReceipt>();
  // The checker's link: for a record that names its key, with what ties the key to it
  // (prove-link.ts), so the check page can match them.
  const [params, setParams] = useState<Record<string, string> | null>(null);
  const { t } = useRecordT(record);
  useEffect(() => {
    let live = true;
    if (record) void proveLinkParams(record, keys).then((p) => live && setParams(p));
    return () => {
      live = false;
    };
  }, [record, keys]);
  if (!record || chainNotReady()) return null;

  const valid = /^(0x)?[0-9a-fA-F]{64}$/.test(challenge.trim());
  const anchored = keys?.anchor;
  // With the record's name after the # (round 5), as every link the holder sends.
  const checkerLink = params
    ? verifyPath(record.id, record.recordFingerprint, { ...nameParam(record.strainName), ...params })
    : '';
  const prove = () =>
    call.run(async (progress) => {
      if (!keys) throw new Error('This browser does not hold the record’s keys.'); // chainProblem words it on screen
      const { proveOwnershipOnChain } = await import('../../veilcore/chain/actions');
      return proveOwnershipOnChain(hexBytes(keys.recordSecret), challenge.trim().replace(/^0x/, ''), { progress });
    });

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle1">{t('app.prove.own.title')}</Typography>
        {!anchored ? (
          <Typography variant="body2" color="text.secondary">
            {t('app.prove.own.stampFirst')}
          </Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              {t('app.prove.own.intro', { block: String(anchored.blockHeight) })}
            </Typography>
            <Box sx={{ display: checkerLink ? undefined : 'none' }}>
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${checkerLink}`)}
              >
                {t('app.prove.own.copyChecker')}
              </Button>
              <Button size="small" component={RouterLink} to={checkerLink} target="_blank" rel="noopener">
                {t('app.prove.own.tryIt')}
              </Button>
            </Box>
            <TextField
              label={t('app.prove.own.challenge')}
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              error={challenge.trim() !== '' && !valid}
              size="small"
              fullWidth
            />
            <Button
              variant="contained"
              disabled={!valid || call.busy}
              onClick={() => void prove()}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('app.prove.own.answer')}
            </Button>
            <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} />
            {call.result && (
              <Alert severity="success" variant="outlined">
                <Typography variant="body2">{t('app.prove.own.done')}</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', my: 0.5 }}>
                  {call.result.txId}
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => void navigator.clipboard.writeText(call.result?.txId ?? '')}
                >
                  {t('app.prove.copy')}
                </Button>
              </Alert>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
};
