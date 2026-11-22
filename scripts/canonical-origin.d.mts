// Types for canonical-origin.mjs, so bboard-ui/vite.config.ts and the site tests can import it.
// SPDX-License-Identifier: Apache-2.0

export declare const VEILCORE_ORIGIN: string;
export declare const plainHttpsOrigin: (v: string) => string | undefined;
export declare const mainnetOriginProblem: (env: { api?: string; canonical?: string }) => string | undefined;
