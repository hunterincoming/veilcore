// node --test scripts/contracts-package.test.mjs
// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUNDLE_SOURCE, bundlePackage, contractsPackageProblem } from './contracts-package.mjs';

const SRC = "export const CONTRACTS_PACKAGE = '@veilcore/contracts@0.5.0';";

test('reads the pinned package from the real bundle source', () => {
  const pkg = bundlePackage(readFileSync(BUNDLE_SOURCE, 'utf8'));
  assert.ok(pkg, 'CONTRACTS_PACKAGE not found');
  assert.match(pkg.spec, /^@veilcore\/contracts@\d+\.\d+\.\d+$/);
});

test('fine when npm has that exact version', () => {
  assert.equal(contractsPackageProblem(SRC, () => '0.5.0'), undefined);
});

test('refuses when npm does not have it', () => {
  assert.match(contractsPackageProblem(SRC, () => undefined), /npm does not have it/);
});

test('refuses when npm answers with another version', () => {
  assert.match(contractsPackageProblem(SRC, () => '0.4.0'), /npm does not have it/);
});

test('refuses when the bundle source has no pinned package', () => {
  assert.match(contractsPackageProblem("export const CONTRACTS_PACKAGE = '@veilcore/contracts';", () => '0.5.0'), /Could not find/);
});
