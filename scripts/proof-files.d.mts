// Types for proof-files.mjs.
// SPDX-License-Identifier: Apache-2.0
export const PROOF_FILES_HOST: string;
export const PROOF_FILES_PROJECT: string;
export const PROOF_FILES_TABLE: string;
export const PROOF_FILES_FORMAT: 'veilcore-proof-files/v1';
export const HOST_LIST_FORMAT: 'veilcore-proof-files-host/v1';
export const PUBLISH_COMMAND: string;
export const HOST_HEADERS: Readonly<Record<string, string>>;
export type Table = { ok: true; files: Record<string, string> } | { ok: false; problem: string };
export function parseProofFiles(text: string, name?: string): Table;
export function readProofFiles(repo?: string): Table;
export function localPathOf(path: string, repo?: string): string[];
export function gatherLocal(
  files: Record<string, string>,
  o?: { repo?: string; read?: (f: string) => Uint8Array | undefined },
): { ok: true; bytes: Map<string, Uint8Array> } | { ok: false; problems: string[] };
export function hostConfig(): { version: 3; routes: Record<string, unknown>[] };
export function hostListText(fingerprints: Record<string, string[]>): string;
export function parseHostList(
  text: string,
): { ok: true; fingerprints: Record<string, string[]> } | { ok: false; problem: string };
export function mergedList(before: Record<string, string[]> | undefined, files: Record<string, string>): Record<string, string[]>;
export function stageHost(
  dir: string,
  fingerprints: Record<string, string[]>,
  bytes: Map<string, Uint8Array>,
): { count: number; bytes: number; out: string };
export type Published = { ok: boolean; checked: number; bytes: number; problems: string[] };
export function checkPublished(o: {
  host?: string;
  files: Record<string, string>;
  fetchImpl?: typeof fetch;
  concurrency?: number;
  timeoutMs?: number;
}): Promise<Published>;
export function notPublishedProblem(result: Published, host?: string): string;
export function proofFilesReady(o?: {
  host?: string;
  repo?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; files: Record<string, string>; line: string } | { ok: false; problem: string }>;
export function bigFilesInBuild(staticDir: string, exists?: (p: string) => boolean): string[];
