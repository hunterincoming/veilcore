// Types for registry-features.mjs, for the site tests.
// SPDX-License-Identifier: Apache-2.0

export declare const REQUIRED_FEATURES: Readonly<Record<string, string>>;
export declare const readHealth: (
  api: string,
) => Promise<{ ok: true; health: unknown } | { ok: false; problem: string }>;
export declare const checkFeatures: (
  health: unknown,
  api: string,
) => { ok: true } | { ok: false; missing: string[]; problem: string };
export declare const checkRegistryFeatures: (
  api: string,
) => Promise<{ ok: true } | { ok: false; missing?: string[]; problem: string }>;
export declare const featuresLine: (api: string) => string;
