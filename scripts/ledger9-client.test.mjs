// The client stack on Midnight's Ledger 9 (contract v2 plan, step 4), checked so it can't drift.
//
//   node --experimental-strip-types --no-warnings --import ./api/test-ts-resolve.mjs --test scripts/ledger9-client.test.mjs
//
// 1. No midnight-js maintenance helper is used on the v1 contracts. midnight-js 5 builds every
//    maintenance update (key insert, key removal, replace-authority) for a Ledger 8 contract as a
//    Ledger 8 update, which a Ledger 9 network refuses (EraMismatchError
//    'ledger8-maintenance-on-ledger9-network'). Every v1 maintenance step after the fork goes
//    through scripts/committee, which builds the update with Ledger 9 types and hands midnight-js
//    only a sealed transaction (submitTx). The two places in api/ that still call a helper do so
//    only after assertMaintenanceAvailable, which refuses on a Ledger 9 network; both are tested
//    here, and so is midnight-js's own refusal, so a later bump that drops it is caught.
// 2. One version of Ledger 9 (and of the other WebAssembly packages) in the lockfile, and the
//    committee tool's `ledger-v9-committee` at that same version.
// 3. Every proof server image is pinned by digest; the Ledger 9 files and the partner kit agree,
//    and only the local Ledger 8 chain uses the Ledger 8 image.
// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const json = (p) => JSON.parse(read(p));

// ── 1. maintenance helpers ───────────────────────────────────────────────────────────────────

/** midnight-js-contracts' maintenance helpers, and the maintenance handles its deploy/find results carry. */
const HELPERS = [
  "submitInsertVerifierKeyTx",
  "submitRemoveVerifierKeyTx",
  "submitReplaceAuthorityTx",
  "createCircuitMaintenanceTxInterface",
  "createCircuitMaintenanceTxInterfaces",
  "createContractMaintenanceTxInterface",
  "circuitMaintenanceTx",
  "contractMaintenanceTx",
];

/** Every place a helper may appear, and why it is safe there. Anything else fails. */
const ALLOWED = {
  // addMissingCircuitKeys (both contracts): refused on a Ledger 9 network before anything is built.
  "api/src/veilcore-api.ts": {
    guard: "assertMaintenanceAvailable",
    names: ["createCircuitMaintenanceTxInterfaces"],
  },
  "api/src/claims-api.ts": {
    guard: "assertMaintenanceAvailable",
    names: ["createCircuitMaintenanceTxInterfaces"],
  },
  // The old one-key retirement, kept for reference: its type names the handle; nothing imports it (below).
  "api/src/maintenance.ts": {
    guard: undefined,
    names: ["contractMaintenanceTx"],
  },
};

/** The code VeilCore runs or ships, tests and generated files left out. */
const SOURCE_DIRS = [
  "api/src",
  "bboard-cli/src",
  "bboard-ui/src",
  "partner-kit/src",
  "partner-kit/examples",
  "partner-kit/scripts",
  "partner-kit/record-check/src",
  "partner-kit/mcp/src",
  "scripts",
  "sponsor/src",
  "veilcore-run/src",
];
const isSource = (p) =>
  /\.(m?[jt]sx?)$/.test(p) &&
  !/\.test\.|\.spec\.|\.e2e\.|\/test\/|\/fixtures\/|\.d\.m?ts$/.test(p);
const walk = (dir) =>
  readdirSync(join(ROOT, dir)).flatMap((n) => {
    const p = `${dir}/${n}`;
    if (n === "node_modules" || n === "dist" || n === "managed") return [];
    return statSync(join(ROOT, p)).isDirectory()
      ? walk(p)
      : isSource(p)
        ? [p]
        : [];
  });

