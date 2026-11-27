// The sponsor's check before sending (sponsor/src/preflight.ts) on real sponsored calls, built
// as the browser builds them: the compiled contract's circuits run and the calls are sealed by
// the browser's own code (actions.ts, through test-chain's stand-ins). The proofs are
// placeholders: real proofs need the proving parameters, which unit tests do not have. The
// calls are otherwise correctly shaped, and the sponsor's policy has already passed them.
//
// What it shows, for every sponsored call, at two different sets of ledger parameters:
// - with the fee check off, the check passes (signatures, limits, effects, transcripts,
//   network, time-to-live): it does not stop a good call for anything but its fee;
// - with it on, the only refusal is 138, and the shortfall is exactly the ledger's fee:
//   a call from the browser carries no DUST (the sponsor adds it), so it owes all of it;
// - what the wallet SDK pays (its proof-erased estimate with a 5-block margin, plus the
//   sponsor's 1000-SPECK overhead, wallet.ts) is well over that fee.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { LedgerParameters, LedgerState, Transaction } from '@midnightntwrk/ledger-v9';
import { ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { createVeilcorePrivateState, withLicense } from '../../../../contract/src/witnesses';
import { preflight } from '../../../../sponsor/src/preflight';
import {
  anchorOnChain,
  confirmParentOnChain,
  countersignLicenseOnChain,
  identityOf,
  issueLicenseOnChain,
  licenseRequestFor,
  proposeParentOnChain,
  proveLicenseOnChain,
  proveOwnershipOnChain,
  recoveryCommitmentOf,
  revokeLicenseOnChain,
} from './actions';
import { contractStateAfter, standIns } from './test-chain';

const ISSUER = new Uint8Array(32).fill(0x31);
const CHILD = new Uint8Array(32).fill(0x41);
const RECOVERY = new Uint8Array(32).fill(0x13);
const LICENSEE = new Uint8Array(32).fill(0x7c);
const SECOND_LICENSEE = new Uint8Array(32).fill(0x5a);
const ALL = [
  'anchor',
  'proveOwnership',
  'pairDna',
  'issueLicense',
  'countersignLicense',
  'proveLicense',
  'revokeLicense',
  'proposeParent',
  'confirmParent',
];
const bytes = (h: string) => Uint8Array.from(Buffer.from(h, 'hex'));
const anchoredBy = (secret: Uint8Array) => ({
  secret,
  circuit: 'anchor' as const,
  args: [recoveryCommitmentOf(RECOVERY)],
});
const issuerId = identityOf(ISSUER);

/** Ledger parameters after 20 full blocks: prices well above the initial ones. */
const raisedParameters = (): LedgerParameters => {
  const full = LedgerParameters.initialParameters().normalizeFullness({
    readTime: 10n ** 12n,
    computeTime: 10n ** 12n,
    blockUsage: 200_000n,
    bytesWritten: 50_000n,
    bytesChurned: 50_000n,
  });
  let state = LedgerState.blank('preprod');
  for (let i = 0; i < 20; i++) state = state.postBlockUpdate(new Date(), full, 1.0);
  return state.parameters;
};

/** Every sponsored call, sealed by the browser's code on the stand-in chain (ledger 9, mainnet now). */
const sponsoredCalls = async (): Promise<{ name: string; circuit: string; sealed: Uint8Array }[]> => {
  const calls: { name: string; circuit: string; sealed: Uint8Array }[] = [];
  const run = async (
    name: string,
    circuit: string,
    state: ReturnType<typeof contractStateAfter>,
    call: (deps: ReturnType<typeof standIns>['deps']) => Promise<unknown>,
  ) => {
    const r = standIns(state, { allowedCircuits: ALL, era: 'v9' });
    await call(r.deps);
    expect(r.sealed, name).toHaveLength(1);
    calls.push({ name, circuit, sealed: r.sealed[0] });
  };

  await run('anchor', 'anchor', contractStateAfter([]), (deps) => anchorOnChain(ISSUER, RECOVERY, { deps }));
  const s1 = contractStateAfter([anchoredBy(ISSUER)]);
  await run('proveOwnership', 'proveOwnership', s1, (deps) => proveOwnershipOnChain(ISSUER, 'e1'.repeat(32), { deps }));
  const { commitment } = licenseRequestFor(LICENSEE, issuerId, ledger(s1.data));
  await run('issueLicense', 'issueLicense', s1, (deps) => issueLicenseOnChain(ISSUER, commitment, { deps }));

  const issued = { secret: ISSUER, circuit: 'issueLicense' as const, args: [bytes(commitment)] };
  const s2 = contractStateAfter([anchoredBy(ISSUER), issued]);
  await run('countersignLicense (empty tree)', 'countersignLicense', s2, (deps) =>
    countersignLicenseOnChain(LICENSEE, issuerId, { deps }),
  );

  const countersigned = {
    secret: LICENSEE,
    circuit: 'countersignLicense' as const,
    args: [bytes(issuerId), 77n],
    privateState: withLicense(createVeilcorePrivateState(new Uint8Array(32)), LICENSEE, bytes(issuerId)),
  };
  const s3 = contractStateAfter([anchoredBy(ISSUER), issued, countersigned]);
  await run('proveLicense', 'proveLicense', s3, (deps) =>
    proveLicenseOnChain(LICENSEE, issuerId, 'e2'.repeat(32), { deps }),
  );
  await run('revokeLicense', 'revokeLicense', s3, (deps) =>
    revokeLicenseOnChain(ISSUER, commitment, issuerId, { deps }),
  );

  // A second licence countersigned into a tree that already holds one leaf.
  const c2 = licenseRequestFor(SECOND_LICENSEE, issuerId, ledger(s3.data)).commitment;
  const s4 = contractStateAfter([
    anchoredBy(ISSUER),
    issued,
    countersigned,
    { secret: ISSUER, circuit: 'issueLicense' as const, args: [bytes(c2)] },
  ]);
  await run('countersignLicense (one leaf)', 'countersignLicense', s4, (deps) =>
    countersignLicenseOnChain(SECOND_LICENSEE, issuerId, { deps }),
  );

  const p0 = contractStateAfter([anchoredBy(ISSUER), anchoredBy(CHILD)]);
  await run('proposeParent', 'proposeParent', p0, (deps) => proposeParentOnChain(CHILD, issuerId, { deps }));
  const p1 = contractStateAfter([
    anchoredBy(ISSUER),
    anchoredBy(CHILD),
    { secret: CHILD, circuit: 'proposeParent' as const, args: [bytes(issuerId)] },
  ]);
  await run('confirmParent', 'confirmParent', p1, (deps) => confirmParentOnChain(ISSUER, identityOf(CHILD), { deps }));
  return calls;
};

describe("the sponsor's check before sending, on calls built as the browser builds them", () => {
  it('passes every sponsored call on everything but the fee, and asks for exactly the ledger fee', async () => {
    const calls = await sponsoredCalls();
    expect(calls.map((c) => c.circuit).sort()).toEqual(
      ALL.filter((c) => c !== 'pairDna')
        .concat('countersignLicense')
        .sort(),
    );
    const initial = LedgerParameters.initialParameters();
    const raised = raisedParameters();
    const now = new Date();
    for (const { name, circuit, sealed } of calls) {
      const tx = Transaction.deserialize('signature', 'proof', 'binding', sealed);
      const feeAt = (p: LedgerParameters) => tx.fees(p);
      // The raised parameters really reach the check (the setter applies): the fee moves.
      expect(feeAt(raised), name).toBeGreaterThan(feeAt(initial));

      for (const [at, params] of [
        ['initial', initial],
        ['raised', raised],
      ] as const) {
        const label = `${name} at ${at} parameters`;
        // Everything but the fee: passes.
        const rest = preflight(sealed, params, 'preprod', now, { enforceBalancing: false });
        expect(rest, label).toMatchObject({ ok: true, facts: { circuits: [circuit], dustSpends: 0 } });

        // With the fee: 138, short by exactly the ledger's fee (no DUST yet).
        const fee = feeAt(params);
        const full = preflight(sealed, params, 'preprod', now);
        expect(full.ok, label).toBe(false);
        if (full.ok !== false) continue;
        expect(full.code, label).toBe('138');
        expect(full.error, label).toContain(`invalid balance -${fee} for token Dust`);
        expect(full.facts.ledgerFeeNoMargin, label).toBe(fee);

        // What the wallet SDK pays covers it with room to spare (placeholder proofs make the
        // room larger than real ones do; with real proofs the 5-block margin alone gives 1.25 times).
        const pays = tx.eraseProofs().feesWithMargin(params, 5) + 1_000n;
        expect(pays * 100n, label).toBeGreaterThanOrEqual(fee * 125n);
      }
    }
  }, 600_000);
});
