// Types for ledger.mjs. SPDX-License-Identifier: Apache-2.0
export type Instruction = {
  readonly kind: 'insert-key' | 'remove-key' | 'replace-authority' | 'ir-insert' | 'ir-remove' | 'unknown';
  readonly circuit?: string;
  readonly slot?: string;
  readonly headerSlot?: string;
  readonly sha256?: string;
};
export type StateFacts = {
  readonly ops: Record<string, { sha256: string | null; slot?: 'v3' | 'v4' }>;
  readonly authority: { committee: string[]; threshold: number; counter: bigint };
  readonly dataHex: string;
};
export type TxAction =
  | { readonly kind: 'deploy'; readonly state: StateFacts }
  | { readonly kind: 'update'; readonly counter: bigint; readonly signatures: number; readonly instructions: Instruction[] };
export declare const fromHex: (hex: string) => Uint8Array;
export declare const keyFileBytes: (version: string, rawVk: Uint8Array) => Uint8Array;
export declare const ledgerDataHex: (state: unknown) => string;
export declare const stateFacts: (bytes: Uint8Array) => StateFacts;
export declare const txFacts: (rawBytes: Uint8Array, address: string) => TxAction[];
