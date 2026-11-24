// Reading a batch root out of a VeilCore contract state, as the indexer hands it over (hex
// of the serialized ContractState the network recorded right after a call). Kept apart from
// anchor-check.ts so the Midnight ledger (WebAssembly) loads only when a check runs, not
// with the check page itself.
//
// The decoder is picked by which pinned contract the call was on (config.ts ANCHOR_CONTRACTS,
// from deployments/mainnet.json), never by what the bytes or the registry say: version 1 by
// v1-decoder.ts, version 2 by v2-decoder.ts, each with Midnight's ledger packages at fixed versions.
// SPDX-License-Identifier: Apache-2.0

import type { ContractVersion } from './config';
import { v1LastBatchRootOf } from './v1-decoder';
import { v2LastBatchRootOf } from './v2-decoder';

const decoders: Record<ContractVersion, (stateHex: string) => string> = {
  v1: v1LastBatchRootOf,
  v2: v2LastBatchRootOf,
};

/**
 * The contract's `lastBatchRoot` cell in that state: the root the call wrote. Throws when
 * the bytes are not a contract state with that version's ledger layout. Either ledger's
 * bytes for version 1: the indexer serves ledger 9 states once the network has forked. The
 * version is always named: there is no default contract (docs/contract-v2.md 3.1, rule 10.4).
 */
export const lastBatchRootOf = (stateHex: string, version: ContractVersion): string => decoders[version](stateHex);
