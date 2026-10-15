// Types for submit.mjs, so the operator tool (bboard-cli/src/launcher/committee.ts) can import it.
// SPDX-License-Identifier: Apache-2.0
import type { MaintenanceUpdate } from '@midnight-ntwrk/ledger-v8';
import type { AuthorityView } from './core.mjs';

type StateReader = {
  queryContractState(address: string): Promise<
    | {
        readonly maintenanceAuthority: {
          readonly committee: Iterable<string>;
          readonly threshold: number;
          readonly counter: bigint;
        };
      }
    | null
    | undefined
  >;
};

export declare const readAuthorityNow: (publicDataProvider: StateReader, address: string) => Promise<AuthorityView>;

export declare const sendMaintenanceUpdate: (
  providers: {
    readonly publicDataProvider: StateReader;
    readonly proofProvider: unknown;
    readonly walletProvider: unknown;
    readonly midnightProvider: unknown;
  },
  address: string,
  update: MaintenanceUpdate,
  landed: (authority: AuthorityView) => boolean,
  options?: { log?: (line: string) => void; waitMs?: number; tries?: number },
) => Promise<{ sent: boolean; txId?: string; blockHeight?: number; authority: AuthorityView }>;
