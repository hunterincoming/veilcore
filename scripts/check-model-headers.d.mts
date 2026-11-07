// Types for check-model-headers.mjs.
// SPDX-License-Identifier: Apache-2.0
export declare const checkModelHeaders: (
  site: string,
  o?: { staticDir?: string; fetchImpl?: typeof fetch; manifest?: object },
) => Promise<{ ok: boolean; lines: string[] }>;
