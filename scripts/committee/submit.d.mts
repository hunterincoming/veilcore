// Types for submit.mjs, so the operator tool (bboard-cli/src/launcher/committee.ts) can import it.
// SPDX-License-Identifier: Apache-2.0
import type { MaintenanceUpdate } from 'ledger-v9-committee';
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

/** circuit -> the slot of the verifier key the contract holds now ('v3', 'v4', or undefined when unrecognised). */
export declare const readKeySlotsNow: (
  publicDataProvider: StateReader,
  address: string,
) => Promise<Record<string, 'v3' | 'v4' | undefined>>;

/** Throws on a network that is not on Midnight Ledger 9: this tool builds Ledger 9 updates only. */
export declare const assertLedger9Network: (publicDataProvider: ChainReader) => Promise<void>;

export declare const MAINNET_REFUSAL: string;

/** Throws unless @midnightntwrk/ledger-v9 (the wallet's copy) reads the transaction back byte for byte. */
export declare const assertReadableByWalletLedger: (
  tx: { serialize(): Uint8Array },
  update: { readonly dataToSign: Uint8Array },
  decoder?: unknown,
) => void;

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
  options?: {
    log?: (line: string) => void;
    waitMs?: number;
    tries?: number;
    allowMainnet?: boolean;
    /** Tests only: the wallet side's Transaction class. */
    walletLedgerTransaction?: unknown;
  },
) => Promise<{ sent: boolean; txId?: string; txHash?: string; blockHeight?: number; authority: AuthorityView }>;
