// Types for release-check.mjs (the /check-this-site page imports it).
// SPDX-License-Identifier: Apache-2.0
export const RELEASE_FORMAT: 'veilcore-release/v1';
export const MANIFEST_FORMAT: 'veilcore-release-manifest/v1';
export type Release = { format: typeof RELEASE_FORMAT; network: string; commit: string; date: string };
export type Manifest = {
  format: typeof MANIFEST_FORMAT;
  network: string;
  commit: string;
  date: string;
  uncommittedChanges?: boolean;
  files: Record<string, string>;
};
export type FileCheck = { total: number; matched: string[]; differ: string[]; missing: string[] };
export function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string>;
export function isRelease(v: unknown): v is Release;
export function isManifest(v: unknown): v is Manifest;
export function manifestPath(network: string, commit: string): string;
export function readRelease(
  site: string,
  fetchImpl?: typeof fetch,
): Promise<{ ok: true; release: Release } | { ok: false; problem: string }>;
export function checkFiles(
  site: string,
  manifest: Manifest,
  opts?: { fetchImpl?: typeof fetch; concurrency?: number; onProgress?: (done: number, total: number) => void },
): Promise<FileCheck>;
export function allMatch(r: FileCheck): boolean;
