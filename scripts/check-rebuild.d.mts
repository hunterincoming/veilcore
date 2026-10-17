// Types for check-rebuild.mjs.
// SPDX-License-Identifier: Apache-2.0
export function checkRebuild(
  manifestFile: string,
  opts?: { reuseNodeModules?: boolean; keep?: boolean; repoRoot?: string; log?: (line: string) => void },
): { code: 0 | 1 | 2; lines: string[] };
