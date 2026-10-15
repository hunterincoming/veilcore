// Browser tests: the built site, in a real browser, at phone size (e2e/README.md).
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from '@playwright/test';

// E2E_PORT and E2E_OUT_DIR let two runs share a checkout without sharing a port or a build.
const PORT = Number(process.env.E2E_PORT ?? 4317);
const OUT_DIR = process.env.E2E_OUT_DIR ?? 'e2e-dist';

export default defineConfig({
  testDir: './e2e',
  // Refuses to start without room on the disk the browsers' downloads go to (e2e/global-setup.ts).
  globalSetup: './e2e/global-setup.ts',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 390, height: 844 },
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Serves the build `npm run e2e:build` made; it never builds by itself, so a test run
    // can't quietly test something other than what was built.
    command: `npx vite preview --mode preview --outDir ${OUT_DIR} --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
