// Reading VeilCore's version 2 contract state with nothing but Midnight's ledger 9 package, at
// the version v1-decoder.ts pins (docs/contract-v2.md 3.2: "the decoder, chosen by the state's
// era tag"). v2 is a ledger 9 contract from its first transaction, so a state in any other
// ledger's format is refused. The layout is read by api/src/batch-root-layout.ts, which the
// partner kit shares, so the site and the kit read v2 the same way.
//
// Which decoder reads a state is chosen by the pinned contract the call was on (config.ts
// ANCHOR_CONTRACTS, from deployments/mainnet.json), never by the state's own version fields.
// SPDX-License-Identifier: Apache-2.0

import * as Ledger9 from '@midnightntwrk/ledger-v9';
import { v2LastBatchRoot, type ValueLike } from '../../../../api/src/batch-root-layout';
import { type MaintenanceAuthority, stateLedgerOf } from './v1-decoder';

const hexToBytes = (hex: string): Uint8Array => {
  const h = hex.trim().replace(/^0x/i, '');
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(h)) throw new Error('A contract state is hex.');
  return Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));
};

/** A v2 contract state: ledger 9 bytes only. */
const v2StateOf = (stateHex: string): Ledger9.ContractState => {
  const bytes = hexToBytes(stateHex);
  if (stateLedgerOf(bytes) !== 'ledger9')
    throw new Error('Not a ledger 9 contract state: VeilCore version 2 has no other.');
  return Ledger9.ContractState.deserialize(bytes);
};

/**
 * The `lastBatchRoot` cell of a v2 contract state (hex, with or without 0x, as an indexer hands
 * it over): the batch root the call wrote, as 64 lowercase hex characters. Throws when the bytes
 * are not a ledger 9 contract state with v2's layout.
 */
export const v2LastBatchRootOf = (stateHex: string): string => {
  const data = v2StateOf(stateHex).data.state as unknown as ValueLike;
  return Array.from(v2LastBatchRoot(data), (x) => x.toString(16).padStart(2, '0')).join('');
};

/**
 * The maintenance authority in a v2 contract state (ledger 9 bytes): its committee, threshold
 * and counter, as the network recorded them. Never v2's own `contractVersion` or similar fields.
 */
export const v2MaintenanceAuthorityOf = (stateHex: string): MaintenanceAuthority => {
  const a = v2StateOf(stateHex).maintenanceAuthority;
  return { committee: [...a.committee], threshold: a.threshold, counter: a.counter };
};
