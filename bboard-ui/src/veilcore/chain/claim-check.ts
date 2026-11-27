// Reading a claim back from Midnight for the check page (claim-link.ts): the claims contract's
// state for the ONE call the transaction made on it (api/src/presentation-lookup.ts, the same
// lookup the operator tool and the ownership check use), on the claims contract this site was
// built for. A link naming another contract is refused, not followed.
// SPDX-License-Identifier: Apache-2.0

import { claimsLedger } from '../../../../contract/src/claims';
import { claimFromCells } from '../../../../contract/src/verify-claims';
import { singleCallState } from '../../../../api/src/presentation-lookup';
import { CLAIMS_CONTRACT, INDEXER_HTTP } from './config';
import {
  compareAttested,
  compareClaim,
  type ClaimVerdict,
  type LabSigner,
  type LabVerdict,
  type MadeClaim,
} from '../claim-link';
import { findBinding, type BindingCandidate } from '../claims-key';
import { compareTwoClaim, type TwoClaim, type TwoVerdict } from '../two-record-claims';
import { attestationsFor } from '../attesters';
import { e2eChain } from './e2e-chain';
import { indexerTip, linkReadFailure, type IndexerTip } from './read-failure';

/** What a claim check asks besides the claim itself: the indexer's latest block, and the clock. */
type ReadDeps = { readonly tip?: () => Promise<IndexerTip>; readonly now?: () => number };

/** A claim that couldn't be read is said as that; a missing or contradicted one fails (read-failure.ts). */
const readFailed = async (
  e: unknown,
  link: { readonly blockHeight?: number; readonly blockTime?: number },
  deps: ReadDeps,
): Promise<{ ok: false; reason: string; unreadable?: true }> => {
  const f = await linkReadFailure(
    e,
    link,
    deps.tip ?? (() => indexerTip(INDEXER_HTTP ?? '')),
    (deps.now ?? Date.now)(),
  );
  return f.refused ? { ok: false, reason: f.reason } : { ok: false, reason: f.reason, unreadable: true };
};

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

/**
 * What one call on the claims contract recorded at a transaction, read the way this page reads it:
 * `two` for a claim about two records. Throws when it can't be read (link-hashes.ts uses it to
 * check a hash the indexer gave before saving it).
 */
export const readClaimAt = async (
  contract: string,
  txId: string,
  two: boolean,
): Promise<ReturnType<typeof claimFromCells>> =>
  (await (two ? readTwoFromIndexer : readFromIndexer)(contract, txId)).claim;

/** Check a claim link against the chain. Never throws: a failure is a verdict with a reason. */
export const checkClaim = async (
  link: MadeClaim,
  deps: {
    read?: ClaimReader;
    contract?: string;
    /**
     * The attestations about a record (attesters.ts attestationsFor, signatures checked there).
     * About the plant the numbers are about (`attested.about`), the registry's answer also holds
     * the lab signatures its holder chose to show (registry feature shared-by-proof-code-v1, 12
     * Nov 2026): a lab's report signature is private otherwise, and a v1 binding names the lab
     * only through it. A claim link names the plant only by proof code, so that is where they
     * are read; nothing in the link has to carry them.
     */
    attestations?: (record: string) => Promise<readonly BindingCandidate[]>;
  } & ReadDeps = {},
): Promise<ClaimVerdict> => {
  // The end-to-end build's stand-in for Midnight (e2e-chain.ts); undefined in every other build.
  const stub = e2eChain()?.claim;
  if (stub) {
    const v = stub(link);
    return v === 'checking' ? new Promise<ClaimVerdict>(() => undefined) : v;
  }
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
      if (c.ok) {
        // Whose key: only from a binding checked here, about the record the link names.
        let signer: LabSigner = { kind: 'none' };
        if (link.attested.about && a.claim.attester) {
          try {
            const get = deps.attestations ?? ((r: string) => attestationsFor(r, { claimsKeyBindings: true }));
            const about = link.attested.about;
            // The plant's list holds the lab signatures its holder shows (see `attestations`).
            const [list, aboutList] = await Promise.all([get(link.record), get(about)]);
            signer = findBinding(
              list,
              link.record,
              a.claim.attester,
              link.attested.about,
              aboutList,
              link.attested.bindingSalt,
            );
          } catch {
            signer = { kind: 'none' };
          }
        }
        lab = { ...c, blockHeight: a.blockHeight, blockTime: a.blockTime, signer };
      } else lab = c;
    } catch (e) {
      lab = { ok: false, reason: e instanceof Error ? e.message : String(e) };
    }
    return { ok: true, blockHeight, blockTime, lab };
  } catch (e) {
    // Only what Midnight contradicts fails the claim; a transaction the indexer doesn't have
    // fails once it is missing by the indexer's latest block and the clock, whatever the link says.
    return readFailed(e, link, deps);
  }
};

const readTwoFromIndexer: ClaimReader = async (contract, txId) => {
  const found = await singleCallState(
    INDEXER_HTTP ?? '',
    contract,
    txId,
    ['proveDistinct', 'proveUnchanged'],
    'That transaction is not a single claim about two records on VeilCore’s claims contract.',
  );
  return {
    claim: claimFromCells(claimsLedger(found.state.data)),
    blockHeight: found.blockHeight,
    blockTime: found.blockTime,
  };
};

/**
 * Check a link to a claim about two records (two-record-claims.ts) against the chain: read for
 * that one call, on this site's claims contract only, and compared exactly with the link. Never
 * throws: a failure is a verdict with a reason.
 */
export const checkTwoClaim = async (
  link: TwoClaim,
  deps: { read?: ClaimReader; contract?: string } & ReadDeps = {},
): Promise<TwoVerdict> => {
  // The end-to-end build's stand-in for Midnight (e2e-chain.ts); undefined in every other build.
  const stub = e2eChain()?.twoClaim;
  if (stub) {
    const v = stub(link);
    return v === 'checking' ? new Promise<TwoVerdict>(() => undefined) : v;
  }
  const contract = deps.contract ?? CLAIMS_CONTRACT;
  if (!contract) return { ok: false, reason: 'This site can’t read claims: no claims contract is configured.' };
  if (link.contract !== contract)
    return { ok: false, reason: 'The link names a claims contract that isn’t VeilCore’s on this network.' };
  try {
    const { claim, blockHeight, blockTime } = await (deps.read ?? readTwoFromIndexer)(contract, link.txId);
    const v = compareTwoClaim(link, claim);
    return v.ok ? { ok: true, blockHeight, blockTime } : v;
  } catch (e) {
    // The same as a claim about one record: couldn't read is never a failure, missing is.
    return readFailed(e, link, deps);
  }
};
