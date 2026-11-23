// Types for session.mjs. SPDX-License-Identifier: Apache-2.0
export type TxRef = { readonly txId?: string; readonly txHash?: string; readonly blockHeight?: number };
export type SessionContract = {
  address: string | null;
  deploy: TxRef | null;
  pending: { kind: 'deploy' | 'update'; counter?: string; circuits?: string[] } | null;
  updates: (TxRef & { counter: string; circuits: string[] })[];
};
export type Session = {
  format: string;
  what: string;
  network: string;
  createdAt: string;
  updatedAt: string;
  commit: string;
  compiler: string;
  keySlot: 'v4';
  fingerprintsSha256: string;
  temporaryKey: { publicKey: string; storedAs: string };
  contracts: Record<'veilcore' | 'veilcore-claims', SessionContract>;
};
export declare const SESSION_FORMAT: string;
export declare const IDENTIFY_NOTE: string;
export declare const emptySession: (a: {
  network: string;
  commit: string;
  compiler: string;
  fingerprintsSha256: string;
  publicKey: string;
  now?: Date;
}) => Session;
export declare const sessionProblems: (s: unknown) => string[];
export declare const readSession: (file: string) => Session;
export declare const contractAt: (s: Session, address: string) => 'veilcore' | 'veilcore-claims' | undefined;
export declare const writeSession: (file: string, s: Session, options?: { first?: boolean }) => string;
