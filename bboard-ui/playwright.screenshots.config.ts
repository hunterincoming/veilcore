// Screenshots of every page, for comparing a branch with main by eye or by pixel
// (docs/screenshots.md). Not part of `npm run e2e` and never a CI check: a pixel test across
// fonts and machines is flaky, so this records pictures and a contact sheet, and a person (or
// screenshots/compare.mjs, against a folder made on the same machine) does the comparing.
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: './screenshots',
  testMatch: 'pages.shots.ts',
  globalTeardown: './screenshots/contact-sheet.ts',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: { ...base.use, reducedMotion: 'reduce', trace: 'off' },
});
