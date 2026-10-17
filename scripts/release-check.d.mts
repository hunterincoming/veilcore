// Types for release-check.mjs (the /check-this-site page imports it).
// SPDX-License-Identifier: Apache-2.0
export const RELEASE_FORMAT: 'veilcore-release/v1';
export const MANIFEST_FORMAT: 'veilcore-release-manifest/v1';
export type Release = { format: typeof RELEASE_FORMAT; network: string; commit: string; date: string };
export type BuildFacts = {
  mode: string;
  settings: Record<string, string>;
  node: string;
  npm: string;
};
export type Manifest = {
  format: typeof MANIFEST_FORMAT;
  network: string;
  commit: string;
  date: string;
  uncommittedChanges?: boolean;
  files: Record<string, string>;
  /** Lower-case header names to values (round 6). Absent on a manifest from before. */
  headers?: Record<string, string>;
  /** The build mode, every VITE_* setting, and the Node and npm versions (round 6). */
  build?: BuildFacts;
};
export type RouteCheck = {
  total: number;
  matched: string[];
  differ: string[];
  missing: string[];
  headerDiffers: { path: string; name: string }[];
  headersListed: boolean;
};
export type ReleaseCheck = { files: FileCheck; routes: RouteCheck };
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
export const SECURITY_HEADERS: readonly string[];
export const APP_ROUTES: readonly string[];
export const NAVIGATE_HEADERS: Readonly<Record<string, string>>;
export function isBuildFacts(v: unknown): v is BuildFacts;
export function routesToCheck(): string[];
export function checkRoutes(
  site: string,
  manifest: Manifest,
  opts?: {
    fetchImpl?: typeof fetch;
    routes?: string[];
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<RouteCheck>;
export function routesMatch(r: RouteCheck): boolean;
export function checkRelease(
  site: string,
  manifest: Manifest,
  opts?: { fetchImpl?: typeof fetch; routes?: string[]; onProgress?: (done: number, total: number) => void },
): Promise<ReleaseCheck>;
export function releaseMatches(r: ReleaseCheck): boolean;
export function extraScripts(liveDoc: Document, listedHtml: string): string[];
