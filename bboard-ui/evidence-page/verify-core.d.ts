// Types for the parts of verify-core.js the site imports (the rest is verify.html's).
// SPDX-License-Identifier: Apache-2.0

export type StampRead =
  | {
      readonly status: 'bitcoin' | 'pending';
      readonly bitcoin: readonly { readonly height: number; readonly merkleRoot: string | null }[];
      readonly pending: readonly string[];
    }
  | { readonly status: 'other-root' | 'unreadable'; readonly reason: string };

export declare const VeilcoreVerify: {
  readStamp(bytes: Uint8Array, rootHex: string): Promise<StampRead>;
};
