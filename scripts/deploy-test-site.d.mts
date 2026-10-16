// Types for deploy-test-site.mjs, for the site tests.
// SPDX-License-Identifier: Apache-2.0

export declare const checkTestRegistry: (registry: string) => Promise<{ ok: true } | { ok: false; problem: string }>;
