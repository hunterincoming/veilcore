import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ledger, type Ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { checkAnchor, checkOwnership, newChallenge } from './ownership-check';
import { identityOf, recoveryCommitmentOf } from './actions';
import { contractStateAfter } from './test-chain';
import { KEY_NOT_THIS_RECORDS, bindingForSecret, keyBoundFingerprint } from '../key-binding';

const store = new Map<string, string>();
const lasting = new Map<string, string>();
beforeEach(() => {
  store.clear();
  lasting.clear();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => lasting.get(k) ?? null,
    setItem: (k: string, v: string) => void lasting.set(k, v),
  });
});

const RECORD = new Uint8Array(32).fill(1);
const OTHER = new Uint8Array(32).fill(2);
const RCV = recoveryCommitmentOf(new Uint8Array(32).fill(3));
const hexToBytes = (h: string) => Uint8Array.from(Buffer.from(h, 'hex'));

const afterProof = (secret: Uint8Array, challenge: string): Ledger =>
  ledger(
    contractStateAfter([
      { secret: RECORD, circuit: 'anchor', args: [RCV] },
      { secret: OTHER, circuit: 'anchor', args: [recoveryCommitmentOf(new Uint8Array(32).fill(4))] },
      { secret, circuit: 'proveOwnership', args: [hexToBytes(challenge)] },
    ]).data,
  );

describe('verifier: checking a holder’s answer', () => {
  it('accepts the answer to this tab’s challenge, from the record’s identity, once', async () => {
    const challenge = newChallenge();
    const after = afterProof(RECORD, challenge);
    const deps = { stateAfter: () => Promise.resolve(after), latest: () => Promise.resolve(after) };
    const input = { txId: 'aa'.repeat(32), identity: identityOf(RECORD), challenge };
    expect(await checkOwnership(input, deps)).toMatchObject({ accepted: true });
    const again = await checkOwnership(input, deps);
    expect(again.accepted).toBe(false);
    expect(again.reason).toMatch(/already answered/);
  });

  it('a challenge sent as a link still works in a new tab of this browser, once', async () => {
    const challenge = newChallenge(Date.now(), { lasting: true });
    store.clear(); // the tab that made it is closed
    vi.resetModules();
    const fresh = await import('./ownership-check');
    const after = afterProof(RECORD, challenge);
    const deps = { stateAfter: () => Promise.resolve(after), latest: () => Promise.resolve(after) };
    const input = { txId: 'aa'.repeat(32), identity: identityOf(RECORD), challenge };
    expect(await fresh.checkOwnership(input, deps)).toMatchObject({ accepted: true });
    vi.resetModules();
    const again = await (await import('./ownership-check')).checkOwnership(input, deps);
    expect(again.reason).toMatch(/already answered/);
  });

  it('refuses a challenge this tab did not make', async () => {
    const challenge = 'ee'.repeat(32);
    const after = afterProof(RECORD, challenge);
    const v = await checkOwnership(
      { txId: 'aa', identity: identityOf(RECORD), challenge },
      { stateAfter: () => Promise.resolve(after), latest: () => Promise.resolve(after) },
    );
    expect(v.accepted).toBe(false);
    expect(v.reason).toMatch(/did not make/);
  });

  it('refuses a proof made by a different record', async () => {
    const challenge = newChallenge();
    const after = afterProof(OTHER, challenge);
    const v = await checkOwnership(
      { txId: 'aa', identity: identityOf(RECORD), challenge },
      { stateAfter: () => Promise.resolve(after), latest: () => Promise.resolve(after) },
    );
    expect(v.accepted).toBe(false);
  });

  it('refuses a proof that answered another challenge', async () => {
    const mine = newChallenge();
    const after = afterProof(RECORD, 'dd'.repeat(32));
    const v = await checkOwnership(
      { txId: 'aa', identity: identityOf(RECORD), challenge: mine },
      { stateAfter: () => Promise.resolve(after), latest: () => Promise.resolve(after) },
    );
    expect(v.accepted).toBe(false);
    expect(v.reason).toMatch(/did not answer this challenge/);
  });

  it('passes on a lookup failure as a refusal', async () => {
    const challenge = newChallenge();
    const v = await checkOwnership(
      { txId: 'aa', identity: identityOf(RECORD), challenge },
      {
        stateAfter: () => Promise.reject(new Error('No such transaction.')),
        latest: () => Promise.reject(new Error('x')),
      },
    );
    expect(v).toEqual({ accepted: false, reason: 'No such transaction.' });
  });

  it('checks an anchor transaction names the identity', async () => {
    const after = ledger(contractStateAfter([{ secret: RECORD, circuit: 'anchor', args: [RCV] }]).data);
    expect(await checkAnchor('aa', identityOf(RECORD), { stateAfter: () => Promise.resolve(after) })).toBe(true);
    expect(await checkAnchor('aa', identityOf(OTHER), { stateAfter: () => Promise.resolve(after) })).toBe(false);
  });
});

// A record that names its own key (key-binding.ts): the whole path on the test chain.
describe('verifier: a record that names its own key', () => {
  const hexOf = (b: Uint8Array) => Buffer.from(b).toString('hex');
  // The victim's record, sealed naming RECORD's key; the attacker controls OTHER.
  const sealed = () => {
    const { keySalt, keyBinding } = bindingForSecret(hexOf(RECORD));
    const contentHash = 'c4'.repeat(32);
    return { fingerprint: keyBoundFingerprint(keyBinding, contentHash), keySalt, contentHash };
  };

  it('accepts the record’s own key, answering this challenge', async () => {
    const challenge = newChallenge();
    const after = afterProof(RECORD, challenge);
    const deps = { stateAfter: () => Promise.resolve(after), latest: () => Promise.resolve(after) };
    const v = await checkOwnership(
      { txId: 'aa'.repeat(32), identity: identityOf(RECORD), challenge, record: sealed() },
      deps,
    );
    expect(v.accepted).toBe(true);
  });

  it('refuses a real, valid proof from a key the record never named (the swapped chain=), without reading the chain', async () => {
    const challenge = newChallenge();
    const after = afterProof(OTHER, challenge); // OTHER genuinely proved, answering this challenge
    let read = false;
    const deps = {
      stateAfter: () => ((read = true), Promise.resolve(after)),
      latest: () => Promise.resolve(after),
    };
    // Without the record, the old check accepts it: control of the key the link names.
    expect(
      (await checkOwnership({ txId: 'aa'.repeat(32), identity: identityOf(OTHER), challenge }, deps)).accepted,
    ).toBe(true);
    read = false;
    const again = newChallenge();
    const v = await checkOwnership(
      { txId: 'aa'.repeat(32), identity: identityOf(OTHER), challenge: again, record: sealed() },
      { ...deps, stateAfter: () => ((read = true), Promise.resolve(afterProof(OTHER, again))) },
    );
    expect(v).toEqual({ accepted: false, reason: KEY_NOT_THIS_RECORDS });
    expect(read).toBe(false);
  });
});
