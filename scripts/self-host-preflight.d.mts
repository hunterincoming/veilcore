// Types for self-host-preflight.mjs, so bboard-ui/vite.config.ts and the site tests can import it.
// SPDX-License-Identifier: Apache-2.0

export declare const selfHostProblems: (input: {
  env: Record<string, string | undefined>;
  pinned: string;
  agreements: boolean;
  fetchImpl?: typeof fetch;
}) => Promise<string[]>;
export declare const preflightFetch: (env: Record<string, string | undefined>) => typeof fetch;
