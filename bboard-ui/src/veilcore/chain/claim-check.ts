// Reading a claim back from Midnight for the check page (claim-link.ts): the claims contract's
// state for the ONE call the transaction made on it (api/src/presentation-lookup.ts, the same
// lookup the operator tool and the ownership check use), on the claims contract this site was
// built for. A link naming another contract is refused, not followed.
// SPDX-License-Identifier: Apache-2.0

import { claimsLedger } from '../../../../contract/src/claims';
import { claimFromCells } from '../../../../contract/src/verify-claims';
import { singleCallState } from '../../../../api/src/presentation-lookup';
import { CLAIMS_CONTRACT, INDEXER_HTTP } from './config';
import { compareAttested, compareClaim, type ClaimVerdict, type LabVerdict, type MadeClaim } from '../claim-link';

export type ClaimReader = (
  contract: string,
  txId: string,
) => Promise<{ claim: ReturnType<typeof claimFromCells>; blockHeight?: number; blockTime?: number }>;

const readFromIndexer: ClaimReader = async (contract, txId) => {
  const found = await singleCallState(
    INDEXER_HTTP ?? '',
    contract,
    txId,
    ['proveRange', 'proveValue', 'proveAttested'],
    'That transaction is not a single claim on VeilCore’s claims contract.',
  );
  return {
    claim: claimFromCells(claimsLedger(found.state.data)),
    blockHeight: found.blockHeight,
    blockTime: found.blockTime,
  };
};

/** Check a claim link against the chain. Never throws: a failure is a verdict with a reason. */
export const checkClaim = async (
  link: MadeClaim,
  deps: { read?: ClaimReader; contract?: string } = {},
): Promise<ClaimVerdict> => {
  const contract = deps.contract ?? CLAIMS_CONTRACT;
  if (!contract) return { ok: false, reason: 'This site can’t read claims: no claims contract is configured.' };
  if (link.contract !== contract)
    return { ok: false, reason: 'The link names a claims contract that isn’t VeilCore’s on this network.' };
  try {
    const read = deps.read ?? readFromIndexer;
    const { claim, blockHeight, blockTime } = await read(contract, link.txId);
    const v = compareClaim(link, claim);
    if (!v.ok) return v;
    if (!link.attested) return { ok: true, blockHeight, blockTime };
    let lab: LabVerdict;
    try {
      const a = await read(contract, link.attested.txId);
      const c = compareAttested(link, a.claim);
      lab = c.ok ? { ...c, blockHeight: a.blockHeight, blockTime: a.blockTime } : c;
    } catch (e) {
      lab = { ok: false, reason: e instanceof Error ? e.message : String(e) };
    }
    return { ok: true, blockHeight, blockTime, lab };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
};
