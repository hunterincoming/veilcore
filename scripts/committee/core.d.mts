// Types for core.mjs, so the operator tool (bboard-cli/src/launcher/committee.ts) can import it.
// SPDX-License-Identifier: Apache-2.0
// Ledger 9 types: `ledger-v9-committee` is @midnightntwrk/ledger-v9 1.0.1 (see core.mjs).
import type { MaintenanceUpdate } from 'ledger-v9-committee';

export declare const COMMITTEE_SIZE: number;
export declare const COMMITTEE_THRESHOLD: number;
export declare const KEY_CARD_FORMAT: string;
export declare const REQUEST_FORMAT: string;
export declare const SIGNATURE_FORMAT: string;
export declare const CONFIRMATION_FORMAT: string;
export declare const DRY_RUN_FORMAT: string;
export declare const DRY_RUN_MAX_AGE_MS: number;
export declare const PRACTICE_PREFIX: string;
export declare const PRACTICE_ON_MAINNET: string;
export declare const NETWORKS: readonly string[];

export type KeyCard = {
  readonly format: string;
  readonly holder: string;
  /** A rehearsal card: refused on mainnet. Covered by the card's proof. */
  readonly practice?: true;
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

export type ConfirmationFile = {
  readonly format: string;
  readonly network: string;
  readonly contractAddress: string;
  readonly dataToSignSha256: string;
  readonly holder: string;
  readonly publicKey: string;
  readonly counter: string;
  readonly place: number;
  readonly signature: string;
  readonly createdAt: string;
};

export type Rebuilt = { ok: true; update: MaintenanceUpdate; lines: string[] } | { ok: false; problems: string[] };

/** A committee key as the ledger holds it (Ledger 9: tagged) or as plain hex. */
export type CommitteeKey = string | { readonly tag: string; readonly value: string };
type Authority = {
  readonly committee: Iterable<CommitteeKey>;
  readonly threshold: number;
  readonly counter: bigint;
};

export declare const PERMANENT_WARNING: string;
export declare const cleanHex: (text: unknown) => string;
export declare const bareKey: (key: CommitteeKey) => string;
export declare const changeSummary: (req: Request) => string[];
export declare const fingerprint: (publicKey: string) => string;
export declare const groupHex: (hex: string) => string;
export declare const parseSigningKey: (text: unknown) => { value: string; publicKey: string } | { problem: string };
export declare const parsePublicKey: (text: unknown) => { value: string } | { problem: string };
export declare const possessionMessage: (holder: string, publicKey: string, practice?: boolean) => Uint8Array;
export declare const makeKeyCard: (
  holder: string,
  signingKey: string,
  createdAt?: string,
  options?: { practice?: boolean },
) => KeyCard;
export declare const isPracticeCard: (card: unknown) => boolean;
export declare const checkKeyCard: (
  card: unknown,
) => { ok: true; holder: string; publicKey: string; practice: boolean } | { ok: false; problem: string };
export declare const keyMatchesCard: (signingKey: string, card: KeyCard) => boolean;
export declare const committeeProblems: (
  cards: readonly unknown[],
  threshold: number,
  options?: { forbid?: readonly string[] },
) => string[];
export declare const authorityView: (a: Authority) => AuthorityView;
export declare const isRetired: (a: { readonly committee: readonly unknown[]; readonly threshold: number }) => boolean;
export declare const rebuildRequest: (req: unknown, options?: { forbid?: readonly string[] }) => Rebuilt;
export declare const makeRequest: (args: {
  network: string;
  contractAddress: string;
  current: { committee: readonly CommitteeKey[]; threshold: number; counter: bigint | string };
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
  onChain: Authority,
  options?: { forbid?: readonly string[] },
) => { ok: true; update: MaintenanceUpdate; signers: string[]; warnings: string[] } | { ok: false; problems: string[] };
export declare const newCommittee: (req: unknown) => readonly KeyCard[];
export declare const confirmationMessage: (fields: {
  network: string;
  contractAddress: string;
  dataToSignSha256: string;
  holder: string;
  publicKey: string;
}) => Uint8Array;
export declare const makeConfirmation: (
  req: Request,
  card: unknown,
  signingKey: string,
  options?: { forbid?: readonly string[] },
) => ConfirmationFile;
export declare const confirmationProblems: (
  req: Request,
  files: readonly unknown[],
  options?: { forbid?: readonly string[] },
) => string[];
export declare const requestLanded: (
  req: Request,
  onChain: Authority,
) => boolean;
