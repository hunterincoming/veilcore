// The checker's side of a license proof (license-check.ts): against the real contract,
// run here, with the state the indexer would report after the holder's proveLicense.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { createVeilcorePrivateState, withLicense } from '../../../../contract/src/witnesses';
import { identityOf, licenseRequestFor, recoveryCommitmentOf } from './actions';
import { contractStateAfter } from './test-chain';
import { checkLicense } from './license-check';
import { newChallenge } from './challenge-book';

setNetworkId('preprod');

const ISSUER = new Uint8Array(32).fill(0x31);
const OTHER = new Uint8Array(32).fill(0x41);
const RECOVERY = new Uint8Array(32).fill(0x13);
const LICENSEE = new Uint8Array(32).fill(0x7c);
const bytes = (h: string) => Uint8Array.from(Buffer.from(h, 'hex'));
const TX = 'ab'.repeat(32);

const anchor = (secret: Uint8Array) => ({ secret, circuit: 'anchor' as const, args: [recoveryCommitmentOf(RECOVERY)] });
const issuerIdentity = identityOf(ISSUER);
const base = contractStateAfter([anchor(ISSUER), anchor(OTHER)]);
const { commitment, issuerRecord } = licenseRequestFor(LICENSEE, issuerIdentity, ledger(base.data));
const licensed = withLicense(createVeilcorePrivateState(new Uint8Array(32)), LICENSEE, bytes(issuerRecord));
const live = [
  anchor(ISSUER),
  anchor(OTHER),
  { secret: ISSUER, circuit: 'issueLicense' as const, args: [bytes(commitment)] },
  {
    secret: LICENSEE,
    circuit: 'countersignLicense' as const,
    args: [bytes(issuerRecord), 77n],
    privateState: licensed,
  },
];
const presented = (challenge: string, steps = live): ContractState =>
  contractStateAfter([
    ...steps,
    {
      secret: LICENSEE,
      circuit: 'proveLicense' as const,
      args: [],
      privateState: { ...licensed, presentationChallenge: bytes(challenge) },
    },
  ]);

const NOW = 1_800_000_000_000;
const deps = (state: ContractState, landedAt = NOW) => ({
  presentation: () => Promise.resolve({ ledger: ledger(state.data), blockHeight: 10, blockTime: landedAt }),
  now: () => NOW + 60_000,
});

describe('checking a license proof', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  it('accepts a live license answering this challenge, once', async () => {
    const challenge = newChallenge(NOW, { lasting: true });
    const s = presented(challenge);
    const v = await checkLicense({ txId: TX, identity: issuerIdentity, challenge }, deps(s));
    expect(v.accepted, v.reason).toBe(true);
    expect(v.landedAt).toBe(NOW);
    const again = await checkLicense({ txId: TX, identity: issuerIdentity, challenge }, deps(s));
    expect(again.accepted).toBe(false);
  });

  it('refuses the same answer checked against another record', async () => {
    const challenge = newChallenge(NOW, { lasting: true });
    const v = await checkLicense({ txId: TX, identity: identityOf(OTHER), challenge }, deps(presented(challenge)));
    expect(v.accepted).toBe(false);
  });

  it('refuses an answer to a challenge this browser did not make, or one too old', async () => {
    const mine = newChallenge(NOW, { lasting: true });
    const theirs = 'cd'.repeat(32);
    expect(
      (await checkLicense({ txId: TX, identity: issuerIdentity, challenge: theirs }, deps(presented(theirs)))).accepted,
    ).toBe(false);
    const old = await checkLicense(
      { txId: TX, identity: issuerIdentity, challenge: mine },
      deps(presented(mine), NOW - 3 * 60 * 60_000),
    );
    expect(old.accepted).toBe(false);
  });
});
