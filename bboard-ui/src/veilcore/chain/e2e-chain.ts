// Only in the end-to-end build (package.json e2e:build sets VITE_E2E_FIXTURES=1): a stand-in for
// the two Midnight steps a license page takes once a license is live, so a browser test can open
// the REAL license page (LicenseDetail, RealLicensePanel) and revoke from it. A test sets
// `window.__veilcoreE2EChain` before the site's scripts run (e2e/royalty-revoke.spec.ts):
//   status  what licenseStatusNow reads for a license (license-invites.ts);
//   revoke  what revokeLicenseOnChain answers, in place of a proof and a transaction.
// In every other build the condition below is a constant false, so this returns undefined and
// nothing on a page, in a URL or in storage can reach it (royalty-pay.test.ts checks the gate).
// SPDX-License-Identifier: Apache-2.0

export type E2EChain = {
  readonly status?: (commitment: string, issuerRecord: string) => 'PENDING' | 'ACTIVE' | 'none';
  readonly revoke?: (commitment: string, issuerRecord: string) => { txId: string; blockTime?: number };
};

export const e2eChain = (): E2EChain | undefined =>
  import.meta.env.VITE_E2E_FIXTURES === '1'
    ? (globalThis as { __veilcoreE2EChain?: E2EChain }).__veilcoreE2EChain
    : undefined;
