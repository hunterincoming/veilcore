// Types for stack.mjs. SPDX-License-Identifier: Apache-2.0
export declare const REQUIRED: Readonly<Record<string, string>>;
export declare const PROOF_SERVER_TAG: string;
export declare const PROOF_SERVER_FILE: string;
export declare const installedVersion: (pkg: string, root?: string) => string | undefined;
export declare const proofServerImage: (yml: string) => { tag: string; digest?: string } | undefined;
export declare const stackProblems: (deps?: {
  version?: (pkg: string) => string | undefined;
  yml?: () => string;
}) => string[];
