// Reading VeilCore's version 1 contract state with nothing but Midnight's own ledger packages,
// at fixed versions, so a v1 record stays checkable for as long as those versions can be
// installed (contract v2 plan, 3.6: "the v1 decoder is ledger-v8 at a fixed version").
//
// Why its own module: until now the check page read v1 states through the compiled contract's
// `ledger()` (Compact runtime 0.16) and midnight-js 5's ledger 8 era (contract/src/contract-state.ts).
// midnight-js keeps that era only while ledger 8 contracts are common, and may drop it in a
// later major version with no date given. This module imports neither: only
//   - @midnightntwrk/ledger-v8 8.1.3, for state bytes in ledger 8's format (every call made
//     before Midnight's Ledger 9 fork, mainnet 6 Nov 2026), and
//   - @midnightntwrk/ledger-v9 1.0.2, for the same contract's state after the fork, which the
//     network re-expresses in ledger 9's format.
// Both are pinned exactly in bboard-ui/package.json and the lockfile; v1-decoder.test.ts fails
// if either pin moves, or if this file imports anything else.
//
// v1's layout, from the compiled contract (compactc 0.31.1, contract/src/veilcore.compact): the
// ledger is an array; `lastBatchRoot` is element 0 of element 1, a cell holding one Bytes<32>.
// The cell stores its bytes with trailing zero bytes dropped, so they are padded back to 32, as
// the Compact runtime's Bytes<32> does. Anything else is refused, never guessed at.
// SPDX-License-Identifier: Apache-2.0

import * as Ledger8 from '@midnightntwrk/ledger-v8';
import * as Ledger9 from '@midnightntwrk/ledger-v9';

/** The exact package versions this module was checked against (v1-decoder.test.ts). */
export const V1_DECODER_PINS = { '@midnightntwrk/ledger-v8': '8.1.3', '@midnightntwrk/ledger-v9': '1.0.2' } as const;

/**
 * The tag each ledger writes at the start of a serialized contract state. Ledger 8 writes
 * format v6, ledger 9 format v8 (midnight-js-utils LEDGER_STATE_TAGS).
 */
const STATE_TAGS = {
  ledger8: 'midnight:contract-state[v6]:',
  ledger9: 'midnight:contract-state[v8]:',
} as const;
export type StateLedger = keyof typeof STATE_TAGS;

/** Which ledger wrote these contract-state bytes, from their own tag; undefined for anything else. */
export const stateLedgerOf = (bytes: Uint8Array): StateLedger | undefined => {
  for (const era of Object.keys(STATE_TAGS) as StateLedger[]) {
    const tag = STATE_TAGS[era];
    if (bytes.length > tag.length && tag.split('').every((c, i) => bytes[i] === c.charCodeAt(0))) return era;
  }
  return undefined;
};

/** The few StateValue methods this module reads; both ledgers' StateValue have them. */
type Value = {
  type(): string;
  asArray(): Value[] | undefined;
  asCell(): { value: Uint8Array[]; alignment: unknown };
};

const hexToBytes = (hex: string): Uint8Array => {
  const h = hex.trim().replace(/^0x/i, '');
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(h)) throw new Error('A contract state is hex.');
  return Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));
};
const bytesToHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** The contract's ledger data, decoded by the ledger whose tag the bytes carry. */
const ledgerDataOf = (bytes: Uint8Array): Value => {
  const era = stateLedgerOf(bytes);
  if (era === 'ledger8') return Ledger8.ContractState.deserialize(bytes).data.state;
  if (era === 'ledger9') return Ledger9.ContractState.deserialize(bytes).data.state;
  throw new Error('Not a contract state from ledger 8 or ledger 9.');
};

const elementOf = (v: Value, i: number): Value => {
  const arr = v.type() === 'array' ? v.asArray() : undefined;
  const e = arr?.[i];
  if (e === undefined) throw new Error('Not VeilCore version 1’s ledger layout.');
  return e;
};

/** True when a cell's alignment is exactly one 32-byte atom, as Bytes<32> is. */
const isBytes32 = (alignment: unknown): boolean => {
  if (!Array.isArray(alignment) || alignment.length !== 1) return false;
  const a = alignment[0] as { tag?: unknown; value?: { tag?: unknown; length?: unknown } } | null;
  return a?.tag === 'atom' && a.value?.tag === 'bytes' && a.value.length === 32;
};

/**
 * The `lastBatchRoot` cell of a v1 contract state (hex, with or without 0x, as an indexer
 * hands it over): the batch root the call wrote, as 64 lowercase hex characters. Throws when
 * the bytes are not a ledger 8 or ledger 9 contract state with v1's layout.
 */
export const v1LastBatchRootOf = (stateHex: string): string => {
  const cellValue = elementOf(elementOf(ledgerDataOf(hexToBytes(stateHex)), 1), 0);
  if (cellValue.type() !== 'cell') throw new Error('Not VeilCore version 1’s ledger layout.');
  const cell = cellValue.asCell();
  if (!isBytes32(cell.alignment) || cell.value.length !== 1 || cell.value[0].length > 32)
    throw new Error('VeilCore version 1’s lastBatchRoot is not 32 bytes in that state.');
  const out = new Uint8Array(32);
  out.set(cell.value[0], 0);
  return bytesToHex(out);
};
