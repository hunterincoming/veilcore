// Types for release-manifest.mjs.
// SPDX-License-Identifier: Apache-2.0
import type { BuildFacts, Manifest } from './release-check.mjs';
export const BUILD_SETTINGS_FILE: string;
export const BUILD_SETTINGS_FORMAT: 'veilcore-build-settings/v1';
export function hashTree(dir: string): Record<string, string>;
export function releaseJsonText(r: { network: string; commit: string; date: string }): string;
export function secretSettingProblem(name: string, value: string): string | null;
export function headersFromConfig(configFile: string): Record<string, string>;
export function buildFacts(o: { staticDir: string; settingsFile?: string }): BuildFacts;
export function writeRelease(o: {
  network: string;
  staticDir: string;
  repoRoot?: string;
  commit?: string;
  date?: string;
  uncommittedChanges?: boolean;
  headers?: Record<string, string>;
  build?: BuildFacts;
}): { manifest: Manifest; file: string; rel: string; text: string };
