// Test stand-ins in the shapes midnight-js 5 uses, for the CLI's tests.
// SPDX-License-Identifier: Apache-2.0
//
// midnight-js 5 reaches private state through a per-contract view (`forContract(address)`)
// instead of `setContractAddress`, and an indexer read returns the contract state as bytes
// tagged with the ledger that wrote them. VeilCore's contracts are Ledger 8 contracts, so a
// stand-in chain that has not forked serves Ledger 8 bytes at a 1.x protocol version.
import {
  type ChargedState,
  ContractMaintenanceAuthority,
  ContractState,
  sampleSigningKey,
  signatureVerifyingKey,
} from '@midnight-ntwrk/compact-runtime';
import { SerializedContractState } from '@midnight-ntwrk/midnight-js-types';

/** The protocol version a network not yet past Midnight's Ledger 9 fork reports. */
export const LEDGER8_PROTOCOL = 1_000_000;

/** A contract state as midnight-js 5's indexer read returns it (Ledger 8 bytes). */
export const served = (state: ContractState, protocolVersion = LEDGER8_PROTOCOL) => ({
  protocolVersion,
  contractState: SerializedContractState.fromBytes('v8', state.serialize()),
});

/** A contract's data alone (a simulator's ChargedState), served as a whole state with no circuits. */
export const servedData = (data: ChargedState, protocolVersion = LEDGER8_PROTOCOL) => {
  const cs = new ContractState();
  cs.data = data;
  return served(cs, protocolVersion);
};

/** A state with only a maintenance authority, served: `retired` is an empty committee (counter 1). */
export const servedAuthority = (retired: boolean, protocolVersion = LEDGER8_PROTOCOL) => {
  const cs = new ContractState();
  cs.maintenanceAuthority = retired
    ? new ContractMaintenanceAuthority([], 1, 1n)
    : new ContractMaintenanceAuthority([signatureVerifyingKey(sampleSigningKey())], 1, 0n);
  return served(cs, protocolVersion);
};

type View = {
  get(id: string): Promise<unknown>;
  set(id: string, state: unknown): Promise<void>;
  remove?(id: string): Promise<void>;
  clear?(): Promise<void>;
};

/**
 * A midnight-js 5 store driven one contract at a time, as these tests drove midnight-js 4's:
 * `setContractAddress(a)`, then `get`/`set`/`remove` go to `forContract(a)`. Everything else
 * (signing keys, `forContract` itself, so the API under test sees the real store) is the store's.
 */
export const byAddress = <S extends { forContract(address: string): View }>(store: S) => {
  let address: string | undefined;
  const here = (): View => {
    if (address === undefined) throw new Error('test: setContractAddress first');
    return store.forContract(address);
  };
  return new Proxy(store, {
    get(target, name) {
      if (name === 'setContractAddress') return (a: string) => void (address = a);
      if (name === 'get') return (id: string) => here().get(id);
      if (name === 'set') return (id: string, s: unknown) => here().set(id, s);
      if (name === 'remove') return (id: string) => here().remove?.(id);
      const v: unknown = Reflect.get(target, name, target);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  }) as S & {
    setContractAddress(a: string): void;
    get(id: string): Promise<unknown>;
    set(id: string, s: unknown): Promise<void>;
  };
};
