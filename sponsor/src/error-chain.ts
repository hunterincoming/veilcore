// What an error says, safe to log: each link's name, message and code, nothing else.
//
// Why this exists. The wallet SDK submits through Effect and hands back what Effect's
// runPromise rejects with: a FiberFailure named "(FiberFailure) SubmissionError", message
// "Transaction submission error", and NO `cause` property. The node's own answer (for a
// refusal, "1010: Invalid Transaction: Custom error: N") sits two links down, inside the
// Effect Cause kept under a symbol. Reading `e.message` and `e.cause` sees none of it.
//
// What is never logged: any field other than name, message and code. The wallet SDK's
// node-client errors carry the transaction bytes (`txData`); those are not read. Text that
// is read is still redacted (redact below): long hex (seeds, keys, transaction bytes), runs
// of bytes printed as numbers, anything shaped like a recovery phrase, a Blockfrost project
// id, or a long token. The process-wide scrub (log.ts scrubOutput) still runs after this.
// SPDX-License-Identifier: Apache-2.0

/** Where Effect's FiberFailure keeps the Cause it failed with (effect 3: Runtime.FiberFailureCauseId). */
const FIBER_FAILURE_CAUSE = Symbol.for('effect/Runtime/FiberFailure/Cause');

export type ErrorLink = { readonly name: string; readonly message: string; readonly code?: string };

const MAX_LINKS = 8;

/** The first failure an Effect Cause holds: a Fail's error, else a Die's defect. */
const fromEffectCause = (cause: unknown, depth = 0): unknown => {
  if (depth > 16 || typeof cause !== 'object' || cause === null) return undefined;
  const c = cause as { _tag?: unknown; error?: unknown; defect?: unknown; left?: unknown; right?: unknown };
  switch (c._tag) {
    case 'Fail':
      return c.error;
    case 'Die':
      return c.defect;
    case 'Sequential':
    case 'Parallel':
      return fromEffectCause(c.left, depth + 1) ?? fromEffectCause(c.right, depth + 1);
    default:
      return undefined;
  }
};

/** The error an error was caused by: its `cause`, or the failure inside an Effect FiberFailure. */
const next = (e: unknown): unknown => {
  if (typeof e !== 'object' || e === null) return undefined;
  const own = (e as { cause?: unknown }).cause;
  if (own !== undefined) return own;
  return fromEffectCause((e as Record<symbol, unknown>)[FIBER_FAILURE_CAUSE]);
};

const text = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'bigint' || typeof v === 'boolean') return String(v);
  return '';
};

/** One link: name (or Effect's `_tag`), message, code. Nothing else is read from it. */
const link = (e: unknown): ErrorLink => {
  if (typeof e !== 'object' || e === null) return { name: typeof e, message: text(e) };
  const o = e as { name?: unknown; _tag?: unknown; message?: unknown; code?: unknown };
  const name = text(o.name) || text(o._tag) || 'Error';
  const code = text(o.code);
  return { name, message: text(o.message), ...(code ? { code } : {}) };
};

/** The error and what caused it, outermost first, at most eight links, never looping. */
export const errorChain = (e: unknown): ErrorLink[] => {
  const out: ErrorLink[] = [];
  const seen = new Set<unknown>();
  let cur: unknown = e;
  while (cur !== undefined && cur !== null && out.length < MAX_LINKS && !seen.has(cur)) {
    seen.add(cur);
    out.push(link(cur));
    cur = next(cur);
  }
  return out;
};

/** Every message in the chain, for matching what the node said (wallet.ts nodeRefusal). Not for logging. */
export const chainText = (e: unknown): string =>
  errorChain(e)
    .map((l) => `${l.name} ${l.message}${l.code ? ` ${l.code}` : ''}`)
    .join(' | ');

// Twelve or more short lowercase words in a row: the shape of a BIP-39 recovery phrase.
const PHRASE = /\b(?:[a-z]{3,8}[\s,]+){11,}[a-z]{3,8}\b/g;
// 64 or more hex digits: a 32-byte seed or key, or transaction bytes.
const LONG_HEX = /(?:0x)?[0-9a-fA-F]{64,}/g;
// Bytes printed as numbers ("12,255,3,..."), as a Uint8Array turns into text.
const BYTE_LIST = /\b\d{1,3}(?:\s*,\s*\d{1,3}){15,}\b/g;
// A Blockfrost project id (mainnet…, preprod…, preview…).
const PROJECT_ID = /\b(?:mainnet|preprod|preview)[A-Za-z0-9]{16,}\b/g;
// Any other long unbroken run of key-like characters (tokens, base64).
const LONG_TOKEN = /[A-Za-z0-9+/_=-]{40,}/g;

/** Text with anything that could be a secret or transaction bytes replaced. */
export const redact = (s: string): string =>
  s
    .replace(PHRASE, '[words]')
    .replace(LONG_HEX, (m) => `[hex ${m.length}]`)
    .replace(BYTE_LIST, '[bytes]')
    .replace(PROJECT_ID, '[id]')
    .replace(LONG_TOKEN, '[token]');

/** The longest line describeError returns. */
export const MAX_ERROR_TEXT = 500;

/**
 * One line for the log: "Name: message [code] <- Cause: message <- ...", redacted, at most
 * MAX_ERROR_TEXT characters.
 */
export const describeError = (e: unknown): string => {
  const line = errorChain(e)
    .map((l) => `${l.name}: ${l.message}${l.code ? ` [code ${l.code}]` : ''}`)
    .join(' <- ');
  const safe = redact(line.replace(/\s+/g, ' ').trim());
  return safe.length > MAX_ERROR_TEXT ? `${safe.slice(0, MAX_ERROR_TEXT - 1)}…` : safe;
};
