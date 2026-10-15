// One look-up of a batch root's date stamp on Midnight, shared by every part of the site
// that shows a record's date: the plant page's status card, its "Date on Midnight" section,
// its History, and the public check page. All of them ask here, with the same inputs (the
// network and transaction the registry names, the contract this build pins, the root the
// inclusion proof folds to), so they can't disagree about the same record.
//
// A definite answer (checked, or not confirmed) is kept for the rest of the visit; an
// answer that couldn't be had (no indexer reached) is not kept, so the next look tries again.
// SPDX-License-Identifier: Apache-2.0

import type { InclusionProof } from 'veilcore-records';
import { NETWORK } from '../../config/network';
import { checkAnchorOnChain, type AnchorCheck, type AnchorCheckDeps } from './anchor-check';
import { ANCHOR_CONTRACT, READ_INDEXERS } from './config';

const definite = new Map<string, AnchorCheck>();
const inFlight = new Map<string, Promise<AnchorCheck>>();

const keyOf = (network: string, tx: string, root: string, contract: string | undefined, deps: AnchorCheckDeps) =>
  [network, tx.toLowerCase(), root.toLowerCase(), contract ?? '', deps.buildNetwork, deps.indexers.join(' ')].join('|');

/**
 * The registry's anchor for this proof, looked up on Midnight; undefined when the proof
 * names no transaction (nothing to look up). Never throws.
 */
export const lookUpAnchor = (
  proof: Pick<InclusionProof, 'root' | 'anchor'>,
  deps: AnchorCheckDeps = { buildNetwork: NETWORK, indexers: READ_INDEXERS },
  contract: string | undefined = ANCHOR_CONTRACT,
): Promise<AnchorCheck> | undefined => {
  const a = proof.anchor;
  if (!a?.txHash) return undefined;
  const key = keyOf(a.network, a.txHash, proof.root, contract, deps);
  const known = definite.get(key);
  if (known) return Promise.resolve(known);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const p = checkAnchorOnChain(
    { network: a.network, txId: a.txHash, contractAddress: contract, expectedRoot: proof.root },
    deps,
  ).then((r) => {
    inFlight.delete(key);
    if (r.status === 'checked' || r.status === 'failed' || r.status === 'not-checked') definite.set(key, r);
    return r;
  });
  inFlight.set(key, p);
  return p;
};

/** For tests: forget every answer. */
export const forgetAnchorLookups = (): void => {
  definite.clear();
  inFlight.clear();
};
