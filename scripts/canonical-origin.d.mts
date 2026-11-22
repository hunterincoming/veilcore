// Types for canonical-origin.mjs, so bboard-ui/vite.config.ts and the site tests can import it.
// SPDX-License-Identifier: Apache-2.0

export declare const VEILCORE_ORIGIN: string;
export declare const OPERATOR_SETTINGS: Readonly<Record<string, string>>;
export declare const plainHttpsOrigin: (v: string) => string | undefined;
export declare const isVeilcoreHost: (origin: string) => boolean;
export declare const isVeilcoreRegistry: (api: string | undefined) => boolean;
export declare const operatorProblems: (env: Record<string, string | undefined>, required: boolean) => string[];
export declare const mainnetOriginProblem: (input: {
  api?: string;
  canonical?: string;
  env?: Record<string, string | undefined>;
}) => string | undefined;
