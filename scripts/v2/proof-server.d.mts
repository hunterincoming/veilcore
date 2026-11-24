export const V2_PROOF_SERVER_TAG: string;
export const V2_PROOF_SERVER_FILE_NAME: string;
export const V2_PROOF_SERVER_FILE: string;
export type ProofServerPin = { tag: string; digest: string | undefined; pinned: boolean; filled: boolean };
export function readPin(yml: string): ProofServerPin | undefined;
export function pinProblems(yml: string): string[];
export function filePinProblems(file?: string): string[];
export function withDigest(yml: string, digest: string): string;
export function versionProblems(text: string): string[];
export function checkRunningProofServer(
  url: string,
  fetchImpl?: (url: URL, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>,
): Promise<string[]>;
export const V2_RELEASE_TAG: string;
export const V2_RELEASE_API: string;
export const V2_RELEASE_PAGE: string;
export function digestOf(line: string): string | undefined;
export function releaseProblems(release: unknown, digest: string): string[];
export function pin(o: { line: string; release: unknown; file?: string }): Promise<string[]>;
