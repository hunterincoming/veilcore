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

import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import LinkIcon from '@mui/icons-material/LaunchOutlined';
import { bitcoinStampFor, proofFor, downloadProof, type ProofState } from '../veilcore/proofs';
import type { StrainRecord } from '../veilcore/records';
import { NETWORK, explorerFor, networkLabel } from '../config/network';
import { OUR_SERVER } from '../config/copy';
import { ANCHOR_CONTRACT, READ_INDEXERS } from '../veilcore/chain/config';
import { checkAnchorOnChain } from '../veilcore/chain/anchor-check';
import { anchorConfirmed, anchorLine, type AnchorState } from './verify/anchor-words';
import { reportedText, settlementChip } from './settlement-words';
import { Fact } from './verify/DisclosedFacts';

export const SettlementStatus: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const [state, setState] = useState<ProofState>({ status: 'none' });
  const [anchor, setAnchor] = useState<AnchorState | undefined>(undefined);

  useEffect(() => {
    void proofFor(record.recordFingerprint).then(setState);
  }, [record.recordFingerprint]);

  // The registry's anchor, looked up on Midnight by this browser: the transaction must be
  // VeilCore's date stamp call at the contract this build pins and have written this root.
  useEffect(() => {
    const a = state.status === 'anchor-reported' ? state.proof.anchor : undefined;
    if (state.status !== 'anchor-reported' || !a?.txHash) {
      setAnchor(undefined);
      return;
    }
    let live = true;
    setAnchor('checking');
    void checkAnchorOnChain(
      { network: a.network, txId: a.txHash, contractAddress: ANCHOR_CONTRACT, expectedRoot: state.proof.root },
      { buildNetwork: NETWORK, indexers: READ_INDEXERS },
    ).then((r) => live && setAnchor(r));
    return () => {
      live = false;
    };
  }, [state]);

  if (state.status === 'none') {
    return (
      <Stack spacing={1}>
        <Typography variant="overline" sx={{ display: 'block' }}>
          Date on Midnight
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sealed on your device and kept on {OUR_SERVER}. It isn&apos;t in a batch yet, so it isn&apos;t anchored. We
          anchor records together, in batches (by hand for now, so it can take a while), so one transaction covers many
          and you never need a wallet. Until then its date rests on this registry&apos;s records.
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
  const anchorText = reported && anchor !== undefined ? anchorLine(anchor, { network, bound: true }) : undefined;
  const confirmed = anchorConfirmed(anchor);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="overline">Date on Midnight</Typography>
        {/* Never "Anchored" on the registry's word alone (attack round D): only once this
            browser has found the root in the transaction on Midnight. */}
        <Chip size="small" variant="outlined" label={settlementChip(reported, network, anchor)} />
      </Stack>

      <Typography variant="body2" color="text.secondary">
        {reported
          ? reportedText(proof.batchId, network, anchorText !== undefined, confirmed)
          : `Checked in this browser: your record's fingerprint is in batch ${proof.batchId}, which has not been anchored yet. When it is, the proof gains a reference to the transaction. Nothing about your record changes.`}
      </Typography>

      {anchorText && (
        <Box data-anchor-check={anchor === 'checking' ? 'checking' : anchor?.status}>
          <Fact status={anchorText.status}>{anchorText.text}</Fact>
        </Box>
      )}

      <Box sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
        <div>batch {proof.batchId}</div>
        <div>root {proof.root.slice(0, 32)}…</div>
        {reported && proof.anchor?.txHash && (
          <div style={{ wordBreak: 'break-all' }}>
            tx ({confirmed ? 'checked on Midnight' : 'reported by the registry'}) {proof.anchor.txHash}
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
          Download inclusion proof
        </Button>
        {stamp && (
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} href={stamp.otsUrl} download>
            Download Bitcoin stamp file
          </Button>
        )}
        {reported && proof.anchor?.txHash && explorer && (
          <Button size="small" variant="text" startIcon={<LinkIcon />} href={explorer} target="_blank" rel="noopener">
            Open the explorer for {networkLabel(network)}
          </Button>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {confirmed
          ? 'The file shows your record is in this batch. This page found the batch root in the named transaction on Midnight; anyone can repeat that with the open-source package and a lookup on the network, without this site.'
          : 'The file shows your record is in this batch. It is evidence of a date only once the batch root is found in the named transaction, which needs the open-source package and a lookup on the network, not this site.'}
      </Typography>
      {stamp && (
        <Typography variant="caption" color="text.secondary">
          The Bitcoin stamp file dates this batch&apos;s root on Bitcoin with the free OpenTimestamps tool:{' '}
          <code>ots verify root.bin.ots</code>, next to{' '}
          <a href={stamp.rootUrl} download>
            the batch root file (root.bin)
          </a>
          .{' '}
          {stamp.status === 'pending'
            ? 'It is still pending: a promise from the stamping servers, not yet in a Bitcoin block. Run `ots upgrade` on it once Bitcoin confirms.'
            : 'It is in a Bitcoin block, so it checks against Bitcoin alone.'}
        </Typography>
      )}
    </Stack>
  );
};
