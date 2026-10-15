// Before any browser starts: is there room for what the browsers write? Their profiles,
// traces and downloads go to the system's temporary folder. When that disk is full Chromium
// starts no download and Playwright reports none, so a test waiting for one sat out its
// whole two-minute timeout and failed as "waiting for event download", with nothing to say
// the disk was the cause (15 Oct 2026). Said plainly here instead, before anything runs.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import os from 'node:os';

/** Far more than one run writes (a few MB of bundles and traces), so a run never fills it. */
const NEEDED = 256 * 1024 * 1024;

export default function globalSetup(): void {
  const dir = os.tmpdir();
  const s = fs.statfsSync(dir);
  const free = s.bavail * s.bsize;
  if (free < NEEDED) {
    throw new Error(
      `Only ${Math.floor(free / 1024 / 1024)} MB free in ${dir}, where the browsers keep their downloads; ` +
        `at least ${NEEDED / 1024 / 1024} MB is needed. Free some space and run again.`,
    );
  }
}
