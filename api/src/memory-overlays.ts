// SPDX-License-Identifier: Apache-2.0
/**
 * Keep the maintenance key and one-call secrets out of the local private-state store.
 *
 * The CLI's store is a LevelDB folder. Deleting a value from it writes a tombstone; the
 * encrypted value stays in the folder's files until a later compaction merges the two
 * (round D, D-2: a maintenance key "removed" after a deploy was still recoverable from
 * the folder with the password, and so was a recovery secret "cleared" after a call).
 * The only way to keep a secret out of those files is never to write it there. These
 * two wrappers do that, around any private-state provider:
 *
 *  - memorySigningKeys: signing keys (the maintenance authority's key, and the random
 *    key midnight-js makes for every contract joined) live in this process only. A
 *    deploy that stops partway is finished from the paper copy (CLI deploy menu option 4).
 *  - transientSecrets: the private-state fields that hold a secret for one call (a
 *    recovery secret, the secret a rotation moves to, a licence secret, a presentation
 *    challenge) are kept in this process and written to disk as zeros. The record secret
 *    itself, and everything else, is stored as before.
 */
import { type ContractAddress, type SigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';

/** Signing keys live in this process only; nothing about them reaches the wrapped store. */
export const memorySigningKeys = <P extends object>(store: P): P => {
  const keys = new Map<ContractAddress, SigningKey>();
  return new Proxy(store, {
    get(target, name, receiver) {
      if (name === 'setSigningKey')
        return (address: ContractAddress, key: SigningKey): Promise<void> => {
          keys.set(address.toLowerCase(), key);
          return Promise.resolve();
        };
      if (name === 'getSigningKey')
        return (address: ContractAddress): Promise<SigningKey | null> =>
          Promise.resolve(keys.get(address.toLowerCase()) ?? null);
      if (name === 'removeSigningKey')
        return (address: ContractAddress): Promise<void> => {
          keys.delete(address.toLowerCase());
          return Promise.resolve();
        };
      if (name === 'clearSigningKeys')
        return (): Promise<void> => {
          keys.clear();
          return Promise.resolve();
        };
      if (name === 'exportSigningKeys' || name === 'importSigningKeys')
        return (): Promise<never> =>
          Promise.reject(new Error('Signing keys are kept in memory only and cannot be exported or imported.'));
      return Reflect.get(target, name, receiver) as unknown;
    },
  });
};

/** The private-state fields that hold a secret for one call (VeilcorePrivateState). */
export const TRANSIENT_FIELDS = [
  'recoverySecret',
  'incomingGeneticSecret',
  'licenseSecret',
  'presentationChallenge',
] as const;

/** One contract's private states, as midnight-js 5 reaches them (`forContract`). */
type View = {
  get(id: string): Promise<unknown>;
  set(id: string, state: never): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
};
type Store = { forContract(address: ContractAddress): View; clearAll(): Promise<void> };

/**
 * One-call secrets are kept in this process and written to the wrapped store as 32 zero
 * bytes. A read gives back what this process last set; a fresh process reads zeros,
 * which is what every call that needs one of these fields expects to replace first.
 * Memory is keyed by contract address (lower case, as midnight-js 5 compares them) and
 * state id, as the store itself is.
 */
export const transientSecrets = <P extends object>(store: P): P => {
  const inner = store as unknown as Store;
  const mem = new Map<string, Record<string, Uint8Array>>();
  const view = (contractAddress: ContractAddress): View => {
    const here = inner.forContract(contractAddress);
    const address = contractAddress.toLowerCase();
    const slot = (id: string): string => `${address}:${id}`;
    return new Proxy(here, {
      get(target, name, receiver) {
        if (name === 'set')
          return async (id: string, state: unknown): Promise<void> => {
            if (state === null || typeof state !== 'object') return here.set(id, state as never);
            const s = state as Record<string, unknown>;
            const kept: Record<string, Uint8Array> = {};
            const onDisk: Record<string, unknown> = { ...s };
            for (const f of TRANSIENT_FIELDS) {
              const v = s[f];
              if (v instanceof Uint8Array) {
                kept[f] = new Uint8Array(v);
                onDisk[f] = new Uint8Array(v.length);
              }
            }
            mem.set(slot(id), kept);
            return here.set(id, onDisk as never);
          };
        if (name === 'get')
          return async (id: string): Promise<unknown> => {
            const s = await here.get(id);
            if (s === null || s === undefined || typeof s !== 'object') return s;
            return { ...s, ...(mem.get(slot(id)) ?? {}) };
          };
        if (name === 'remove')
          return (id: string): Promise<void> => {
            mem.delete(slot(id));
            return here.remove(id);
          };
        if (name === 'clear')
          return (): Promise<void> => {
            for (const k of [...mem.keys()]) if (k.startsWith(`${address}:`)) mem.delete(k);
            return here.clear();
          };
        return Reflect.get(target, name, receiver) as unknown;
      },
    });
  };
  return new Proxy(store, {
    get(target, name, receiver) {
      if (name === 'forContract') return view;
      if (name === 'clearAll')
        return (): Promise<void> => {
          mem.clear();
          return inner.clearAll();
        };
      return Reflect.get(target, name, receiver) as unknown;
    },
  });
};
