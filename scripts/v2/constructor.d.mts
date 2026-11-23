// Types for constructor.mjs. SPDX-License-Identifier: Apache-2.0
export declare const MANAGED: string;
export declare const haveCompiled: (name: string, managed?: string) => boolean;
export declare const constructorStateBytes: (name: string, managed?: string) => Promise<Uint8Array>;
export declare const constructorDataHex: (name: string, managed?: string) => Promise<string | undefined>;