/** The text with comments blanked to spaces (positions kept), so a helper named in a comment doesn't count. */
const code = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(
      /(^|[^:'"`\\])(\/\/[^\n]*)/g,
      (m, pre, c) => pre + " ".repeat(c.length),
    );

const uses = (text, name) =>
  [...code(text).matchAll(new RegExp(`\\b${name}\\b`, "g"))].map(
    (m) => m.index,
  );

test("no midnight-js maintenance helper is used on the v1 contracts outside the guarded places", () => {
  const files = SOURCE_DIRS.flatMap(walk);
  assert.ok(files.length > 100, `scanned ${files.length} files`);
  const found = [];
  for (const f of files) {
    const text = read(f);
    for (const name of HELPERS) {
      for (const at of uses(text, name)) {
        const rule = ALLOWED[f];
        if (rule === undefined || !rule.names.includes(name)) {
          found.push(`${f}:${text.slice(0, at).split("\n").length} ${name}`);
          continue;
        }
        // Its import is not a use; every call site is checked.
        const stmt = code(text).slice(0, at);
        if (/^\s*import\b/.test(stmt.slice(stmt.lastIndexOf(";") + 1)))
          continue;
        if (rule.guard !== undefined) {
          // The guard is awaited just before, in the same method: within the three lines above.
          const lines = text.slice(0, at).split("\n");
          assert.match(
            lines.slice(-4).join("\n"),
            new RegExp(`await ${rule.guard}\\(`),
            `${f}: ${name} without ${rule.guard} first`,
          );
        }
      }
    }
  }
  assert.deepEqual(
    found,
    [],
    "a midnight-js maintenance helper is used where nothing refuses it on Ledger 9",
  );
});

test("the old one-key retirement (which uses contractMaintenanceTx unguarded) is imported nowhere", () => {
  // VeilcoreAPI has a method of the same name; it calls the provable, guarded retirement.
  const imports =
    /import\s*(type\s*)?\{[^}]*\bretireMaintenanceAuthority\b(?!Provably)[^}]*\}\s*from\s*'[^']*maintenance/;
  const importers = SOURCE_DIRS.flatMap(walk).filter((f) =>
    imports.test(read(f)),
  );
  assert.deepEqual(importers, []);
  assert.doesNotMatch(
    read("api/src/index.ts"),
    /\bretireMaintenanceAuthority\b(?!Provably)/,
  );
  assert.match(
    read("api/src/veilcore-api.ts"),
    /async retireMaintenanceAuthority\([^)]*\)[^{]*\{[\s\S]{0,400}retireMaintenanceAuthorityProvably\(/,
  );
});

test("assertMaintenanceAvailable refuses on a Ledger 9 network and allows Ledger 8", async () => {
  const { assertMaintenanceAvailable } =
    await import("../api/src/maintenance.ts");
  // The protocol versions a node reports on each side of the fork (bboard-ui chain/test-chain.ts).
  const at = (v) => ({ queryLatestProtocolVersion: async () => v });
  await assert.rejects(
    assertMaintenanceAvailable(at(2_001_000)),
    /moved to Midnight Ledger 9.*Nothing was built or sent/s,
  );
  await assert.doesNotReject(assertMaintenanceAvailable(at(1_000_000)));
});

test("midnight-js still refuses a Ledger 8 maintenance update on a Ledger 9 network (its own guard)", () => {
  const dist = read(
    "node_modules/@midnight-ntwrk/midnight-js-contracts/dist/index.js",
  );
  assert.match(dist, /ledger8-maintenance-on-ledger9-network/);
  assert.match(dist, /EraMismatchError/);
});

// ── 2. one Ledger 9 ──────────────────────────────────────────────────────────────────────────

const lock = json("package-lock.json").packages;
const versionsOf = (name) =>
  [
    ...new Set(
      Object.entries(lock)
        .filter(
          ([k, v]) =>
            k.endsWith(`node_modules/${name}`) ||
            (v.name === name && k.includes("node_modules/")),
        )
        .map(([, v]) => v.version),
    ),
  ].sort();

test("one version of each Midnight WebAssembly package and of Compact JS", () => {
  assert.deepEqual(versionsOf("@midnightntwrk/ledger-v9"), ["1.0.2"]);
  assert.deepEqual(versionsOf("@midnightntwrk/onchain-runtime-v4"), ["4.0.2"]);
  assert.deepEqual(versionsOf("@midnightntwrk/zkir-v3"), ["3.2.1"]);
  assert.deepEqual(versionsOf("@midnight-ntwrk/compact-js"), ["3.0.2"]);
  assert.deepEqual(versionsOf("@midnightntwrk/ledger-v8"), ["8.1.3"]);
});

test("the committee tool's ledger-v9-committee is the same release as the wallet's ledger-v9", () => {
  const alias = lock["node_modules/ledger-v9-committee"];
  const plain = lock["node_modules/@midnightntwrk/ledger-v9"];
  assert.equal(alias.version, plain.version);
  assert.equal(
    alias.integrity,
    plain.integrity,
    "the same tarball under two names",
  );
  assert.equal(
    json("package.json").devDependencies["ledger-v9-committee"],
    `npm:@midnightntwrk/ledger-v9@${plain.version}`,
  );
  assert.equal(
    json("package.json").overrides["@midnightntwrk/ledger-v9"],
    plain.version,
  );
});

// ── 3. proof server images ───────────────────────────────────────────────────────────────────

const imageIn = (file) => {
  const m =
    /^\s*image:\s*['"]?(midnightntwrk\/proof-server:[^'"\s]+)['"]?\s*$/m.exec(
      read(file),
    );
  assert.ok(m, `${file}: no proof-server image line`);
  return m[1];
};
const kitImage = (name) => {
  const m = new RegExp(`export const ${name} =\\s*'([^']+)'`).exec(
    read("partner-kit/src/network.ts"),
  );
  assert.ok(m, name);
  return m[1];
};
const PINNED =
  /^midnightntwrk\/proof-server:\d+\.\d+\.\d+@sha256:[0-9a-f]{64}$/;

test("every proof server image is pinned by digest, Ledger 9 on the public networks, Ledger 8 only locally", () => {
  const ledger9 = kitImage("PROOF_SERVER_IMAGE_LEDGER9");
  const ledger8 = kitImage("PROOF_SERVER_IMAGE_LEDGER8");
  assert.match(ledger9, PINNED);
  assert.match(ledger8, PINNED);
  assert.match(ledger9, /:9\.\d+\.\d+@/);
  assert.match(ledger8, /:8\.\d+\.\d+@/);
  // Mainnet, and the public test networks (preprod, preview), all on Ledger 9.
  for (const f of [
    "bboard-cli/proof-server-mainnet.yml",
    "bboard-cli/proof-server.yml",
  ])
    assert.equal(imageIn(f), ledger9, f);
  // The local chain runs the Ledger 8 node, so its proof server is Ledger 8's.
  for (const f of [
    "bboard-cli/compose.yml",
    "bboard-cli/proof-server-local.yml",
    "partner-kit/local/compose.yml",
  ])
    assert.equal(imageIn(f), ledger8, f);
  for (const f of ["bboard-cli/compose.yml", "partner-kit/local/compose.yml"])
    assert.match(
      read(f),
      /midnight-node:0\.\d+\.\d+@sha256/,
      `${f}: a Ledger 8 node`,
    );
  // No other compose file in the repository names a proof server without being listed above.
  const listed = new Set([
    "bboard-cli/proof-server-mainnet.yml",
    "bboard-cli/proof-server.yml",
    "bboard-cli/compose.yml",
    "bboard-cli/proof-server-local.yml",
    "partner-kit/local/compose.yml",
  ]);
  const ymls = [
    "bboard-cli",
    "partner-kit/local",
    "sponsor",
    "veilcore-run",
    ".",
  ].flatMap((d) =>
    readdirSync(join(ROOT, d))
      .filter((n) => /\.ya?ml$/.test(n))
      .map((n) => relative(ROOT, join(ROOT, d, n))),
  );
  for (const f of ymls)
    if (/proof-server/.test(read(f)))
      assert.ok(listed.has(f), `${f} names a proof server`);
});
