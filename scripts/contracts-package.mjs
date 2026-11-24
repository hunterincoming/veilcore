// The package every evidence bundle tells people to install (CONTRACTS_PACKAGE in
// bboard-ui/src/veilcore/evidence/bundle.ts). A site deployed while that exact version is not on
// npm hands out bundles whose check script fails at install, so both deploys refuse first.
// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const BUNDLE_SOURCE = 'bboard-ui/src/veilcore/evidence/bundle.ts';

/** The pinned `@veilcore/contracts@x.y.z` from the bundle source, or undefined. */
export const bundlePackage = (source) => {
  const m = /export const CONTRACTS_PACKAGE = '(@veilcore\/contracts@(\d+\.\d+\.\d+))';/.exec(source);
  return m ? { spec: m[1], version: m[2] } : undefined;
};

/** What `npm view <spec> version` printed, or undefined when npm has no such version. */
const npmView = (spec) => {
  try {
    return execFileSync('npm', ['view', spec, 'version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
};

/**
 * @returns {string | undefined} the problem, or undefined when the bundle's package is on npm
 */
export const contractsPackageProblem = (source = readFileSync(BUNDLE_SOURCE, 'utf8'), view = npmView) => {
  const pkg = bundlePackage(source);
  if (!pkg) return `Could not find CONTRACTS_PACKAGE in ${BUNDLE_SOURCE}.`;
  if (view(pkg.spec) !== pkg.version)
    return `Evidence bundles tell people to install ${pkg.spec}, and npm does not have it. Publish it first (partner-kit: npm publish), check \`npm view ${pkg.spec} version\` prints ${pkg.version}, then run this again.`;
  return undefined;
};
