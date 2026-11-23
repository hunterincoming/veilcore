// Types for gate.mjs, so the operator tool (bboard-cli/src/launcher/committee.ts) can import it.
// SPDX-License-Identifier: Apache-2.0
import type { Action, KeySlot, Request } from './core.mjs';

export type V2Contract = {
  readonly address: string;
  readonly temporaryKey: string;
  /** circuit -> SHA-256, from docs/fingerprints-v2.md; undefined when the table is not here. */
  readonly pins?: Readonly<Record<string, string>>;
};

export declare const slotForContract: (a: {
  readonly network: string;
  readonly address: string;
  readonly pinnedV1Address: string;
  readonly v2?: V2Contract;
  readonly named?: KeySlot;
}) => { slot: KeySlot } | { problem: string };

export declare const requestSlotProblems: (req: Request, slot: KeySlot) => string[];

export declare const chainSlotProblems: (slotsOnChain: Readonly<Record<string, KeySlot | undefined>>, slot: KeySlot) => string[];

export declare const gateProblems: (a: {
  readonly network: string;
  readonly address: string;
  readonly current: { readonly committee: readonly string[]; readonly threshold: number; readonly counter: bigint };
  readonly actions: readonly Action[];
  readonly pinnedV1Address: string;
  readonly v2?: V2Contract;
}) => string[];
