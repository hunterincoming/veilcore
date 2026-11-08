// What an error says, safe to log: each link's name, message and code, nothing else.
//
// Why this exists. The wallet SDK submits through Effect and hands back what Effect's
// runPromise rejects with: a FiberFailure named "(FiberFailure) SubmissionError", message
// "Transaction submission error", and NO `cause` property. The node's own answer (for a
// refusal, "1010: Invalid Transaction: Custom error: N") sits two links down, inside the
// Effect Cause kept under a symbol. Reading `e.message` and `e.cause` sees none of it.
//
// What is never logged:
//   - any field other than name, message and code. The wallet SDK's node-client errors carry
//     the transaction bytes (`txData`); those are not read.
//   - a FiberFailure's own message when the failure inside it can be read. Effect writes that
//     message itself, and for a failure that is not an Error it is the whole object as JSON
//     (txData included). The failure inside is logged as the next link instead.
// Text that is read is still redacted (redact below): long hex, bytes in any printed form,
// anything shaped like a recovery phrase, Blockfrost project ids, long tokens. The
// process-wide scrub (log.ts scrubOutput) still runs after this.
//
// Nothing here throws, whatever it is handed (getters that throw, Proxies, loops): it runs
// inside the catch that settles or releases a fee, and logging must never change what happens.
// SPDX-License-Identifier: Apache-2.0

/** Where Effect's FiberFailure keeps the Cause it failed with (effect 3: Runtime.FiberFailureCauseId). */
const FIBER_FAILURE_CAUSE = Symbol.for('effect/Runtime/FiberFailure/Cause');

export type ErrorLink = { readonly name: string; readonly message: string; readonly code?: string };

const MAX_LINKS = 8;

/** One property, or undefined if reading it throws. */
const read = (o: unknown, key: string | symbol): unknown => {
  try {
    return (o as Record<string | symbol, unknown>)[key];
  } catch {
    return undefined;
  }
};

const isObject = (v: unknown): v is object => {
  try {
    return (typeof v === 'object' || typeof v === 'function') && v !== null;
  } catch {
    return false;
  }
};

/** The first failure an Effect Cause holds: a Fail's error, else a Die's defect. */
const fromEffectCause = (cause: unknown, depth = 0): unknown => {
  if (depth > 16 || !isObject(cause)) return undefined;
  switch (read(cause, '_tag')) {
    case 'Fail':
      return read(cause, 'error');
    case 'Die':
      return read(cause, 'defect');
    case 'Sequential':
    case 'Parallel':
      return fromEffectCause(read(cause, 'left'), depth + 1) ?? fromEffectCause(read(cause, 'right'), depth + 1);
    default:
      return undefined;
  }
};

/** The failure inside an Effect FiberFailure, or undefined when `e` is not one (or it holds none). */
const insideFiberFailure = (e: unknown): unknown =>
  isObject(e) ? fromEffectCause(read(e, FIBER_FAILURE_CAUSE)) : undefined;

/** The error an error was caused by: its `cause`, or the failure inside an Effect FiberFailure. */
const next = (e: unknown): unknown => {
  if (!isObject(e)) return undefined;
  const own = read(e, 'cause');
  return own !== undefined ? own : insideFiberFailure(e);
};

const text = (v: unknown): string => {
  try {
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'bigint' || typeof v === 'boolean') return String(v);
  } catch {
    // fall through
  }
  return '';
};

/** One link: name (or Effect's `_tag`), message, code. Nothing else is read from it. */
const link = (e: unknown): ErrorLink => {
  if (!isObject(e)) return { name: typeof e, message: text(e) };
  const name = text(read(e, 'name')) || text(read(e, '_tag')) || 'Error';
  const code = text(read(e, 'code'));
  // A FiberFailure's message is Effect's rendering of the failure inside (JSON for a plain
  // object): when that failure can be read, it is the next link, and this message is not used.
  const message = insideFiberFailure(e) !== undefined ? '' : text(read(e, 'message'));
  return { name, message, ...(code ? { code } : {}) };
};

/** The error and what caused it, outermost first, at most eight links. Never loops, never throws. */
export const errorChain = (e: unknown): ErrorLink[] => {
  const out: ErrorLink[] = [];
  try {
    const seen = new Set<unknown>();
    let cur: unknown = e;
    while (cur !== undefined && cur !== null && out.length < MAX_LINKS && !seen.has(cur)) {
      seen.add(cur);
      out.push(link(cur));
      cur = next(cur);
    }
  } catch {
    if (out.length === 0) out.push({ name: 'unreadable', message: '' });
  }
  return out;
};

/** Whether `e` carries this name (our NotSentError, for one). Never throws. */
export const hasName = (e: unknown, name: string): boolean => isObject(e) && read(e, 'name') === name;

/** A property of an error, or undefined; never throws. */
export const field = (e: unknown, key: string): unknown => (isObject(e) ? read(e, key) : undefined);

// --- redaction ---------------------------------------------------------------------------

