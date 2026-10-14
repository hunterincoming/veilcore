// The challenges this browser made as a checker (ownership-check.ts), kept apart from the
// chain code so making one never waits on loading the network libraries.
// SPDX-License-Identifier: Apache-2.0

const BOOK = 'veilcore.verifier-challenges.v1';
const LIFETIME_MS = 24 * 60 * 60_000;
// A challenge sent as a link (prove-relay.ts) is answered when the holder gets to it,
// maybe days later in a new tab, so it is kept in this browser's local storage for as
// long as the request lives. It is still this browser's own challenge, used once.
const LASTING_BOOK = 'veilcore.verifier-challenges.lasting.v1';
const LASTING_MS = 7 * 24 * 60 * 60_000;

type Book = Record<string, { issuedAt: number; used?: boolean }>;

const storeOf = (lasting: boolean): Storage | undefined => {
  try {
    return lasting ? localStorage : sessionStorage;
  } catch {
    return undefined;
  }
};
const read = (lasting = false): Book => {
  try {
    const raw = storeOf(lasting)?.getItem(lasting ? LASTING_BOOK : BOOK);
    return raw ? (JSON.parse(raw) as Book) : {};
  } catch {
    return {};
  }
};
const write = (b: Book, lasting = false): void => {
  try {
    storeOf(lasting)?.setItem(lasting ? LASTING_BOOK : BOOK, JSON.stringify(b));
  } catch {
    /* private mode: the challenge works for this page only */
  }
};
const memory: Book = {};

/**
 * A fresh challenge, remembered by this tab; with `lasting`, by this browser for a week
 * (a challenge sent as a link, answered whenever the holder gets to it).
 */
export const newChallenge = (now = Date.now(), { lasting = false }: { lasting?: boolean } = {}): string => {
  const c = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
  const book = { ...read(lasting), [c]: { issuedAt: now } };
  const life = lasting ? LASTING_MS : LIFETIME_MS;
  for (const [k, v] of Object.entries(book)) if (now - v.issuedAt > life) delete book[k];
  memory[c] = { issuedAt: now };
  write(book, lasting);
  return c;
};

export const lookupChallenge = (c: string) => {
  const used = read()[c]?.used || read(true)[c]?.used || memory[c]?.used;
  const found = read()[c] ?? read(true)[c] ?? memory[c];
  return found && { ...found, used };
};
export const useChallenge = (c: string): void => {
  memory[c] = { ...(memory[c] ?? { issuedAt: Date.now() }), used: true };
  for (const lasting of [false, true]) {
    const b = read(lasting);
    if (b[c]) {
      b[c] = { ...b[c], used: true };
      write(b, lasting);
    }
  }
};
