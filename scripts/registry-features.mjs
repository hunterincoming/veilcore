// What the site needs from its registry, checked before a site is built and published.
//
// Every build of the site uses sealed records, lab results, animal records, the claimant's
// own copy of a delivery's offer ("Finish receiving", GET /transfers/:id/offer), locked
// sample details, a record's and an agreement's public `rev` (the registry refuses an
// older copy), locked record names, DNA reports shown only bound (round 5), and "Bred by" as a
// fact a holder may share (persona review, 17 Oct), and since round 6 a record's name code and
// lab report signatures bound to the record. A
// registry that doesn't serve one of them would leave the site offering something that fails when
// someone uses it. So all three site deploys (scripts/site-mainnet-preflight.mjs for
// the mainnet site, scripts/site-prod-preflight.mjs for the test-network site on veilcore.org,
// scripts/deploy-test-site.mjs for test.veilcore.org) first ask the target
// registry's GET /health, which lists the features that registry build serves
// (`features: string[]`, registry contract item 13), and refuse unless every one below is
// there. The registry is deployed before the site.
// SPDX-License-Identifier: Apache-2.0

/** The registry features every site build uses, with plain names for the refusal. */
export const REQUIRED_FEATURES = Object.freeze({
  "sealed-records-v1": "sealed records",
  "lab-results-v1": "lab results",
  "animal-profile-v1": "animal records",
  "claimant-offer-v1": "finishing a received delivery",
  // Sample details sealed with the delivery's offer key (CONTRACT.md #27): an older registry
  // would refuse the sealed boxes, and a lab code made against it would carry none.
  "sealed-custody-v1": "locked sample details",
  // Every record goes with its `rev` in the clear (round 3, L2): an older registry refuses
  // the field, and with it the whole save.
  "record-rev-v1": "refusing an older copy of a record",
  // Every agreement goes with its `rev` in the clear too (round 4, F1): an older registry
  // refuses the field, and with it the whole save of agreements.
  "license-rev-v1": "refusing an older copy of an agreement",
  // A record's name goes only inside its locked box (round 5, CONTRACT.md #28): an older
  // registry would keep a readable copy of a name the site says is locked.
  "sealed-name-v1": "locked record names",
  // A saved DNA report is published only as a code bound with the record's own salt (round 5,
  // CONTRACT.md #29): an older registry refuses that value, and still answers the plain one.
  "dna-pair-binding-v1": "DNA reports shown only as a bound code",
  // "Bred by" as a fact a holder may share (persona review, 17 Oct): an older registry refuses
  // the value, and nothing is shared.
  "bred-by-grant-v1": "sharing who bred it",
  // A record's name code (round 6, CONTRACT.md #33): an older registry refuses the field, and
  // with it the whole save.
  "name-code-v1": "checking the name in a link",
  // Lab report signatures bound to the record (round 6, CONTRACT.md #34): an older registry
  // still serves an old lab signature's report hash to anyone with the proof code.
  "lab-doc-binding-v1": "keeping lab report hashes private",
  // Dating first (CONTRACT.md #38): a record's proof code goes into the next batch the moment
  // it is sealed, before its locked copy (PUT /api/records/dating). An older registry answers
  // 404, and records made before a checked backup would wait for a date again.
  "dating-first-v1": "dating a record the moment it is sealed",
});

const DEPLOY_FIRST =
  "Deploy the registry first: put the registry's latest code live on Railway, wait until " +
  "Railway shows the new deployment as active, then run this again.";

/** The registry's /health answer, or a plain reason it could not be read. */
export const readHealth = async (api) => {
  let res;
  try {
    res = await fetch(`${api}/health`, { signal: AbortSignal.timeout(20_000) });
  } catch (e) {
    return {
      ok: false,
      problem:
        `Could not read ${api}/health (${e instanceof Error ? e.message : String(e)}). ` +
        "Check your internet connection and that the registry is up on Railway, then run this again.",
    };
  }
  // /health answers 503 while the registry is starting or a part of it failed to load.
  if (!res.ok) {
    return {
      ok: false,
      problem:
        `The registry at ${api} is not ready (its /health answered ${res.status}). ` +
        "Wait until Railway shows its deployment as active, then run this again.",
    };
  }
  try {
    return { ok: true, health: await res.json() };
  } catch {
    return {
      ok: false,
      problem: `The registry at ${api} answered /health with something that isn't JSON. ${DEPLOY_FIRST}`,
    };
  }
};

/**
 * Whether a /health answer lists every feature the site uses.
 * @returns {{ ok: true } | { ok: false, missing: string[], problem: string }}
 */
export const checkFeatures = (health, api) => {
  const listed = Array.isArray(health?.features)
    ? health.features.filter((f) => typeof f === "string")
    : [];
  const missing = Object.keys(REQUIRED_FEATURES).filter(
    (f) => !listed.includes(f),
  );
  if (missing.length === 0) return { ok: true };
  const named = missing.map((f) => `${f} (${REQUIRED_FEATURES[f]})`).join(", ");
  const has = listed.length
    ? `it lists only: ${listed.join(", ")}`
    : "it lists no features, so it is an older registry";
  return {
    ok: false,
    missing,
    problem: `The registry at ${api} is missing ${named}, which this site uses (${has}). ${DEPLOY_FIRST}`,
  };
};

/** Both steps: read /health and check it. */
export const checkRegistryFeatures = async (api) => {
  const read = await readHealth(api);
  return read.ok ? checkFeatures(read.health, api) : read;
};

/** One line for the deploy log once the check has passed. */
export const featuresLine = (api) => {
  const names = Object.values(REQUIRED_FEATURES);
  return `Registry ${api} serves ${names.slice(0, -1).join(", ")} and ${names.at(-1)}.`;
};
