// Only in the end-to-end build (package.json e2e:build sets VITE_E2E_FIXTURES=1): a stand-in for
// the two Midnight steps a license page takes once a license is live, so a browser test can open
// the REAL license page (LicenseDetail, RealLicensePanel) and revoke from it. A test sets
// `window.__veilcoreE2EChain` before the site's scripts run (e2e/royalty-revoke.spec.ts):
//   status  what licenseStatusNow reads for a license (license-invites.ts);
//   revoke  what revokeLicenseOnChain answers, in place of a proof and a transaction;
//   prove   what a range or value claim's call answers (prove-number.ts), in place of a proof
//           and a transaction, so the "Prove a fact" panel can be used (e2e/marker-claims.spec.ts);
//   claim   what checkClaim answers for a claim link (claim-check.ts), or 'checking' to stay
//           unanswered, so the check page can be opened in each state (e2e/claim-words.spec.ts);
//   watch   what the app-open check reads for a record it date stamped (record-watch.ts), in place
//           of the contract's state, so its warning can be shown (e2e/record-watch.spec.ts).
// In every other build the condition below is a constant false, so this returns undefined and
// nothing on a page, in a URL or in storage can reach it (royalty-pay.test.ts checks the gate).
// SPDX-License-Identifier: Apache-2.0

import type { ClaimVerdict } from '../claim-link';
import type { ChainView } from '../record-watch';

export type E2EChain = {
  readonly status?: (commitment: string, issuerRecord: string) => 'PENDING' | 'ACTIVE' | 'none';
  readonly revoke?: (commitment: string, issuerRecord: string) => { txId: string; blockTime?: number };
  readonly claim?: (link: unknown) => ClaimVerdict | 'checking';
  readonly watch?: (identity: string, expectedRecovery?: string) => ChainView | null;
  readonly prove?: (call: { circuit: 'proveRange' | 'proveValue'; slot: number; op?: string; bound?: string }) => {
    contract: string;
    txId: string;
    blockHeight: number;
    blockTime?: number;
  };
};

export const e2eChain = (): E2EChain | undefined =>
  import.meta.env.VITE_E2E_FIXTURES === '1'
    ? (globalThis as { __veilcoreE2EChain?: E2EChain }).__veilcoreE2EChain
    : undefined;
