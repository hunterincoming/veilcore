// Types for btc-header-chain.js (plain JavaScript, copied into verify.html as it is).
// SPDX-License-Identifier: Apache-2.0

export type Checkpoint = { readonly height: number; readonly hash: string };
export type HeaderAt = { readonly height: number; readonly header: string };
export type Failure = { readonly ok: false; readonly code: string; readonly reason: string };

export type ReadHeader = {
  readonly header: string;
  readonly hash: string;
  readonly version: number;
  readonly prevHash: string;
  readonly merkleRoot: string;
  readonly merkleRootInternal: string;
  readonly time: number;
  readonly bits: number;
  readonly nonce: number;
};

export type Plan =
  | {
      readonly ok: true;
      readonly direction: 'down' | 'up';
      readonly checkpoint: Checkpoint;
      readonly from: number;
      readonly to: number;
      readonly anchors: readonly Checkpoint[];
    }
  | Failure;

export type Linked = {
  readonly ok: true;
  readonly height: number;
  readonly hash: string;
  readonly header: string;
  readonly merkleRoot: string;
  readonly merkleRootInternal: string;
  readonly time: number;
  readonly direction: 'down' | 'up';
  readonly checkpoint: Checkpoint;
  readonly headersChecked: number;
  readonly workToCheckpoint: string;
  /** Going up: the mined blocks above the checkpoint the link rests on; 0 going down. */
  readonly blocksOfWork: number;
};

export declare const BtcHeaderChain: {
  readonly POW_LIMIT: bigint;
  readonly INTERVAL: number;
  readonly DEFAULT_MAX_HEADERS: number;
  readHeader(hex: string): Promise<ReadHeader>;
  headerFromEsplora(json: unknown): string;
  compactToTarget(bits: number): bigint | null;
  targetToCompact(target: bigint): number;
  nextBits(lastBits: number, firstTime: number, lastTime: number): number | null;
  workOf(bits: number): bigint;
  powProblem(h: { readonly bits: number; readonly hash: string }): string | null;
  plan(height: number, checkpoints: readonly Checkpoint[], maxHeaders?: number): Plan;
  verifyLink(opts: {
    readonly height: number;
    readonly headers: readonly HeaderAt[];
    readonly checkpoints: readonly Checkpoint[];
    readonly maxHeaders?: number;
  }): Promise<Linked | Failure>;
};
