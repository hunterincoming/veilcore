// Reading `lastBatchRoot` out of a VeilCore contract version 2 state, by v2's ledger layout, with
// nothing but the state value's own methods. Shared by the site's v2 decoder
// (bboard-ui/src/veilcore/chain/v2-decoder.ts, on Midnight's ledger-v9 package) and the partner
// kit (partner-kit/src/verify.ts, on a state carried into Compact runtime 0.16), so the two read
// v2 the same way.
//
// v2's layout, from its compiled contract (compactc 0.36.1, contract-v2/src/veilcore.compact): the
// ledger is an array; its first element holds the 14 fields from `protocolVersion` to
// `lastAnchor` (v1's holds 12: v2 adds `contractVersion` and `predecessor`), and `lastBatchRoot`
// is element 0 of element 1, a cell holding one Bytes<32>. The cell stores its bytes with
// trailing zero bytes dropped, so they are padded back to 32. contract-v2's checker-fixture test
// rebuilds the fixture these readers are tested on from v2's compiled contract, so a change to
// the layout fails there first.
//
// This reads the layout only. Which contract a state is from comes from the pinned address
// (pinned-contracts.ts), never from the state, and never from its `contractVersion` field.
// SPDX-License-Identifier: Apache-2.0

/** The few StateValue methods read here; every Midnight runtime's StateValue has them. */
export type ValueLike = {
  type(): string;
  asArray(): ValueLike[] | undefined;
  asCell(): { value: Uint8Array[]; alignment: unknown };
};

/** How many fields v2's first ledger group holds (v1's holds 12). */
export const V2_FIRST_GROUP = 14;

const NOT_V2 = 'Not VeilCore version 2’s ledger layout.';

const arrayOf = (v: ValueLike | undefined): ValueLike[] => {
  const a = v !== undefined && v.type() === 'array' ? v.asArray() : undefined;
  if (a === undefined) throw new Error(NOT_V2);
  return a;
};

/** True when a cell's alignment is exactly one 32-byte atom, as Bytes<32> is. */
const isBytes32 = (alignment: unknown): boolean => {
  if (!Array.isArray(alignment) || alignment.length !== 1) return false;
  const a = alignment[0] as { tag?: unknown; value?: { tag?: unknown; length?: unknown } } | null;
  return a?.tag === 'atom' && a.value?.tag === 'bytes' && a.value.length === 32;
};

/**
 * v2's `lastBatchRoot` in a state's ledger data: the batch root the call wrote, 32 bytes. Throws
 * when the data does not have v2's layout; nothing is guessed.
 */
export const v2LastBatchRoot = (data: ValueLike): Uint8Array => {
  const top = arrayOf(data);
  if (arrayOf(top[0]).length !== V2_FIRST_GROUP) throw new Error(NOT_V2);
  const cellValue = arrayOf(top[1])[0];
  if (cellValue === undefined || cellValue.type() !== 'cell') throw new Error(NOT_V2);
  const cell = cellValue.asCell();
  if (!isBytes32(cell.alignment) || cell.value.length !== 1 || cell.value[0].length > 32)
    throw new Error('VeilCore version 2’s lastBatchRoot is not 32 bytes in that state.');
  const out = new Uint8Array(32);
  out.set(cell.value[0], 0);
  return out;
};
