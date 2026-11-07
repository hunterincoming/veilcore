/*
 * This file is part of example-bboard.
 * Copyright (C) Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// midnight-js 5: private states are reached per contract (`forContract(address)`), and the
// address is compared in lower case, as the framework's own providers do.

import type { ContractAddress, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import {
  type ContractPrivateStates,
  type ExportPrivateStatesOptions,
  type ExportSigningKeysOptions,
  type ImportPrivateStatesOptions,
  type ImportPrivateStatesResult,
  type ImportSigningKeysOptions,
  type ImportSigningKeysResult,
  type PrivateStateExport,
  type PrivateStateId,
  type PrivateStateProvider,
  type SigningKeyExport,
} from '@midnight-ntwrk/midnight-js-types';

/**
 * A simple in-memory implementation of private state provider. Makes it easy to capture and rewrite private state from deploy.
 * @template PSI - Type of the private state identifier.
 * @template PS - Type of the private state.
 * @returns {PrivateStateProvider<PSI, PS>} An in-memory private state provider.
 */
export const inMemoryPrivateStateProvider = <PSI extends PrivateStateId, PS = unknown>(): PrivateStateProvider<
  PSI,
  PS
> => {
  const privateStates = new Map<string, Map<PSI, PS>>();
  const signingKeys = new Map<string, SigningKey>();

  const key = (address: ContractAddress): string => {
    if (typeof address !== 'string' || !/^[0-9a-fA-F]{64}$/.test(address))
      throw new Error('Not a contract address: 64 hex characters.');
    return address.toLowerCase();
  };

  const getScopedStates = (address: string): Map<PSI, PS> => {
    let scopedStates = privateStates.get(address);
    if (!scopedStates) {
      scopedStates = new Map<PSI, PS>();
      privateStates.set(address, scopedStates);
    }
    return scopedStates;
  };

  const encode = <T>(value: T): string => JSON.stringify(value);

  const decode = <T>(value: string): T => JSON.parse(value) as T;

  const forContract = (contractAddress: ContractAddress): ContractPrivateStates<PSI, PS> => {
    const address = key(contractAddress);
    return {
      contractAddress,
      set(id: PSI, state: PS): Promise<void> {
        getScopedStates(address).set(id, state);
        return Promise.resolve();
      },
      get(id: PSI): Promise<PS | null> {
        return Promise.resolve(getScopedStates(address).get(id) ?? null);
      },
      remove(id: PSI): Promise<void> {
        getScopedStates(address).delete(id);
        return Promise.resolve();
      },
      clear(): Promise<void> {
        privateStates.delete(address);
        return Promise.resolve();
      },
      exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
        void options;
        return Promise.resolve({
          format: 'midnight-private-state-export',
          encryptedPayload: encode({
            contractAddress: address,
            states: Object.fromEntries(
              Array.from(getScopedStates(address).entries()).map(([stateId, value]) => [stateId, encode(value)]),
            ),
          }),
          salt: 'in-memory-private-state-provider',
        });
      },
      importPrivateStates(
        exportData: PrivateStateExport,
        options?: ImportPrivateStatesOptions,
      ): Promise<ImportPrivateStatesResult> {
        const conflictStrategy = options?.conflictStrategy ?? 'error';
        const payload = decode<{ states?: Record<string, string> }>(exportData.encryptedPayload);
        const scopedStates = getScopedStates(address);
        let imported = 0;
        let skipped = 0;
        let overwritten = 0;
        for (const [rawStateId, serializedState] of Object.entries(payload.states ?? {})) {
          const stateId = rawStateId as PSI;
          if (scopedStates.has(stateId)) {
            if (conflictStrategy === 'skip') {
              skipped += 1;
              continue;
            }
            if (conflictStrategy === 'error')
              return Promise.reject(new Error(`Private state conflict for '${stateId}'`));
            overwritten += 1;
          } else {
            imported += 1;
          }
          scopedStates.set(stateId, decode<PS>(serializedState));
        }
        return Promise.resolve({ imported, skipped, overwritten });
      },
    };
  };

  return {
    forContract,
    clearAll(): Promise<void> {
      privateStates.clear();
      return Promise.resolve();
    },
    setSigningKey(contractAddress: ContractAddress, signingKey: SigningKey): Promise<void> {
      signingKeys.set(key(contractAddress), signingKey);
      return Promise.resolve();
    },
    getSigningKey(contractAddress: ContractAddress): Promise<SigningKey | null> {
      return Promise.resolve(signingKeys.get(key(contractAddress)) ?? null);
    },
    removeSigningKey(contractAddress: ContractAddress): Promise<void> {
      signingKeys.delete(key(contractAddress));
      return Promise.resolve();
    },
    clearSigningKeys(): Promise<void> {
      signingKeys.clear();
      return Promise.resolve();
    },
    exportSigningKeys(options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      void options;
      return Promise.resolve({
        format: 'midnight-signing-key-export',
        encryptedPayload: encode({ keys: Object.fromEntries(signingKeys.entries()) }),
        salt: 'in-memory-signing-key-provider',
      });
    },
    importSigningKeys(
      exportData: SigningKeyExport,
      options?: ImportSigningKeysOptions,
    ): Promise<ImportSigningKeysResult> {
      const conflictStrategy = options?.conflictStrategy ?? 'error';
      const payload = decode<{ keys?: Record<string, SigningKey> }>(exportData.encryptedPayload);
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;
      for (const [address, signingKey] of Object.entries(payload.keys ?? {})) {
        const k = key(address);
        if (signingKeys.has(k)) {
          if (conflictStrategy === 'skip') {
            skipped += 1;
            continue;
          }
          if (conflictStrategy === 'error') return Promise.reject(new Error(`Signing key conflict for '${address}'`));
          overwritten += 1;
        } else {
          imported += 1;
        }
        signingKeys.set(k, signingKey);
      }
      return Promise.resolve({ imported, skipped, overwritten });
    },
  };
};
