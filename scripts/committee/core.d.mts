// Types for core.mjs, so the operator tool (bboard-cli/src/launcher/committee.ts) can import it.
// SPDX-License-Identifier: Apache-2.0
import type { MaintenanceUpdate } from '@midnight-ntwrk/ledger-v8';

export declare const COMMITTEE_SIZE: number;
export declare const COMMITTEE_THRESHOLD: number;
export declare const KEY_CARD_FORMAT: string;
export declare const REQUEST_FORMAT: string;
export declare const SIGNATURE_FORMAT: string;
export declare const NETWORKS: readonly string[];

export type KeyCard = {
  readonly format: string;
  readonly holder: string;
  readonly publicKey: string;
  readonly fingerprint: string;
  readonly possessionProof: string;
  readonly createdAt: string;
};

export type AuthorityView = { readonly committee: string[]; readonly threshold: number; readonly counter: bigint };

export type Action =
  | { readonly kind: 'replace-authority'; readonly committee: readonly KeyCard[]; readonly threshold: number }
  | { readonly kind: 'retire' }
  | { readonly kind: 'remove-key'; readonly circuit: string }
  | {
      readonly kind: 'insert-key';
      readonly circuit: string;
      readonly verifierKey: string;
      readonly verifierKeySha256: string;
    };

export type Request = {
  readonly format: string;
  readonly network: string;
  readonly contractAddress: string;
  readonly current: { readonly committee: string[]; readonly threshold: number; readonly counter: string };
  readonly actions: readonly Action[];
  readonly reason: string;
  readonly createdAt: string;
  readonly dataToSign: string;
  readonly dataToSignSha256: string;
};

export type SignatureFile = {
  readonly format: string;
  readonly network: string;
  readonly contractAddress: string;
  readonly counter: string;
  readonly dataToSignSha256: string;
  readonly index: number;
  readonly publicKey: string;
  readonly signature: string;
};

export type Rebuilt = { ok: true; update: MaintenanceUpdate; lines: string[] } | { ok: false; problems: string[] };

export declare const cleanHex: (text: unknown) => string;
export declare const fingerprint: (publicKey: string) => string;
export declare const groupHex: (hex: string) => string;
export declare const parseSigningKey: (text: unknown) => { value: string; publicKey: string } | { problem: string };
export declare const parsePublicKey: (text: unknown) => { value: string } | { problem: string };
export declare const possessionMessage: (holder: string, publicKey: string) => Uint8Array;
export declare const makeKeyCard: (holder: string, signingKey: string, createdAt?: string) => KeyCard;
export declare const checkKeyCard: (
  card: unknown,
) => { ok: true; holder: string; publicKey: string } | { ok: false; problem: string };
export declare const keyMatchesCard: (signingKey: string, card: KeyCard) => boolean;
export declare const committeeProblems: (
  cards: readonly unknown[],
  threshold: number,
  options?: { forbid?: readonly string[] },
) => string[];
export declare const authorityView: (a: {
  readonly committee: Iterable<string>;
  readonly threshold: number;
  readonly counter: bigint;
}) => AuthorityView;
export declare const isRetired: (a: { readonly committee: readonly unknown[]; readonly threshold: number }) => boolean;
export declare const rebuildRequest: (req: unknown, options?: { forbid?: readonly string[] }) => Rebuilt;
export declare const makeRequest: (args: {
  network: string;
  contractAddress: string;
  current: { committee: readonly string[]; threshold: number; counter: bigint | string };
  actions: readonly Action[];
  reason?: string;
  forbid?: readonly string[];
}) => Request;
export declare const describeRequest: (
  req: Request,
  rebuilt: { update: MaintenanceUpdate; lines: string[] },
  options?: { pinnedMainnetAddress?: string },
) => string[];
export declare const signRequest: (
  req: Request,
  signingKey: string,
  options?: { forbid?: readonly string[] },
) => SignatureFile;
export declare const assembleSigned: (
  req: Request,
  signatureFiles: readonly unknown[],
  onChain: { readonly committee: Iterable<string>; readonly threshold: number; readonly counter: bigint },
  options?: { forbid?: readonly string[] },
) => { ok: true; update: MaintenanceUpdate; signers: string[]; warnings: string[] } | { ok: false; problems: string[] };
export declare const requestLanded: (
  req: Request,
  onChain: { readonly committee: Iterable<string>; readonly threshold: number; readonly counter: bigint },
) => boolean;
