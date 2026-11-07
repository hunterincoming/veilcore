// Types for submit.mjs, so the operator tool (bboard-cli/src/launcher/committee.ts) can import it.
// SPDX-License-Identifier: Apache-2.0
import type { MaintenanceUpdate } from '@midnightntwrk/ledger-v8';
import type { AuthorityView } from './core.mjs';

type Authority = {
  readonly committee: Iterable<string | { readonly tag: string; readonly value: string }>;
  readonly threshold: number;
  readonly counter: bigint;
};

/** An indexer read: midnight-js 5's (serialized state of either ledger), or a state with its authority. */
export type StateReader = {
  queryContractState(
    address: string,
  ): Promise<
    | { readonly contractState: { readonly era: string; deserialize(decoders: never): unknown } }
    | { readonly maintenanceAuthority: Authority }
    | null
    | undefined
  >;
};

export type ChainReader = StateReader & { queryLatestProtocolVersion(): Promise<number> };

export declare const readAuthorityNow: (publicDataProvider: StateReader, address: string) => Promise<AuthorityView>;

/** Throws on a network past Midnight's Ledger 9 fork: a Ledger 8 contract cannot be maintained there. */
export declare const assertMaintenanceAvailable: (publicDataProvider: ChainReader) => Promise<void>;

export declare const sendMaintenanceUpdate: (
  providers: {
    readonly publicDataProvider: ChainReader;
    readonly proofProvider: unknown;
    readonly walletProvider: unknown;
    readonly midnightProvider: unknown;
    readonly config: { readonly networkId: string };
  },
  address: string,
  update: MaintenanceUpdate,
  landed: (authority: AuthorityView) => boolean,
  options?: { log?: (line: string) => void; waitMs?: number; tries?: number },
) => Promise<{ sent: boolean; txId?: string; blockHeight?: number; authority: AuthorityView }>;
