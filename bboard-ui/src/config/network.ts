// Which Midnight network this build talks to, and how to name it. Every network label in
// the app comes from here, so a preprod build never says "Preview" and a test network is
// never presented as the live one.
//
// Explorer addresses are the ones Midnight lists in its network documentation
// (docs.midnight.network/relnotes/network). They are midnightexplorer.com and its preprod
// and preview subdomains, which TexLabs runs (the site says "Powered by TexLabs" and calls
// itself an official partner of the Midnight Network); it is not Midnight's own, so the
// site names it rather than calling it "the Midnight explorer". Midnight does not document
// a per-transaction URL for them, so the app links to the explorer and shows the full
// transaction hash.
// SPDX-License-Identifier: Apache-2.0

export type NetworkId = 'mainnet' | 'preprod' | 'preview' | 'undeployed';

const KNOWN: NetworkId[] = ['mainnet', 'preprod', 'preview', 'undeployed'];

const configured = (import.meta.env.VITE_NETWORK_ID as string | undefined)?.toLowerCase();

/** This build's network. An unknown or missing value is treated as a local, undeployed one. */
export const NETWORK: NetworkId = KNOWN.includes(configured as NetworkId) ? (configured as NetworkId) : 'undeployed';

/** True for every network except mainnet. */
export const isTestNetwork = (n: string = NETWORK): boolean => n !== 'mainnet';

/** Plain name for a network, e.g. "Midnight preprod (test network)". */
export const networkLabel = (n: string = NETWORK): string => {
  switch (n) {
    case 'mainnet':
      return 'Midnight’s main network';
    case 'preprod':
      return 'Midnight preprod (test network)';
    case 'preview':
      return 'Midnight Preview (test network)';
    default:
      return 'a local development network';
  }
};

/** The explorer for a network, if Midnight lists one. */
export const explorerFor = (n: string = NETWORK): string | undefined => {
  switch (n) {
    case 'mainnet':
      return 'https://midnightexplorer.com/';
    case 'preprod':
      return 'https://preprod.midnightexplorer.com/';
    case 'preview':
      return 'https://preview.midnightexplorer.com/';
    default:
      return undefined;
  }
};

/**
 * Which network the site DESCRIBES: Midnight's main network in a `--mode mainnet` build,
 * a test network in every other build. It decides wording, labels and the explorer the
 * site links to. It switches on nothing else: the site never sends a transaction in any
 * build (records are dated by the registry's operator, in batches; licenses and lab
 * agreements in the web demo are simulated). There is deliberately no switch here that
 * turns on chain-writing code.
 */
export const IS_MAINNET: boolean = NETWORK === 'mainnet';

/**
 * The main contract's address on mainnet, for display. Set only in a mainnet build, from
 * MAINNET_VEILCORE_ADDRESS in api/src/deploy-guard.ts (vite.config.ts; a mainnet build
 * refuses to start without it). Empty in every other build.
 */
export const MAINNET_CONTRACT_ADDRESS: string = import.meta.env.VITE_MAINNET_CONTRACT_ADDRESS ?? '';

/** The claims contract's address on mainnet, for display; empty until it is pinned. */
export const MAINNET_CLAIMS_ADDRESS: string = import.meta.env.VITE_MAINNET_CLAIMS_ADDRESS ?? '';

/** The claims contract is on mainnet (its address is pinned) and this is a mainnet build. */
export const CLAIMS_ON_MAINNET: boolean = IS_MAINNET && MAINNET_CLAIMS_ADDRESS !== '';

/**
 * A mainnet build, and docs/maintenance-policy.md's status line says APPROVED (read at
 * build time, vite.config.ts). Until then the site says the policy is proposed, not decided.
 */
export const MAINTENANCE_POLICY_APPROVED: boolean =
  IS_MAINNET && import.meta.env.VITE_MAINTENANCE_POLICY_APPROVED === 'true';

/**
 * The origin every shared link and QR code points at. Links used to be built from
 * window.location.origin, so a certificate printed from a preview deployment, or from
 * a copy of the static bundle hosted anywhere, sent whoever scanned it to that host.
 *
 * A mainnet build always points at veilcore.org, whatever the setting says. A test-network
 * site names itself with VITE_CANONICAL_ORIGIN (test.veilcore.org,
 * scripts/deploy-test-site.mjs); one that doesn't (a local or preview build) points at
 * wherever it is being served from, because its records don't exist on veilcore.org and
 * a link there would tell the person checking it that there is no such record (round 3).
 */
export const canonicalOriginFor = (input: {
  mainnet: boolean;
  configured?: string;
  /** window.location.origin, when there is a window. */
  here?: string;
}): string => {
  const MAIN = 'https://veilcore.org';
  if (input.mainnet) return MAIN;
  const v = (input.configured ?? '').trim();
  const fallback = input.here && /^https?:\/\//.test(input.here) ? input.here : MAIN;
  if (!v) return fallback;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && u.pathname === '/' && !u.search ? u.origin : fallback;
  } catch {
    return fallback;
  }
};

const canonicalOrigin = (): string =>
  canonicalOriginFor({
    mainnet: IS_MAINNET,
    configured: import.meta.env.VITE_CANONICAL_ORIGIN,
    here: typeof window !== 'undefined' ? window.location.origin : undefined,
  });
export const CANONICAL_ORIGIN = canonicalOrigin();

/** An absolute link on the canonical site, for a path that starts with "/". */
export const canonicalUrl = (path: string): string => `${CANONICAL_ORIGIN}${path}`;

/**
 * Lab reports sent back through the registry (veilcore/lab-results.ts). On in every build,
 * mainnet included (16 Oct 2026): the registry is deployed before the site, and both site
 * deploys refuse a registry whose /health doesn't list "lab-results-v1"
 * (scripts/registry-features.mjs). To turn it off on a network again, list the network in
 * LAB_RESULTS_OFF and change the copy with it (copy-truth.test.ts): there, delivery codes
 * carry no lock, and "Send results back" and the breeder's lab report panels are hidden.
 */
const LAB_RESULTS_OFF: readonly string[] = [];
export const labResultsEnabledFor = (n: string): boolean => !LAB_RESULTS_OFF.includes(n);
export const LAB_RESULTS_ENABLED: boolean = labResultsEnabledFor(NETWORK);

/**
 * Logging an animal (veilcore/animal-profile.ts, docs/animal-profile.md). On in every build,
 * mainnet included (16 Oct 2026): veilcore/profile/animal-individual/v1 is final, and any
 * later field change is a v2. Both site deploys refuse a registry whose /health doesn't list
 * "animal-profile-v1". On a network listed in ANIMAL_RECORDS_OFF, the logging flow and the
 * collection import would offer plants alone; animal records that already exist (a backup,
 * a lab code, a check link) show as animals in every build.
 */
const ANIMAL_RECORDS_OFF: readonly string[] = [];
export const animalRecordsEnabledFor = (n: string): boolean => !ANIMAL_RECORDS_OFF.includes(n);
export const ANIMAL_RECORDS_ENABLED: boolean = animalRecordsEnabledFor(NETWORK);

/**
 * Strain and line records (veilcore/strain-profile.ts, docs/strain-profile.md): microbial
 * strains, cell lines, insect lines. The profile is a draft, so test networks only, as animal
 * records were before their v1 was final. Existing strain records show as strains everywhere.
 */
export const STRAIN_RECORDS_ENABLED: boolean = NETWORK !== 'mainnet';
