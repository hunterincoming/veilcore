// Types for deploy-core.mjs. SPDX-License-Identifier: Apache-2.0
import type { Session } from './session.mjs';
import type { V2Pins } from './fingerprints.mjs';
import type { TxAction } from './ledger.mjs';
export declare const MAX_PER_UPDATE: number;
export declare const TTL_MS: number;
export declare const TTL_MARGIN_MS: number;
export declare const publicKeyOf: (signingKeyHex: string) => string;
export type SentTx = { txId?: string; txHash?: string; blockHeight?: number };
export declare const runDeploy: (deps: {
  network: string;
  record: Session;
  save: (record: Session) => void;
  signingKey: string;
  pins: V2Pins;
  constructorBytes: (name: string) => Promise<Uint8Array>;
  localKey: (name: string, circuit: string) => Uint8Array;
  send: (tx: { serialize(): Uint8Array }) => Promise<SentTx>;
  readState: (address: string) => Promise<Uint8Array | undefined>;
  latestTx: (address: string) => Promise<{ txHash: string }>;
  txActions: (txHash: string, address: string) => Promise<readonly TxAction[]>;
  landedTx?: string;
  now?: () => number;
  wait: () => Promise<void>;
  log: (line: string) => void;
  perUpdate?: number;
}) => Promise<Session>;
