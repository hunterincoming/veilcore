// Reading a batch root out of a VeilCore contract state, as the indexer hands it over (hex
// of the serialized ContractState the network recorded right after a call). Kept apart from
// anchor-check.ts so the Midnight runtime (WebAssembly) loads only when a check runs, not
// with the check page itself.
// SPDX-License-Identifier: Apache-2.0

import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';

const hexToBytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));
const bytesToHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/**
 * The contract's `lastBatchRoot` cell in that state: the root the call wrote. Throws when
 * the bytes are not a contract state with VeilCore's ledger layout.
 */
export const lastBatchRootOf = (stateHex: string): string =>
  bytesToHex(ledger(ContractState.deserialize(hexToBytes(stateHex)).data).lastBatchRoot);