// Common English words that are NOT in the BIP-39 English list (error-chain.test.ts checks
// that against the list itself). A run of words with one of these in it is a sentence, not a
// recovery phrase; with words under 3 or over 8 letters ("to", "of", "is", "transaction"),
// which BIP-39 never has, they keep ordinary text out of the phrase rule.
const NOT_BIP39 = new Set(
  (
    'the and not for was has its but with from are been your were them than which could would should our ' +
    'his her she him did does their while these those after most being had may might shall cannot yet each ' +
    'both here how why who whom whose get got made out per via'
  ).split(' '),
);
// A word as BIP-39 writes it (3 to 8 letters, any case here), and what may sit between the
// words of a written-out phrase: spaces, commas, quotes, brackets, and numbering ("1. ", "2) ").
const PHRASE_RUN =
  /(?<![A-Za-z])[A-Za-z]{3,8}(?![A-Za-z])(?:(?:[\s,"'[\]().:;-]|\d{1,2}(?=[\s.):,]))+(?<![A-Za-z])[A-Za-z]{3,8}(?![A-Za-z])){11,}/g;
const PHRASE_WORD = /[A-Za-z]+/g;

/** Twelve or more phrase-shaped words in a row, none of them a common non-BIP-39 word, become [words]. */
const redactPhrases = (s: string): string =>
  s.replace(PHRASE_RUN, (run) => {
    // Split the run where a common English word sits, and redact each part of 12+ words.
    const words = [...run.matchAll(PHRASE_WORD)];
    const spans: [number, number][] = [];
    let start = -1;
    let count = 0;
    const close = (endIdx: number) => {
      if (count >= 12 && start >= 0) spans.push([words[start].index ?? 0, endIdx]);
      start = -1;
      count = 0;
    };
    words.forEach((w, i) => {
      const lower = w[0].toLowerCase();
      if (w[0].length < 3 || w[0].length > 8 || NOT_BIP39.has(lower)) {
        close(i > 0 ? (words[i - 1].index ?? 0) + words[i - 1][0].length : 0);
        return;
      }
      if (start < 0) start = i;
      count++;
    });
    if (words.length > 0) close((words[words.length - 1].index ?? 0) + words[words.length - 1][0].length);
    let out = run;
    for (const [a, b] of spans.reverse()) out = `${out.slice(0, a)}[words]${out.slice(b)}`;
    return out;
  });

// 64 or more hex digits: a 32-byte seed or key, or transaction bytes.
const LONG_HEX = /(?:0x)?[0-9a-fA-F]{64,}/g;
// Bytes printed as numbers: "12,255,3,..." (a Uint8Array as text).
const BYTE_LIST = /\b\d{1,3}(?:\s*,\s*\d{1,3}){15,}\b/g;
// Bytes as JSON writes a Uint8Array: {"0":11,"1":48,...}.
const BYTE_MAP = /(?:"\d+"\s*:\s*\d{1,3}\s*,\s*){8,}"\d+"\s*:\s*\d{1,3}/g;
// Bytes as Node prints a Buffer: <Buffer 0b 30 55 ...>, or any run of space-separated hex bytes.
const BYTE_HEX_WORDS = /\b(?:[0-9a-fA-F]{2}\s+){15,}[0-9a-fA-F]{2}\b/g;
// A Blockfrost project id, short ones included (mainnet…, preprod…, preview…), and any
// project_id= parameter whatever it holds.
const PROJECT_PARAM = /project_id(?:=|%3D)[^&\s"']+/gi;
const PROJECT_ID = /(?:mainnet|preprod|preview)[A-Za-z0-9]{6,}/g;
// Any other long unbroken run of key-like characters (tokens, base64).
const LONG_TOKEN = /[A-Za-z0-9+/_=-]{40,}/g;

/** Text with anything that could be a secret or transaction bytes replaced. Never throws. */
export const redact = (s: string): string => {
  try {
    return redactPhrases(
      s
        .replace(BYTE_MAP, '[bytes]')
        .replace(LONG_HEX, (m) => `[hex ${m.length}]`)
        .replace(BYTE_HEX_WORDS, '[bytes]')
        .replace(BYTE_LIST, '[bytes]')
        .replace(PROJECT_PARAM, 'project_id=[id]')
        .replace(PROJECT_ID, '[id]')
        .replace(LONG_TOKEN, '[token]'),
    );
  } catch {
    return '(unreadable text)';
  }
};

/** The longest line describeError returns. */
export const MAX_ERROR_TEXT = 500;

/**
 * One line for the log: "Name: message [code] <- Cause: message <- ...", redacted, at most
 * MAX_ERROR_TEXT characters. Never throws: '(unreadable error)' if anything goes wrong.
 */
export const describeError = (e: unknown): string => {
  try {
    const line = errorChain(e)
      .map((l) => `${l.name}${l.message ? `: ${l.message}` : ''}${l.code ? ` [code ${l.code}]` : ''}`)
      .join(' <- ');
    const safe = redact(line.replace(/\s+/g, ' ').trim());
    return safe.length > MAX_ERROR_TEXT ? `${safe.slice(0, MAX_ERROR_TEXT - 1)}…` : safe;
  } catch {
    return '(unreadable error)';
  }
};

/** An error's own message, redacted, for an outcome line; never throws. */
export const messageOf = (e: unknown): string => {
  try {
    if (!isObject(e)) return redact(text(e) || String(e));
    return redact(text(read(e, 'message')));
  } catch {
    return '(unreadable error)';
  }
};
