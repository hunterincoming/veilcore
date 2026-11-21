// `npm run deploy:prod` is retired. It was how veilcore.org shipped before mainnet, and it
// builds the site without the fee sponsor, so running it now would put the old site over the
// mainnet one. It only prints where to go instead and exits 1. The mainnet site deploys with
// `npm run deploy:mainnet` (CLAUDE.md, "Deploying veilcore.org").
// SPDX-License-Identifier: Apache-2.0

console.error(
  'NOT DEPLOYED. npm run deploy:prod is retired: it builds veilcore.org without the fee sponsor.\n' +
    'Use npm run deploy:mainnet instead (CLAUDE.md, "Deploying veilcore.org").',
);
process.exit(1);
