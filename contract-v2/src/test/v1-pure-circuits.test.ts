// Day one of contract v2: every pure circuit of both v2 contracts returns, byte for byte,
// what v1's returns for the same inputs (docs/contract-v2.md 1.1: the hash tags stay
// "veilcore:v1:*", so the same secret gives the same commitment in both contracts).
//
// fixtures/v1-pure-circuits.json holds v1's outputs, recorded from v1's compiled contracts
// (compiler 0.31.1) by scripts/v1-pure-vectors.mjs. Where v1 is compiled next to this
// workspace (../contract/src/managed, as in CI's packages job), v1 is also run live here.
// The published vectors (../contract/vectors/v1.json) are checked in interface.test.ts.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { pureCircuits as main } from "../managed/veilcore/contract/index.js";
import { pureCircuits as claims } from "../managed/veilcore-claims/contract/index.js";

type Enc = string | Enc[] | { [k: string]: Enc } | boolean | number;
type Case = { contract: string; circuit: string; args: Enc[]; out: Enc };
const here = (p: string): string => new URL(p, import.meta.url).pathname;
const fixture = JSON.parse(
  readFileSync(here("./fixtures/v1-pure-circuits.json"), "utf8"),
) as { cases: Case[] };

const dec = (v: Enc): unknown =>
  typeof v === "string" && v.startsWith("n:")
    ? BigInt(v.slice(2))
    : typeof v === "string" && v.startsWith("b:")
      ? Uint8Array.from(Buffer.from(v.slice(2), "hex"))
      : Array.isArray(v)
        ? v.map(dec)
        : v !== null && typeof v === "object"
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)]))
          : v;
const enc = (v: unknown): Enc =>
  typeof v === "bigint"
    ? `n:${v}`
    : v instanceof Uint8Array
      ? `b:${Buffer.from(v).toString("hex")}`
      : Array.isArray(v)
        ? v.map(enc)
        : v !== null && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v as Record<string, unknown>).map(([k, x]) => [
                k,
                enc(x),
              ]),
            )
          : (v as Enc);

type Fns = Record<string, (...a: unknown[]) => unknown>;
const v2: Record<string, Fns> = {
  veilcore: main as unknown as Fns,
  "veilcore-claims": claims as unknown as Fns,
};

describe("v2's pure circuits give v1's bytes", () => {
  it("the fixture covers every pure circuit of both contracts", () => {
    for (const [name, fns] of Object.entries(v2)) {
      const covered = new Set(
        fixture.cases.filter((c) => c.contract === name).map((c) => c.circuit),
      );
      expect([...covered].sort()).toEqual(Object.keys(fns).sort());
    }
  });

  for (const [i, c] of fixture.cases.entries()) {
    it(`${c.contract} ${c.circuit} #${i}`, () => {
      const got = v2[c.contract][c.circuit](...c.args.map(dec));
      expect(enc(got)).toEqual(c.out);
    });
  }
});

const V1 = here("../../../contract/src/managed");
describe.skipIf(!existsSync(`${V1}/veilcore/contract/index.js`))(
  "against v1 compiled next to this workspace, live",
  () => {
    it("every case gives the same bytes from v1 and v2", async () => {
      const load = async (n: string) =>
        (
          (await import(
            pathToFileURL(`${V1}/${n}/contract/index.js`).href
          )) as { pureCircuits: Fns }
        ).pureCircuits;
      const v1: Record<string, Fns> = {
        veilcore: await load("veilcore"),
        "veilcore-claims": await load("veilcore-claims"),
      };
      for (const c of fixture.cases) {
        const args = c.args.map(dec);
        expect(enc(v2[c.contract][c.circuit](...args)), c.circuit).toEqual(
          enc(v1[c.contract][c.circuit](...args)),
        );
      }
    });
  },
);
