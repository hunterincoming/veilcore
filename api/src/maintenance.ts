// SPDX-License-Identifier: Apache-2.0
/**
 * Giving up a contract's maintenance authority, for real.
 *
 * MIDNIGHT-JS NEVER DEPLOYS WITHOUT AN AUTHORITY. `deployContract` does
 * `signingKey ?? sampleSigningKey()`, installs that key as the contract's
 * maintenance authority, and saves it in the private-state provider's signing-key
 * store. Leaving the key out therefore does not mean "no authority": it means an
 * authority whose key sits in a local database nobody chose. This CLI used to print
 * "Deploying with NO maintenance authority. This cannot be undone." over exactly
 * that, which was false.
 *
 * The honest equivalent of "no authority" is to replace the authority with a key
 * that exists only in memory for the length of one transaction, then delete the
 * stored copy. After that nobody holds a key that can insert, remove or replace a
 * verifier key, including us. It cannot be undone.
 *
 * `replaceAuthority` stores the new key before returning (midnight-js has a TODO to
 * offer "replace and do not maintain key"), so the removal below is required, not
 * tidying. If the process dies between the two, the stored key is the only copy:
 * delete the signing-key store for this contract by hand.
 */
import { type Logger } from 'pino';
import { type ContractAddress, sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import { loadLedger8Protocol, protocolVersionToLedger } from '@midnight-ntwrk/midnight-js-protocol';
import { type SigningKey as FrameworkSigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { submitTx, TxFailedError } from '@midnight-ntwrk/midnight-js-contracts';
import { LedgerTransaction, SucceedEntirely, type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { fromSerialized } from '../../contract/src/contract-state.js';
import { getNetworkId } from './network-id.js';
import { type AnySigningKey, frameworkKey, hexKey } from './signing-key.js';

/*
 * AFTER MIDNIGHT'S LEDGER 9 FORK (mainnet, 6 November 2026) THIS IS NOT AVAILABLE.
 *
 * VeilCore's contracts are Ledger 8 contracts (compactc 0.31) and stay so. midnight-js 5 calls
 * them on either side of the fork, but refuses to maintain them once a network has forked
 * (EraMismatchError 'ledger8-maintenance-on-ledger9-network'): a maintenance update is built
 * against the contract's own build, and maintaining a Ledger 8 contract on a Ledger 9 network
 * needs the contract recompiled with compactc 0.36, which VeilCore does not do (it would change
 * every verifier key; migration guide, "If you keep ledger 8 contracts"). So on a forked
 * network (mainnet now) adding or removing a circuit key, replacing the authority and the
 * retirement below are refused here, before anything is built or sent, with that reason. On a
 * network not yet forked (preprod, preview) they work as before, as Ledger 8 transactions.
 */

/** Refuse maintenance on a network past the Ledger 9 fork (see above). Nothing is built or sent. */
export const assertMaintenanceAvailable = async (publicDataProvider: {
  queryLatestProtocolVersion(): Promise<number>;
}): Promise<void> => {
  const era = protocolVersionToLedger(await publicDataProvider.queryLatestProtocolVersion());
  if (era !== 'v8')
    throw new Error(
      "Contract maintenance is not available on this network: it has moved to Midnight Ledger 9, and VeilCore's " +
        'contracts are Ledger 8 contracts, which midnight-js can call but no longer maintain (that needs the contract ' +
        'recompiled, which would change every circuit key). Nothing was built or sent.',
    );
};

type SigningKey = AnySigningKey;

type Retirable = {
  readonly contractMaintenanceTx: { replaceAuthority: (newAuthority: FrameworkSigningKey) => Promise<unknown> };
};
type SigningKeyStore = { removeSigningKey: (address: ContractAddress) => Promise<void> };

export const retireMaintenanceAuthority = async (
  deployed: Retirable,
  signingKeys: SigningKeyStore,
  address: ContractAddress,
  logger?: Logger,
): Promise<void> => {
  logger?.info('retiring the maintenance authority: replacing it with a key that is never stored');
  await deployed.contractMaintenanceTx.replaceAuthority(frameworkKey(sampleSigningKey()));
  await signingKeys.removeSigningKey(address);
  logger?.info("maintenance authority retired. Nobody, including us, can change this contract's circuits.");
};

/* **********************************************************************
 * Provable retirement: an authority nobody can satisfy, visible on chain.
 *
 * The retirement above is honest but has to be taken on trust: the chain shows an
 * authority with one key, and only our word says nobody kept it. A contract's
 * maintenance authority is a committee and a threshold (ledger-v8
 * ContractMaintenanceAuthority(committee, threshold, counter)), and an update needs
 * `threshold` signatures from committee members. Replacing it with an EMPTY committee
 * and threshold 1 leaves an authority no signature can ever satisfy, and anyone who
 * reads the contract's state can see that: committee [], threshold 1.
 *
 * midnight-js cannot build this: replaceAuthority takes a SigningKey and always
 * installs a one-key committee (compact-js createMaintenanceAuthority). So the update
 * is built here, the way compact-js builds its own (createSignedMaintenanceUpdate):
 * MaintenanceUpdate(address, [ReplaceAuthority(new authority)], current counter), signed
 * by the current key at index 0 over `dataToSign`, wrapped in an Intent and a
 * Transaction, then proved, balanced and submitted with midnight-js's own submitTx.
 * api/test-maintenance.mjs applies exactly this update to a real ledger-v8 LedgerState
 * and checks that afterwards the old key, and no key at all, can change anything.
 * The one thing it cannot show here is a real node accepting it; the smoke test's
 * claims phase does that on preprod.
 */

/** The ledger's view of an authority: who may sign, how many must, and the replay counter. */
export type AuthorityView = {
  readonly committee: readonly unknown[];
  readonly threshold: number;
  readonly counter: bigint;
};

/** Nobody can sign for this authority: it needs more signatures than it has members. */
export const isProvablyRetired = (a: AuthorityView): boolean => a.threshold > a.committee.length;

/** The authority a provable retirement installs: no members, one signature needed. */
type Ledger8 = Awaited<ReturnType<typeof loadLedger8Protocol>>;

export const retiredAuthority = (L: Ledger8, current: AuthorityView) =>
  new L.ContractMaintenanceAuthority([], 1, current.counter + 1n);

/** The signed update replacing `current` with an empty committee: a Ledger 8 update. Pure: nothing is sent. */
export const provableRetirementUpdate = async (
  address: ContractAddress,
  current: AuthorityView,
  signingKey: SigningKey,
) => {
  const L = await loadLedger8Protocol();
  const update = new L.MaintenanceUpdate(
    address,
    [new L.ReplaceAuthority(retiredAuthority(L, current))],
    current.counter,
  );
  return update.addSignature(0n, L.signData(hexKey(signingKey), update.dataToSign));
};

type RetireProviders = Pick<
  MidnightProviders,
  'publicDataProvider' | 'proofProvider' | 'walletProvider' | 'midnightProvider'
> & {
  readonly privateStateProvider: SigningKeyStore & {
    getSigningKey: (address: ContractAddress) => Promise<FrameworkSigningKey | undefined | null>;
  };
};

/**
 * Replace the maintenance authority with an empty committee (see above), confirm it on
 * chain, then delete the stored key. Needs the current authority's key in the provider
 * (the CLI keeps the main contract's in memory only, typed from paper). No new key is
 * made, so nothing new is stored. Safe to run again: an authority already retired this
 * way is left alone. Used for both contracts since round D; the one-key retirement
 * above is kept for reference and is no longer used.
 */
export const retireMaintenanceAuthorityProvably = async (
  providers: RetireProviders,
  address: ContractAddress,
  logger?: Logger,
  waitMs = 2_000,
): Promise<void> => {
  const read = async (): Promise<AuthorityView> => {
    const read = await providers.publicDataProvider.queryContractState(address);
    if (read === null || read === undefined) throw new Error(`No contract state found at ${address}.`);
    return fromSerialized(read.contractState).maintenanceAuthority;
  };
  const before = await read();
  if (isProvablyRetired(before)) {
    logger?.info('the maintenance authority is already an empty committee: nothing to do');
    await providers.privateStateProvider.removeSigningKey(address);
    return;
  }
  const key = await providers.privateStateProvider.getSigningKey(address);
  if (key === undefined || key === null)
    throw new Error(`The maintenance key for ${address} is not on this computer, so the authority cannot be retired.`);
  await assertMaintenanceAvailable(providers.publicDataProvider);
  logger?.info('retiring the maintenance authority provably: replacing it with an empty committee');
  const L = await loadLedger8Protocol();
  const unprovenTx = LedgerTransaction.seal(
    'v8',
    'Unproven',
    L.Transaction.fromParts(
      getNetworkId(),
      undefined,
      undefined,
      L.Intent.new(ttlOneHour()).addMaintenanceUpdate(await provableRetirementUpdate(address, before, key)),
    ),
  );
  try {
    const finalized = await submitTx(providers as never, { unprovenTx });
    if (finalized.status !== SucceedEntirely)
      throw new TxFailedError('replace-authority', finalized, {
        contractAddress: address,
        signingKey: frameworkKey(key),
      });
    logger?.info({ transactionAdded: { circuit: 'retireMaintenanceAuthorityProvably', ...finalized } });
  } catch (e) {
    // It may have landed with only the confirmation failing: the chain decides below.
    if (!isProvablyRetired(await read())) throw e;
  }
  for (let i = 0; !isProvablyRetired(await read()); i++) {
    if (i >= 30)
      throw new Error(
        'The retirement was sent but the indexer does not show it after a minute. Read the contract state again later: ' +
          'if it shows an empty committee, it is done; if not, retire again with the same key.',
      );
    await new Promise((r) => setTimeout(r, waitMs));
  }
  await providers.privateStateProvider.removeSigningKey(address);
  logger?.info(
    'maintenance authority retired provably: the chain shows an empty committee (threshold 1), which no key can satisfy.',
  );
};
