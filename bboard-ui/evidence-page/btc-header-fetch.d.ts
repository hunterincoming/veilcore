// Types for btc-header-fetch.js.
// SPDX-License-Identifier: Apache-2.0

import type { Checkpoint, HeaderAt, Linked, Plan, ReadHeader } from './btc-header-chain';

export type Explorer = { readonly name: string; readonly base: string };
export type FetchOpts = {
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly concurrency?: number;
  readonly explorers?: readonly Explorer[];
  readonly maxHeaders?: number;
};

export declare const EXPLORERS: readonly Explorer[];
export declare class Unreachable extends Error {}
export declare class Lied extends Error {}
export declare const blockHashAt: (explorer: Explorer, height: number, opts?: FetchOpts) => Promise<string>;
export declare const tipHeight: (explorer: Explorer, opts?: FetchOpts) => Promise<number>;
export declare const fetchHeaders: (
  explorer: Explorer,
  heights: readonly number[],
  opts?: FetchOpts,
) => Promise<HeaderAt[]>;
export declare const planHeights: (p: Extract<Plan, { ok: true }>) => number[];

export type BlockCheck =
  | { readonly status: 'linked'; readonly linked: Linked; readonly headers: HeaderAt[]; readonly explorers: string[] }
  | {
      readonly status: 'explorers';
      readonly header: string;
      readonly hash: string;
      readonly read: ReadHeader;
      readonly explorers: string[];
      readonly why: string;
    }
  | { readonly status: 'failed'; readonly reason: string }
  | { readonly status: 'unreachable'; readonly reason: string };

export declare const checkBlock: (
  height: number,
  checkpoints: readonly Checkpoint[],
  opts?: FetchOpts,
) => Promise<BlockCheck>;
