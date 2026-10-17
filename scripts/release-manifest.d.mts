// Types for release-manifest.mjs.
// SPDX-License-Identifier: Apache-2.0
import type { Manifest } from './release-check.mjs';
export function hashTree(dir: string): Record<string, string>;
export function writeRelease(o: {
  network: string;
  staticDir: string;
  repoRoot?: string;
  commit?: string;
  date?: string;
  uncommittedChanges?: boolean;
}): { manifest: Manifest; file: string; rel: string; text: string };
