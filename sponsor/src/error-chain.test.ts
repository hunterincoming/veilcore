import { describe, expect, it } from 'vitest';
// The Effect runtime the wallet SDK submits with (a dependency of the wallet SDK, hoisted to the
// repo's node_modules): the error shapes below are the ones it really rejects with.
import { Cause, Data, Effect, pipe } from 'effect';
// The BIP-39 English list (dev dependency): the phrase rule is checked against the list itself.
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { MAX_ERROR_TEXT, describeError, errorChain, field, hasName, messageOf, redact } from './error-chain.js';
import { isStaleDustTime, nodeRefusal } from './wallet.js';

// The same shapes as wallet-sdk-node-client (NodeClientError.SubmissionError carries the
// transaction bytes as `txData`) and wallet-sdk-capabilities (SubmissionError wraps it).
class NodeSubmissionError extends Data.TaggedError('SubmissionError')<{ message: string; txData: Uint8Array; cause?: unknown }> {}
class NodeInvalidError extends Data.TaggedError('TransactionInvalidError')<{ message: string; txData: Uint8Array }> {}
class SubmissionError extends Data.TaggedError('SubmissionError')<{ message: string; cause: unknown }> {}

const TX_BYTES = new Uint8Array(300).map((_, i) => (i * 37 + 11) % 256);
const TX_HEX = Buffer.from(TX_BYTES).toString('hex');
const PID = 'mainnet' + 'Q7wErTy0uIoPaSdFgHjKlZxCvBnM1234';
const NODE_URL = `wss://rpc.midnight-mainnet.blockfrost.io/?project_id=${PID}`;

/** What WalletFacade.submitTransaction rejects with: Effect.runPromise's FiberFailure. `die` for a defect. */
const asFacadeRejects = async (inner: unknown, die = false): Promise<unknown> => {
  try {
    await pipe(
      die ? Effect.die(inner) : Effect.fail(inner),
      Effect.mapError((err) => new SubmissionError({ message: 'Transaction submission error', cause: err })),
      Effect.runPromise,
    );
  } catch (e) {
    return e;
  }
  throw new Error('did not reject');
};
const rejectsWith = async (cause: Cause.Cause<unknown>): Promise<unknown> => {
  try {
    await Effect.runPromise(Effect.failCause(cause));
  } catch (e) {
    return e;
  }
  throw new Error('did not reject');
};

const rpcError = (msg: string, code: number) => Object.assign(new Error(msg), { code });

