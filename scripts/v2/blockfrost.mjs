// What the v2 tools (deploy-v2, smoke-v2, committee, verify:deployment) say when Blockfrost
// answers 403. A 403 almost always means a project made for Cardano, not for Midnight.
// SPDX-License-Identifier: Apache-2.0

export const BLOCKFROST_403 =
  'Blockfrost refused this project id (403). It must be a Midnight Mainnet project (or Midnight Preprod for preprod), ' +
  "not a Cardano project. Check the project's network on the Blockfrost dashboard.";

/** True when `url` is a Blockfrost endpoint (the project id never matters here). */
export const isBlockfrostUrl = (url) => {
  try {
    const h = new URL(url).hostname;
    return h === 'blockfrost.io' || h.endsWith('.blockfrost.io');
  } catch {
    return false;
  }
};
