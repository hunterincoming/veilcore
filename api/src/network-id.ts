// SPDX-License-Identifier: Apache-2.0
/**
 * The network this process works on.
 *
 * midnight-js 4 kept it process-wide (`setNetworkId` in @midnight-ntwrk/midnight-js-network-id),
 * and the deploy guard, the mainnet pins and the CLI all read it from there. midnight-js 5
 * (Midnight's Ledger 9 fork, Nov 2026) removed that package: the network now travels with each
 * provider set as `config: { networkId, ttlSeconds }`. This keeps the one process-wide value
 * those checks read, set once where the network is chosen, and `midnightConfig()` builds the
 * provider config from it, so the two can never disagree.
 */

let current: string | undefined;

/** Set the network for this process (the CLI, the partner kit's connect(), tests). */
export const setNetworkId = (networkId: string): void => {
  if (typeof networkId !== 'string' || networkId.trim() === '' || networkId.trim() !== networkId)
    throw new Error('A network id is a non-empty name with no spaces around it.');
  current = networkId;
};

/** The network set for this process. Throws when none has been set. */
export const getNetworkId = (): string => {
  if (current === undefined) throw new Error('No network id has been set for this process.');
  return current;
};

/** How long a transaction this client builds stays valid: one hour, as midnight-js 4 fixed it. */
export const TTL_SECONDS = 3600;

/** The `config` midnight-js 5 needs on every provider set, from this process's network. */
export const midnightConfig = (): { readonly networkId: string; readonly ttlSeconds: number } => ({
  networkId: getNetworkId(),
  ttlSeconds: TTL_SECONDS,
});
