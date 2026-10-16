// Where this record's commitment actually sits.
//
// Three honest states, per record, rather than one blanket claim about the whole app:
// not yet batched, batched and awaiting an anchor, or anchored on chain with a
// transaction you can look up.
//
// Once the registry reports an anchor, this page looks the transaction up on Midnight
// itself, the same way the public check page does (veilcore/chain/anchor-check.ts,
// docs/check-on-chain.md), and says so in the same words (verify/anchor-words.ts):
// checked on Midnight, not confirmed, or couldn't reach an indexer. A build with no
// indexer to read (veilcore.org until its read-only relay is live) says it has not
// looked the transaction up.
//
// The proof is downloadable because it is the holder's, not ours. They can verify it
// with the published package and a chain lookup, without this registry. Network names
// come from the proof itself or the build's config (config/network.ts), never a
// hard-coded network.
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import LinkIcon from '@mui/icons-material/LaunchOutlined';
import { bitcoinStampFor, downloadProof } from '../veilcore/proofs';
import type { StrainRecord } from '../veilcore/records';
import { NETWORK, explorerFor } from '../config/network';
import { rich, useT } from '../i18n/app';
import { networkWords } from '../i18n/network-words';
import { anchorConfirmed, anchorLine } from './verify/anchor-words';
import { useRecordDate } from './verify/useAnchorCheck';
import { reportedText, settlementChip } from './settlement-words';
import { Fact } from './verify/DisclosedFacts';

export const SettlementStatus: React.FC<{ record: StrainRecord }> = ({ record }) => {
  // The record's proof and its anchor looked up on Midnight: the same answer the plant
  // page's status card and History show (useAnchorCheck.ts, chain/anchor-lookup.ts).
  const { proof: loaded, anchor } = useRecordDate(record.recordFingerprint);
  const tr = useT();
  const { t } = tr;
  const state = loaded === 'checking' ? ({ status: 'none' } as const) : loaded;

  if (state.status === 'none') {
    return (
      <Stack spacing={1}>
        <Typography variant="overline" sx={{ display: 'block' }}>
          {t('app.plant.date.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('app.plant.date.notInBatch', { server: t('app.copy.ourServer') })}
        </Typography>
      </Stack>
    );
  }

  const { proof } = state;
  const reported = state.status === 'anchor-reported';
  // The proof names its own network; fall back to this build's only if it does not.
  const network = proof.anchor?.network ?? NETWORK;
  const explorer = explorerFor(network);
  const stamp = bitcoinStampFor(proof);
  // The proof was checked against this record's own fingerprint, so a confirmed anchor is
  // ticked (bound). Nothing extra when this build has no indexer for that network.
  const anchorText =
    reported && anchor !== undefined
      ? anchorLine(anchor, { network, bound: true, reportedAt: proof.anchor?.anchoredAt }, tr)
      : undefined;
  const confirmed = anchorConfirmed(anchor);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="overline">{t('app.plant.date.title')}</Typography>
        {/* Never "Anchored" on the registry's word alone (attack round D): only once this
            browser has found the root in the transaction on Midnight. */}
        <Chip size="small" variant="outlined" label={settlementChip(reported, network, anchor, tr)} />
      </Stack>

      <Typography variant="body2" color="text.secondary">
        {reported
          ? reportedText(proof.batchId, network, anchorText !== undefined, confirmed, tr)
          : t('app.plant.date.inBatchNotAnchored', { batch: proof.batchId })}
      </Typography>

      {anchorText && (
        <Box data-anchor-check={anchor === 'checking' ? 'checking' : anchor?.status}>
          <Fact status={anchorText.status}>{anchorText.text}</Fact>
        </Box>
      )}

      <Box sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
        <div>{t('app.plant.date.batchLine', { batch: proof.batchId })}</div>
        <div>{t('app.plant.date.rootLine', { root: proof.root.slice(0, 32) })}</div>
        {reported && proof.anchor?.txHash && (
          <div style={{ wordBreak: 'break-all' }}>
            {t(confirmed ? 'app.plant.date.txChecked' : 'app.plant.date.txReported', { tx: proof.anchor.txHash })}
          </div>
        )}
      </Box>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => downloadProof(proof, record.id)}
        >
          {t('app.plant.date.downloadProof')}
        </Button>
        {stamp && (
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} href={stamp.otsUrl} download>
            {t('app.plant.date.downloadStamp')}
          </Button>
        )}
        {reported && proof.anchor?.txHash && explorer && (
          <Button size="small" variant="text" startIcon={<LinkIcon />} href={explorer} target="_blank" rel="noopener">
            {t('app.plant.date.openExplorer', { network: networkWords(network, tr) })}
          </Button>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {confirmed ? t('app.plant.date.fileConfirmed') : t('app.plant.date.fileNotConfirmed')}
      </Typography>
      {stamp && (
        <Typography variant="caption" color="text.secondary">
          {rich(t(stamp.status === 'pending' ? 'app.plant.date.stampPending' : 'app.plant.date.stampInBlock'), {
            code: (c) => <code>{c}</code>,
            link: (c) => (
              <a href={stamp.rootUrl} download>
                {c}
              </a>
            ),
          })}
        </Typography>
      )}
    </Stack>
  );
};
