// After pairing a report: optionally date the pairing on chain against the record's
// anchored identity. What is published is a bound pairing (veilcore/chain/pairing.ts): a
// code made from the report's fingerprint, the identity and a random salt, never the
// fingerprint itself, so nobody watching can copy it to their own record first. The salt
// is saved in this browser (and the backup file) BEFORE the call is sent, and the holder
// downloads an evidence file to keep with the report.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import {
  clearDnaOnChain,
  hexBytes,
  keysFor,
  setDnaOnChain,
  useRecordKeys,
  type DnaOnChain,
} from '../../veilcore/record-keys';
import { getRecord, useRecords } from '../../veilcore/records';
import { CHAIN_CONTRACT, chainNotReady } from '../../veilcore/chain/config';
import { dnaPairBinding, newPairingSalt, pairingEvidence } from '../../veilcore/chain/pairing';
import { useChainCall } from './useChainCall';
import { ChainStatusLine, TxLine } from './ChainStatusLine';
import { InEnglishNote, useT } from '../../i18n/app';

const download = (name: string, text: string): void => {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

export const PairDnaOnChainPanel: React.FC<{ recordId: string }> = ({ recordId }) => {
  useRecords();
  const record = getRecord(recordId);
  const keys = useRecordKeys()[recordId];
  const call = useChainCall<void>();
  const { t } = useT();
  if (!record?.dnaFingerprint || chainNotReady()) return null;

  if (!keys) {
    return (
      <Typography variant="caption" color="text.secondary">
        {t('app.pair.chain.noKeys')}
      </Typography>
    );
  }
  if (!keys.anchor) {
    return (
      <Typography variant="caption" color="text.secondary">
        {t('app.pair.chain.stampFirst')}
      </Typography>
    );
  }

  const anchor = keys.anchor;
  const fingerprint = record.dnaFingerprint;
  // Only the report paired now counts: a different file paired since was not dated.
  const mine: DnaOnChain | undefined =
    keys.dnaOnChain?.fingerprint === fingerprint && keys.dnaOnChain.identity === anchor.identity
      ? keys.dnaOnChain
      : undefined;

  const evidenceFile = (d: DnaOnChain): void =>
    download(
      `${recordId}.dna-pairing.json`,
      JSON.stringify(
        pairingEvidence({
          network: anchor.network,
          contractAddress: anchor.contractAddress,
          txId: d.txId ?? '',
          identity: d.identity,
          reportSha256: d.fingerprint,
          salt: d.salt,
          reportFile: record.dnaFileName,
        }),
        null,
        2,
      ) + '\n',
    );

  // One dated pairing per record for now: dating another report would replace the first
  // one's salt, and without it the first pairing could never be shown again.
  const other = !mine && keys.dnaOnChain?.status === 'paired' ? keys.dnaOnChain : undefined;
  if (other) {
    return (
      <Typography variant="caption" color="text.secondary">
        {t('app.pair.chain.other')}
      </Typography>
    );
  }

  if (mine?.status === 'paired') {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="body2">{t('app.pair.chain.dated')}</Typography>
          <TxLine label={t('app.pair.chain.label')} txHash={mine.txHash ?? ''} blockHeight={mine.blockHeight ?? 0} />
          <Typography variant="caption" color="text.secondary">
            {t('app.pair.chain.toShow')}
          </Typography>
          {!keys.backedUpAt && (
            <Alert severity="warning" variant="outlined">
              {t('app.pair.chain.backupAgain')}
            </Alert>
          )}
          <Button variant="outlined" onClick={() => evidenceFile(mine)} sx={{ alignSelf: 'flex-start' }}>
            {t('app.pair.chain.download')}
          </Button>
          <InEnglishNote />
        </Stack>
      </Paper>
    );
  }

  const pair = () =>
    call.run(async (progress) => {
      // The same salt again when an earlier send was not confirmed: the same binding, not a second one.
      const fresh = mine?.status !== 'sending';
      const pending: DnaOnChain = fresh
        ? (() => {
            const salt = newPairingSalt();
            return {
              fingerprint,
              salt,
              identity: anchor.identity,
              binding: dnaPairBinding(fingerprint, anchor.identity, salt),
              status: 'sending' as const,
            };
          })()
        : mine;
      if (fresh) {
        setDnaOnChain(recordId, pending); // saved before anything is sent
        if (keysFor(recordId)?.dnaOnChain?.salt !== pending.salt) {
          throw new Error('This browser could not save the pairing’s random number, so nothing was sent.'); // chainProblem words it
        }
      }
      const { pairDnaOnChain } = await import('../../veilcore/chain/actions');
      let r: Awaited<ReturnType<typeof pairDnaOnChain>>;
      try {
        r = await pairDnaOnChain(hexBytes(keys.recordSecret), pending.binding, { progress });
      } catch (e) {
        // Refused before anything left this browser: forget the attempt, so the page does
        // not say it may have landed. Anything else keeps it, to resend the same code.
        if (fresh && e instanceof Error && /Nothing was sent/.test(e.message)) clearDnaOnChain(recordId);
        throw e;
      }
      setDnaOnChain(recordId, {
        ...pending,
        status: 'paired',
        txId: r.txId,
        txHash: r.txHash,
        blockHeight: r.blockHeight,
        at: r.blockTime,
      });
    });

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">{t('app.pair.chain.title')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('app.pair.chain.intro')}
        </Typography>
        {mine?.status === 'sending' && !call.busy && (
          <Alert severity="warning" variant="outlined">
            {t('app.pair.chain.earlier')}
          </Alert>
        )}
        <Button
          variant="outlined"
          disabled={call.busy || !CHAIN_CONTRACT}
          onClick={() => void pair()}
          sx={{ alignSelf: 'flex-start' }}
        >
          {mine?.status === 'sending' ? t('app.pair.chain.sendAgain') : t('app.pair.chain.date')}
        </Button>
        <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="DNA report date stamp" />
        <Typography variant="caption" color="text.secondary">
          {t('app.pair.chain.testOnly')}
        </Typography>
      </Stack>
    </Paper>
  );
};
