// The workspace's own scripts: the compiler pin (compile.mjs) and the two-machine key
// comparison (fingerprints.mjs). Nothing is compiled or built here.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type CompileMod = {
  PINNED: string;
  compilerCommand: (
    env: Record<string, string | undefined>,
  ) => [string, string[]];
  reportedVersion: (out: string) => string | undefined;
};
type FpMod = {
  artefacts: (managed: string) => [string, string][];
  table: (
    rows: [string, string][],
    meta: { commit: string; compiler: string },
  ) => string;
  parse: (text: string) => Map<string, string>;
  differences: (a: Map<string, string>, b: Map<string, string>) => string[];
};
const load = async <T>(p: string): Promise<T> =>
  (await import(new URL(p, import.meta.url).href)) as T;

describe("compile.mjs: one compiler, exactly the pinned one", () => {
  it("is pinned to 0.36.1", async () => {
    const m = await load<CompileMod>("../../scripts/compile.mjs");
    expect(m.PINNED).toBe("0.36.1");
  });

  it("uses $COMPACTC when set, else the Compact CLI at the pinned version", async () => {
    const m = await load<CompileMod>("../../scripts/compile.mjs");
    expect(m.compilerCommand({ COMPACTC: "/opt/c/compactc" })).toEqual([
      "/opt/c/compactc",
      [],
    ]);
    expect(m.compilerCommand({})).toEqual(["compact", ["compile", "+0.36.1"]]);
  });

  it("reads the version the compiler reports, and nothing else", async () => {
    const m = await load<CompileMod>("../../scripts/compile.mjs");
    expect(m.reportedVersion("0.36.1 (7fa3a117c 2026-11-11)\n")).toBe("0.36.1");
    expect(m.reportedVersion("0.31.1")).toBe("0.31.1");
    expect(m.reportedVersion("compactc: not found")).toBeUndefined();
  });
});

describe("fingerprints.mjs: the two-machine comparison", () => {
  const fake = (root: string, verifiers: number, content = "k") => {
    for (const [c, n] of [
      ["veilcore", verifiers],
      ["veilcore-claims", 5],
    ] as const) {
      mkdirSync(join(root, c, "keys"), { recursive: true });
      mkdirSync(join(root, c, "zkir"), { recursive: true });
      mkdirSync(join(root, c, "contract"), { recursive: true });
      for (let i = 0; i < n; i++) {
        writeFileSync(
          join(root, c, "keys", `c${i}.verifier`),
          `${content}${i}`,
        );
        writeFileSync(join(root, c, "keys", `c${i}.prover`), `p${i}`);
        writeFileSync(join(root, c, "zkir", `c${i}.bzkir`), `z${i}`);
      }
      writeFileSync(join(root, c, "contract", "index.js"), "js");
    }
  };

  it("lists every key, ZKIR and contract file; the same build matches itself", async () => {
    const m = await load<FpMod>("../../scripts/fingerprints.mjs");
    const root = mkdtempSync(join(tmpdir(), "fp-"));
    try {
      fake(root, 24);
      const rows = m.artefacts(root);
      expect(rows).toHaveLength((24 + 5) * 3 + 2);
      const t = m.table(rows, { commit: "abc", compiler: "0.36.1" });
      expect(m.differences(m.parse(t), m.parse(t))).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("names a key that differs between the two machines", async () => {
    const m = await load<FpMod>("../../scripts/fingerprints.mjs");
    const a = mkdtempSync(join(tmpdir(), "fp-a-")),
      b = mkdtempSync(join(tmpdir(), "fp-b-"));
    try {
      fake(a, 24);
      fake(b, 24);
      writeFileSync(join(b, "veilcore", "keys", "c3.verifier"), "other");
      const t = (r: string) =>
        m.table(m.artefacts(r), { commit: "x", compiler: "0.36.1" });
      expect(m.differences(m.parse(t(a)), m.parse(t(b)))).toEqual([
        "DIFFERENT: veilcore/keys/c3.verifier",
      ]);
    } finally {
      rmSync(a, { recursive: true, force: true });
      rmSync(b, { recursive: true, force: true });
    }
  });

  it("refuses a build without keys, or with the wrong number of circuits", async () => {
    const m = await load<FpMod>("../../scripts/fingerprints.mjs");
    const root = mkdtempSync(join(tmpdir(), "fp-"));
    try {
      expect(() => m.artefacts(root)).toThrow(/has no keys/);
      fake(root, 23);
      expect(() => m.artefacts(root)).toThrow(
        /has 23 verifier keys; it should have 24/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
