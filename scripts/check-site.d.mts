// Types for check-site.mjs.
// SPDX-License-Identifier: Apache-2.0
export function checkSite(
  url: string,
  opts?: { manifestFile?: string; repoRoot?: string; fetchImpl?: typeof fetch },
): Promise<{ code: 0 | 1 | 2; lines: string[] }>;
