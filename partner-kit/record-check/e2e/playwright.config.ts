// The <veilcore-record-check> field in a real browser, on a test page served with a strict
// CSP (Trusted Types required, no inline script or style), against a local registry.
// Build first (npm run build in partner-kit/record-check); REGISTRY_DIR names a
// veilcore-api checkout. SPDX-License-Identifier: Apache-2.0
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /\.spec\.ts$/,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: 'list',
  outputDir: '../test-results',
  use: { browserName: 'chromium', viewport: { width: 390, height: 844 } },
});
