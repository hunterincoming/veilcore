// node --test scripts/deploy-test-site.test.mjs
// SPDX-License-Identifier: Apache-2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { claimsFor } from "./deploy-test-site.mjs";
import { readProofFiles } from "./proof-files.mjs";

const CLAIMS =
  "29d3ea80e121518f8fd8bd72533d856cf29cdbddbda1b6f322a661aa4f2484b6";
const all = () => true;

test("no claims address at the sponsor: the site offers no claims", () => {
  const r = claimsFor({ network: "preprod" }, all);
  assert.equal(r.ok, true);
  assert.equal(r.address, undefined);
});

test("the sponsor names the claims contract: the site uses that one", () => {
  const r = claimsFor({ claimsAddress: `0x${CLAIMS.toUpperCase()}` }, all);
  assert.deepEqual([r.ok, r.address], [true, CLAIMS]);
});

test("refused when the claims keys or the k=15/k=16 parameters are not among the pinned proof files", () => {
  const noKeys = claimsFor(
    { claimsAddress: CLAIMS },
    (f) => !f.includes("proveRange"),
  );
  assert.equal(noKeys.ok, false);
  assert.match(noKeys.problem, /keys\/proveRange\.prover in .*proof-files\.json/);
  const noParams = claimsFor(
    { claimsAddress: CLAIMS },
    (f) => !f.endsWith("2p16"),
  );
  assert.equal(noParams.ok, false);
  assert.match(noParams.problem, /k=15 and k=16/);
  const table = readProofFiles();
  assert.equal(
    claimsFor({ claimsAddress: CLAIMS }, (f) => Object.hasOwn(table.files, f)).ok,
    true,
  );
});

test("refused when the address is not one, or is the main contract", () => {
  assert.equal(claimsFor({ claimsAddress: "abc" }, all).ok, false);
  assert.equal(
    claimsFor(
      {
        claimsAddress:
          "72fe33436d424fcf247919c8e2f0de224175cc55061739be0ebffb2d650f2f73",
      },
      all,
    ).ok,
    false,
  );
});
