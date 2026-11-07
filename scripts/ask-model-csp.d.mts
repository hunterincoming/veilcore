// Types for ask-model-csp.mjs.
// SPDX-License-Identifier: Apache-2.0
export type PinnedModel = { id: string; repo: string; commit: string };
export type ModelManifestPins = { pinned?: boolean; models: PinnedModel[]; redirectHosts?: string[] };
export declare const HF_STORAGE_HOST: RegExp;
export declare const MODEL_WORKER_FILE: RegExp;
export declare const modelWorkerRouteSrc: (which: 'download' | 'engine') => string;
export declare const SITE_ROUTE_SRC: string;
export declare const modelFolder: (m: { repo: string; commit: string }) => string;
export declare const manifestProblem: (manifest: ModelManifestPins) => string | undefined;
export declare const downloadWorkerCsp: (manifest: ModelManifestPins) => string;
export declare const engineWorkerCsp: () => string;
