// What a call runs on. In the browser: the proving worker, this site's origin and the
// network's indexer. Tests pass stand-ins (actions.test.ts).
// SPDX-License-Identifier: Apache-2.0

import type { ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v9';
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { proverReady, workerPow, workerProvingProvider } from './prover';
import { PROOF_FILES_URL } from './proof-files';

export type CallDeps = {
  readonly proving: (cacheName: string) => ProvingProvider;
  readonly pow: (challenge: string, tx: Uint8Array, difficulty: number) => Promise<string>;
  readonly origin: string;
  readonly fetch: typeof fetch;
  /**
   * The proof file host (proof-files.ts): the proving keys are read from there and checked
   * against this build's pins. Unset: read from `origin` as before (tests' stand-in contract).
   */
  readonly proofFilesHost?: string;
  readonly publicData?: PublicDataProvider;
  /** Start the prover and wait until it listens (prover.ts proverReady); stand-ins have none. */
  readonly warmUp?: () => Promise<void>;
};

export const browserCallDeps = (): CallDeps => ({
  proving: workerProvingProvider,
  pow: workerPow,
  origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
  fetch: (...a: Parameters<typeof fetch>) => fetch(...a),
  proofFilesHost: PROOF_FILES_URL,
  warmUp: () => proverReady(),
});
