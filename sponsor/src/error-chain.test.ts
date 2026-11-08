import { describe, expect, it } from 'vitest';
// The Effect runtime the wallet SDK submits with (a dependency of the wallet SDK, hoisted to the
// repo's node_modules): the error shape below is the one it really rejects with.
import { Data, Effect, pipe } from 'effect';
import { MAX_ERROR_TEXT, describeError, errorChain, redact } from './error-chain.js';

// The same shapes as wallet-sdk-node-client (NodeClientError.SubmissionError carries the
// transaction bytes as `txData`) and wallet-sdk-capabilities (SubmissionError wraps it).
class NodeSubmissionError extends Data.TaggedError('SubmissionError')<{ message: string; txData: Uint8Array; cause?: unknown }> {}
class NodeInvalidError extends Data.TaggedError('TransactionInvalidError')<{ message: string; txData: Uint8Array }> {}
class SubmissionError extends Data.TaggedError('SubmissionError')<{ message: string; cause: unknown }> {}

const TX_BYTES = new Uint8Array(200).map((_, i) => (i * 37) % 256);
const TX_HEX = Buffer.from(TX_BYTES).toString('hex');

/** What WalletFacade.submitTransaction rejects with: Effect.runPromise's FiberFailure. */
const asFacadeRejects = async (inner: unknown): Promise<unknown> => {
  try {
    await pipe(
      Effect.fail(inner),
      Effect.mapError((err) => new SubmissionError({ message: 'Transaction submission error', cause: err })),
      Effect.runPromise,
    );
  } catch (e) {
    return e;
  }
  throw new Error('did not reject');
};

const rpcError = (msg: string, code: number) => Object.assign(new Error(msg), { code });

describe('error chain', () => {
  it('reads through Effect’s FiberFailure to the node’s answer', async () => {
    const e = await asFacadeRejects(
      new NodeSubmissionError({
        message: 'Transaction submission failed',
        txData: TX_BYTES,
        cause: rpcError('1010: Invalid Transaction: Custom error: 154', 1010),
      }),
    );
    // What the old reading saw: no cause at all.
    expect((e as Error).cause).toBeUndefined();
    expect(errorChain(e).map((l) => l.message)).toEqual([
      'Transaction submission error',
      'Transaction submission error',
      'Transaction submission failed',
      '1010: Invalid Transaction: Custom error: 154',
    ]);
    const line = describeError(e);
    expect(line).toContain('1010: Invalid Transaction: Custom error: 154 [code 1010]');
    expect(line).toContain('(FiberFailure) SubmissionError');
  });

  it('never logs the transaction bytes the node-client error carries', async () => {
    const e = await asFacadeRejects(new NodeInvalidError({ message: 'Transaction is invalid and was rejected by the node', txData: TX_BYTES }));
    const line = describeError(e);
    expect(line).toContain('TransactionInvalidError: Transaction is invalid');
    expect(line).not.toContain(TX_HEX.slice(0, 32));
    expect(line).not.toContain(Array.from(TX_BYTES.slice(0, 16)).join(','));
  });

  it('is one line of at most 500 characters, and stops on a loop', () => {
    const a = new Error('a '.repeat(400)) as Error & { cause?: unknown };
    a.cause = a;
    const line = describeError(a);
    expect(line.length).toBeLessThanOrEqual(MAX_ERROR_TEXT);
    expect(line).not.toContain('\n');
    expect(errorChain(a)).toHaveLength(1);
  });

  it('handles things that are not errors', () => {
    expect(describeError('plain text')).toBe('string: plain text');
    expect(describeError(undefined)).toBe('');
    expect(describeError({ _tag: 'ConnectionError', message: 'Could not connect' })).toBe('ConnectionError: Could not connect');
  });
});

describe('redaction', () => {
  const SEED = 'f'.repeat(8) + '0123456789abcdef'.repeat(3) + '01234567'; // 64 hex: a 32-byte seed
  const PHRASE = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
  const PHRASE_24 = `${PHRASE} ${PHRASE}`;

  it('removes hex of 64 digits or more (a seed, a key, transaction bytes)', () => {
    expect(SEED).toHaveLength(64);
    const out = redact(`seed ${SEED} and 0x${TX_HEX}`);
    expect(out).not.toMatch(/[0-9a-f]{64}/i);
    expect(out).toContain('[hex 64]');
    expect(describeError(new Error(`bad key ${SEED}`))).not.toContain(SEED);
  });

  it('keeps short hex (a 32-digit fragment is not a secret on its own)', () => {
    expect(redact('custom error 0xdeadbeef')).toBe('custom error 0xdeadbeef');
  });

  it('removes anything shaped like a recovery phrase, 12 or 24 words', () => {
    for (const p of [PHRASE, PHRASE_24]) {
      const out = describeError(new Error(`could not read ${p} here`));
      for (const w of ['abandon', 'absurd', 'accident']) expect(out).not.toContain(w);
    }
  });

  it('removes a Blockfrost project id and long tokens', () => {
    const id = 'mainnet' + 'Ab3dE5gH7jK9mN1pQ3sT5vX7';
    expect(describeError(new Error(`Could not connect to wss://rpc.mainnet.blockfrost.io/${id}`))).not.toContain(id);
    const token = 'tok_' + 'Zx9'.repeat(15);
    expect(redact(`x-operator-token: ${token}`)).not.toContain(token);
  });

  it('removes bytes printed as a list of numbers', () => {
    expect(redact(`txData: ${Array.from(TX_BYTES).join(',')}`)).toBe('txData: [bytes]');
  });

  it('a secret anywhere in the cause chain does not survive', async () => {
    const e = await asFacadeRejects(
      new NodeSubmissionError({ message: 'Transaction submission failed', txData: TX_BYTES, cause: new Error(`${SEED} ${PHRASE}`) }),
    );
    const line = describeError(e);
    expect(line).not.toContain(SEED);
    expect(line).not.toContain('abandon');
  });
});

