// Browser tests: the built site, in a real browser, at phone size (e2e/README.md).
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from '@playwright/test';

const PORT = 4317;

export default defineConfig({
  testDir: './e2e',
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
    command: `npx vite preview --mode preview --outDir e2e-dist --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