/** No transaction bytes in any printed form, no project id, one line, at most 500 characters. */
const noLeak = (line: string) => {
  expect(line).not.toContain(PID);
  expect(line).not.toContain(TX_HEX.slice(0, 40));
  expect(line).not.toMatch(/\b\d{1,3}(?:,\d{1,3}){8,}/);
  expect(line).not.toMatch(/"\d+"\s*:\s*\d+\s*,\s*"\d+"/);
  expect(line).not.toMatch(/(?:\b[0-9a-f]{2} ){8,}/i);
  expect(line).not.toContain('\n');
  expect(line.length).toBeLessThanOrEqual(MAX_ERROR_TEXT);
};

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
      '', // the FiberFailure's own message is Effect's rendering of the next link: not used
      'Transaction submission error',
      'Transaction submission failed',
      '1010: Invalid Transaction: Custom error: 154',
    ]);
    expect(describeError(e)).toBe(
      '(FiberFailure) SubmissionError <- SubmissionError: Transaction submission error <- SubmissionError: Transaction submission failed <- Error: 1010: Invalid Transaction: Custom error: 154 [code 1010]',
    );
  });

  it('a defect that is a plain object (Effect writes it into the message as JSON) leaks nothing', async () => {
    const e = await asFacadeRejects({ url: NODE_URL, reason: 'boom', txData: TX_BYTES }, true);
    // This is the leak: Effect's own message for it holds the bytes as {"0":11,"1":48,...}.
    expect((e as Error).message).toContain('"txData":{"0":');
    const line = describeError(e);
    noLeak(line);
    expect(line).not.toContain('boom');
    expect(nodeRefusal(e)).toBeUndefined();
  });

  it('a defect with a JSON toString, and errors inside Sequential and Parallel causes', async () => {
    const obj = { txData: Array.from(TX_BYTES), toString: () => JSON.stringify({ txData: Array.from(TX_BYTES) }) };
    noLeak(describeError(await asFacadeRejects(obj, true)));
    const seq = await rejectsWith(Cause.sequential(Cause.empty, Cause.die(new Error(`x ${NODE_URL}`))));
    noLeak(describeError(seq));
    const par = await rejectsWith(
      Cause.parallel(
        Cause.interrupt(1 as never),
        Cause.fail(new NodeSubmissionError({ message: 'Transaction submission failed', txData: TX_BYTES, cause: rpcError('1010: Invalid Transaction: Custom error: 9', 1010) })),
      ),
    );
    expect(nodeRefusal(par)).toBe('9');
  });

  it('never logs the transaction bytes the node-client error carries', async () => {
    const e = await asFacadeRejects(new NodeInvalidError({ message: 'Transaction is invalid and was rejected by the node', txData: TX_BYTES }));
    const line = describeError(e);
    expect(line).toContain('TransactionInvalidError: Transaction is invalid');
    noLeak(line);
  });

  it('is one line of at most 500 characters, and stops on a loop', () => {
    const a = new Error('a '.repeat(400)) as Error & { cause?: unknown };
    a.cause = a;
    const line = describeError(a);
    expect(line.length).toBeLessThanOrEqual(MAX_ERROR_TEXT);
    expect(line).not.toContain('\n');
    expect(errorChain(a)).toHaveLength(1);
    const b = new Error('b') as Error & { cause?: unknown };
    const c = new Error('c', { cause: b });
    b.cause = c;
    expect(errorChain(b)).toHaveLength(2);
  });

  it('never throws: getters that throw, Proxies, revoked Proxies', () => {
    const getter = {
      get name(): string {
        throw new Error('getter');
      },
      get message(): string {
        throw new Error('getter');
      },
      get cause(): unknown {
        throw new Error('getter');
      },
    };
    const proxy = new Proxy(
      {},
      {
        get() {
          throw new Error('proxy');
        },
        getPrototypeOf() {
          throw new Error('proxy');
        },
      },
    );
    const { proxy: revoked, revoke } = Proxy.revocable({}, {});
    revoke();
    for (const e of [getter, proxy, revoked]) {
      expect(() => describeError(e)).not.toThrow();
      expect(() => errorChain(e)).not.toThrow();
      expect(() => messageOf(e)).not.toThrow();
      expect(() => nodeRefusal(e)).not.toThrow();
      expect(hasName(e, 'NotSentError')).toBe(false);
      expect(field(e, 'retryable')).toBeUndefined();
      expect(nodeRefusal(e)).toBeUndefined();
    }
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

  it('removes hex of 64 digits or more (a seed, a key, transaction bytes)', () => {
    expect(SEED).toHaveLength(64);
    const out = redact(`seed ${SEED} and 0x${TX_HEX}`);
    expect(out).not.toMatch(/[0-9a-f]{64}/i);
    expect(out).toContain('[hex 64]');
    expect(describeError(new Error(`bad key ${SEED}`))).not.toContain(SEED);
  });

  it('keeps short hex', () => {
    expect(redact('custom error 0xdeadbeef')).toBe('custom error 0xdeadbeef');
  });

  it('removes bytes in every printed form: a list, a JSON index map, a JSON array, a Buffer', () => {
    const bytes = Array.from(TX_BYTES.slice(0, 60));
    expect(redact(`txData: ${bytes.join(',')}`)).toBe('txData: [bytes]');
    expect(redact(`txData: [${bytes.join(', ')}]`)).toBe('txData: [[bytes]]');
    const map = JSON.stringify({ txData: TX_BYTES.slice(0, 60) });
    noLeak(redact(`bad: ${map}`));
    const buf = `<Buffer ${bytes.map((v) => v.toString(16).padStart(2, '0')).join(' ')} ... 250 more bytes>`;
    expect(redact(buf)).toBe('<Buffer [bytes] ... 250 more bytes>');
    noLeak(describeError(new Error(`bad: ${map}`)));
  });

  it('removes Blockfrost project ids, short ones and any project_id parameter, and long tokens', () => {
    expect(describeError(new Error(`Could not connect to ${NODE_URL}`))).not.toContain(PID);
    expect(redact('wss://x/?project_id=mainnetShort123&a=1')).toBe('wss://x/?project_id=[id]&a=1');
    expect(redact('project_id%3Dabc')).toBe('project_id=[id]');
    expect(redact('wss://rpc.example/midnightmainnetAb12Cd')).not.toContain('Ab12Cd');
    expect(redact('wss://rpc.example/preprodAb12Cd34')).toBe('wss://rpc.example/[id]');
    const token = 'tok_' + 'Zx9'.repeat(15);
    expect(redact(`x-operator-token: ${token}`)).not.toContain(token);
  });

  describe('recovery phrases', () => {
    const disjoint = ['the', 'and', 'not', 'for', 'was', 'has', 'its', 'but', 'with', 'from', 'are', 'been', 'your', 'were'];
    it('the words that mark ordinary English are none of them BIP-39 words', () => {
      // error-chain.ts NOT_BIP39: if one of these were a BIP-39 word, a phrase could slip through.
      const list = new Set(wordlist);
      for (const w of disjoint) expect(list.has(w)).toBe(false);
      const src = 'the and not for was has its but with from are been your were them than which could would should our his her she him did does their while these those after most being had may might shall cannot yet each both here how why who whom whose get got made out per via';
      for (const w of src.split(' ')) expect(list.has(w), w).toBe(false);
    });

    it('catches real phrases, 12 and 24 words, in any case, numbered, as a JSON array, comma-separated', () => {
      for (let i = 0; i < 200; i++) {
        const words = generateMnemonic(wordlist, i % 2 ? 128 : 256).split(' ');
        const forms = [
          words.join(' '),
          words.join(' ').toUpperCase(),
          words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' '),
          words.map((w, n) => `${n + 1}. ${w}`).join(' '),
          words.map((w, n) => `${n + 1}) ${w}`).join('\n'),
          JSON.stringify(words),
          words.join(', '),
        ];
        for (const f of forms) {
          const out = describeError(new Error(`could not read ${f} here`));
          // No three phrase words in a row survive anywhere.
          for (let k = 0; k + 2 < words.length; k++) {
            expect(out.toLowerCase()).not.toContain(`${words[k]} ${words[k + 1]} ${words[k + 2]}`);
          }
          expect(out).toContain('[words]');
        }
      }
    });

    it('a phrase hidden in a cause chain does not survive', async () => {
      const e = await asFacadeRejects(new NodeSubmissionError({ message: 'Transaction submission failed', txData: TX_BYTES, cause: new Error(`${SEED} ${PHRASE}`) }));
      const line = describeError(e);
      expect(line).not.toContain(SEED);
      expect(line).not.toContain('abandon');
    });

    it('leaves ordinary English alone', () => {
      const plain = [
        'The sponsor could not add its fee payment because the wallet has not finished syncing with the network yet',
        'Transaction did not reach desired stage and no other error was reported',
        'Node accepted the connection but repeatedly failed to answer RPC',
        'Could not connect before the configured reconnectionTimeout elapsed',
        'Transaction got dropped, the mempool likely is full and network congested',
        'Paying the fee with Dust may wait up to two minutes for the wallet Dust trees to reach a recent block',
        'The submission service was closed before it connected to the node, please check your settings and then try again later',
      ];
      for (const p of plain) expect(redact(p)).toBe(p);
    });
  });
});

