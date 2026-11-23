// Types for send.mjs. SPDX-License-Identifier: Apache-2.0
export declare const MAINNET_REFUSAL_V2: string;
export declare const assertWalletReads: (tx: { serialize(): Uint8Array }, decoder?: unknown) => void;
export declare const sendLedger9Tx: (
  providers: {
    readonly publicDataProvider: unknown;
    readonly proofProvider: unknown;
    readonly walletProvider: unknown;
    readonly midnightProvider: unknown;
    readonly config: { readonly networkId: string };
  },
  tx: { serialize(): Uint8Array },
  options?: { allowMainnet?: boolean },
) => Promise<{ txId?: string; txHash?: string; blockHeight?: number }>;
