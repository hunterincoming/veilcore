// Every claims circuit stays at or under 2^17 rows (k = 17), as in v1
// (contract/scripts/circuit-sizes.sh): a holder must be able to prove any claim on an
// ordinary computer. v2 adds the response range check to proveAttested, so this is checked
// again with the ZKIR tool that ships with compiler 0.36.1 (zkir-v3, next to compactc).
// Runs where COMPACTC points at that compiler (CI, and the Mac); skipped otherwise.
// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const ZKIR = process.env.COMPACTC
  ? join(dirname(process.env.COMPACTC), "zkir-v3")
  : "";
const MAX_K = 17;
const here = (p: string): string => new URL(p, import.meta.url).pathname;

describe.skipIf(!ZKIR || !existsSync(ZKIR))("claims circuit sizes", () => {
  for (const c of [
    "proveAttested",
    "proveDistinct",
    "proveRange",
    "proveUnchanged",
    "proveValue",
  ]) {
    it(`${c} is at most 2^${MAX_K} rows`, () => {
      // zkir-v3 reports the size on stderr.
      const r = spawnSync(
        ZKIR,
        ["mock-compile", here(`../managed/veilcore-claims/zkir/${c}.zkir`)],
        { encoding: "utf8" },
      );
      const out = `${r.stdout}${r.stderr}`;
      const m = /k=(\d+), rows=(\d+)/.exec(out);
      expect(m, out).not.toBeNull();
      expect(Number(m![1])).toBeLessThanOrEqual(MAX_K);
    }, 300_000);
  }
});
