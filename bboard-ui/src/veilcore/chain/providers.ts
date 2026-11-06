// The midnight-js providers for one call from this browser.
//
//   proofs     made in the proving worker, on this device (prover.ts)
//   keys       this site's /keys, /zkir and /compiler, fetched by the worker
//   chain      Midnight's public indexer (read only)
//   private    in memory for the length of the call, then dropped
//   wallet     none: fresh throwaway keys for this one call (VeilCore's circuits use
//              no coins and never ask for the caller's public key), and "balancing"
//              means sealing the transaction here and handing it to the sponsor, which
//              adds the fee in a separate part it cannot use to change this one.
//
// Both ledgers (midnight-js 5): VeilCore's contracts are ledger 8 contracts (compiled before
// Midnight's ledger 9 fork) and stay so. On a network still on ledger 8 (the test networks
// until they fork) midnight-js builds a ledger 8 transaction; on one past the fork (mainnet
// since 6 Nov 2026) it builds the same call as a ledger 9 transaction. Each provider below
// therefore serves both eras, and seals with the ledger the transaction was built for.
// SPDX-License-Identifier: Apache-2.0

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { Transaction as Ledger9Transaction, ZswapSecretKeys } from '@midnight-ntwrk/midnight-js-protocol/v9';
import {
  createMidnightProviderFromHandlers,
  createProofProviderFromProvingProviders,
  createWalletProviderFromHandlers,
  type MidnightConfig,
} from '@midnight-ntwrk/midnight-js-types';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { inMemoryPrivateStateProvider } from '../../in-memory-private-state-provider';
import type { VeilcorePrivateState } from '../../../../contract/src/witnesses';
import { browserCallDeps } from './prover-choice';
import { sendToSponsor } from './sponsor-client';
import { INDEXER_HTTP, INDEXER_WS } from './config';
import { NETWORK } from '../../config/network';

export const PRIVATE_STATE_ID = 'veilcorePrivateState';

/**
 * The lifetime of the call's transaction (midnight-js 5 takes it from here; 4.x fixed it at
 * one hour). One hour, as before: the sponsor refuses anything further out (sponsor maxTtlMs).
 */
export const CALL_TTL_SECONDS = 3600;

export const callConfig = (): MidnightConfig => ({ networkId: NETWORK, ttlSeconds: CALL_TTL_SECONDS });

export type Hooks = {
  readonly progress: (msg: string) => void;
  /** The sealed bytes, just before they go to the sponsor (tests read them). */
  readonly onSealed?: (bytes: Uint8Array) => void;
  /** The sponsor accepted the transaction and sent it to the network. */
  readonly onSent?: (txId: string) => void;
};

/** A transaction that can be sealed (bound): either ledger's, as the wallet handler decodes it. */
type Bindable = { bind(): { serialize(): Uint8Array; identifiers(): string[] } };

export const makeProviders = <PS = VeilcorePrivateState>(cacheName: string, hooks: Hooks, deps = browserCallDeps()) => {
  // Throwaway keys for this call only.
  const ephemeral = ZswapSecretKeys.fromSeed(crypto.getRandomValues(new Uint8Array(32)));
  let submitted: string | undefined;
  // The sponsor's own refusal, kept as it is: midnight-js 5 wraps a provider's failure in
  // ProviderFailedError and redacts its message, and the visitor should see the sponsor's words.
  let sponsorError: unknown;

  const sealAndSend = async (tx: Bindable) => {
    // Sealing (binding) is irreversible: nobody, the sponsor included, can change the
    // call after this. The sponsor can only add its fee part next to it, or refuse.
    const sealed = tx.bind();
    const bytes = sealed.serialize();
    hooks.onSealed?.(bytes);
    hooks.progress('Sending it to VeilCore, which pays the network fee…');
    try {
      await sendToSponsor(bytes, deps.pow, deps.fetch);
    } catch (e) {
      sponsorError = e;
      throw e;
    }
    // Watch for this transaction by its own identifier, not by what the sponsor says.
    submitted = sealed.identifiers()[0];
    hooks.onSent?.(submitted);
    return sealed;
  };

  const walletProvider = createWalletProviderFromHandlers({
    getCoinPublicKey: () => ephemeral.coinPublicKey,
    getEncryptionPublicKey: () => ephemeral.encryptionPublicKey,
    v8: async (tx) => {
      const { Transaction } = await loadLedger8Protocol();
      return sealAndSend(tx.deserialize({ v8: Transaction }));
    },
    v9: (tx) => sealAndSend(tx.deserialize({ v9: Ledger9Transaction })),
  });

  const sent = (): Promise<string> =>
    submitted ? Promise.resolve(submitted) : Promise.reject(new Error('Nothing was sent to the sponsor.'));

  // The worker proves VeilCore's circuits (ZKIR v2, as compiled) for either ledger's
  // transaction: the circuit and its keys are the same; only the transaction around them differs.
  const proving = deps.proving(cacheName);

  return {
    privateStateProvider: inMemoryPrivateStateProvider<typeof PRIVATE_STATE_ID, PS>(),
    publicDataProvider:
      deps.publicData ?? indexerPublicDataProvider(INDEXER_HTTP ?? '', INDEXER_WS ?? '', globalThis.WebSocket as never),
    // VeilCore's artifacts come from compactc 0.31, which writes compiler/contract-info.json
    // (it names runtime 0.16, so midnight-js treats the contract as ledger 8) but no integrity
    // manifest. 'require-if-present': a manifest, if one is ever served, must cover every file.
    // The verifier keys are still compared with the chain's before anything is proved
    // (actions.ts), which is the check that matters.
    zkConfigProvider: new FetchZkConfigProvider<string>(deps.origin, {
      fetchFunc: deps.fetch,
      verify: 'require-if-present',
    }),
    proofProvider: createProofProviderFromProvingProviders({ v8: proving, v9: proving }),
    walletProvider,
    midnightProvider: createMidnightProviderFromHandlers({ v8: sent, v9: sent }),
    config: callConfig(),
    /** Why the sponsor refused this call, if it did (see sponsorError above). */
    sponsorFailure: (): unknown => sponsorError,
  };
};