describe('node refusals through the real error shape', () => {
  it('a 1010 behind a FiberFailure is a refusal (it was never admitted)', async () => {
    const e = await asFacadeRejects(
      new NodeSubmissionError({
        message: 'Transaction submission failed',
        txData: TX_BYTES,
        cause: rpcError('1010: Invalid Transaction: Custom error: 171', 1010),
      }),
    );
    expect(nodeRefusal(e)).toBe('171');
    expect(isStaleDustTime(e)).toBe(true);
  });

  it('"1010" and "Invalid Transaction" must be in the same link', async () => {
    // A WebSocket close code 1010 in one link, an unrelated "invalid transaction" in another.
    const e = await asFacadeRejects(
      Object.assign(new Error('the pool said: invalid transaction somewhere'), {
        cause: Object.assign(new Error('disconnected from node: 1010:: Missing Extension'), { code: 1010 }),
      }),
    );
    expect(nodeRefusal(e)).toBeUndefined();
    // The custom error number comes from the refusing link, not another one.
    const f = Object.assign(new Error('1010: Invalid Transaction'), { cause: new Error('Custom error: 171') });
    expect(nodeRefusal(f)).toBe('none');
    expect(isStaleDustTime(f)).toBe(false);
  });

  it('a transaction the pool later marks invalid, a drop or a lost socket stays "may have been sent"', async () => {
    const invalid = await asFacadeRejects(new NodeInvalidError({ message: 'Transaction is invalid and was rejected by the node', txData: TX_BYTES }));
    expect(nodeRefusal(invalid)).toBeUndefined();
    const lost = await asFacadeRejects({ _tag: 'ConnectionError', message: `Could not connect to ${NODE_URL}` });
    expect(nodeRefusal(lost)).toBeUndefined();
    noLeak(describeError(lost));
    expect(isStaleDustTime(lost)).toBe(false);
  });
});
