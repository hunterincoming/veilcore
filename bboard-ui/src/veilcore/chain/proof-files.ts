// The proving keys and Midnight's public parameters: the big files the prover needs (over
// 135 MB together), which never change for a contract version.
//
// They used to be copied into every build of the site, so every deploy stored another full
// copy on Vercel and filled the team's storage. Now they are published once, by fingerprint, on
// VeilCore's own file host (scripts/publish-proof-files.mjs, https://keys.veilcore.org), and the
// site fetches them from there:
//
//   <host>/sha256/<SHA-256 of the file>
//
// Every file is checked against the SHA-256 pinned in this build (proof-files.json, the same
// fingerprints as deployments/mainnet.json and bboard-ui/scripts/params.sha256.json) before it
// is used, wherever it came from, and again when it is read back from the browser's cache. A
// file that doesn't match is never used: so the host does not have to be trusted, only reached.
// If the host has no good copy, this site's own /keys and /params are tried too (a self-hosted
// copy may serve them there), with the same check.
//
// VITE_PROOF_FILES_URL names the host. Unset (local builds, and the unit and browser tests with
// their stand-in contract), the files are read from this site as before, without the check; a
// deploy refuses to build without it (scripts/proof-files.mjs).
// SPDX-License-Identifier: Apache-2.0

import table from './proof-files.json';

/** Each file the prover may fetch, by the path it had on this site ('keys/anchor.prover'), to its SHA-256. */
export const PROOF_FILES: Readonly<Record<string, string>> = table.files;

/** Said when a file came back, but not as the one this build pins. */
export const WRONG_PROOF_FILE =
  'A proving file was not the exact file this site was built to use, so it was not used. Nothing was sent.';
/** Said when no copy could be had at all. */
export const PROOF_FILES_UNREACHABLE =
  'The proving files could not be downloaded right now. Nothing was sent. Try again in a few minutes.';

/** A proving file was wrong or could not be had. Nothing was proved or sent with it. */
export class ProofFileError extends Error {
  constructor(
    /** The file, as 'keys/anchor.prover' (for support details and the console). */
    readonly file: string,
    readonly kind: 'wrong' | 'unreachable',
  ) {
    super(kind === 'wrong' ? WRONG_PROOF_FILE : PROOF_FILES_UNREACHABLE);
    this.name = 'ProofFileError';
  }
}

/**
 * The host from a VITE_PROOF_FILES_URL value: a plain https origin (http only for this
 * computer, in tests), without a trailing slash; undefined when unset or anything else.
 */
export const proofFilesHost = (value: string | undefined): string | undefined => {
  const v = (value ?? '').trim().replace(/\/+$/, '');
  if (!v) return undefined;
  try {
    const u = new URL(v);
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return undefined;
    if (u.pathname !== '/' || u.search || u.hash || u.username || u.password) return undefined;
    return u.origin;
  } catch {
    return undefined;
  }
};

const env = import.meta.env as unknown as Record<string, string | undefined>;
/** This build's proof file host, or undefined (files from this site, unchecked: see above). */
export const PROOF_FILES_URL: string | undefined = proofFilesHost(env.VITE_PROOF_FILES_URL);

/** The pinned path a request on this site is for ('keys/anchor.prover'), or undefined for anything else. */
export const pinnedPathOf = (
  url: string,
  siteOrigin: string,
  files: Readonly<Record<string, string>> = PROOF_FILES,
): string | undefined => {
  let u: URL;
  let site: string;
  try {
    site = new URL(siteOrigin).origin;
    u = new URL(url, site);
  } catch {
    return undefined;
  }
  // A query string ('/keys/anchor.prover?v=1') makes this not a pinned path, so that request
  // goes to this site as it is, unchecked. Harmless today: midnight-js and the prover worker
  // never add one, and a deployed build of this site has no /keys or /params to answer it. If
  // anything ever starts adding one, strip it here first, so the request is still checked.
  if (u.origin !== site || u.search) return undefined;
  let p: string;
  try {
    p = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  } catch {
    return undefined;
  }
  return Object.hasOwn(files, p) ? p : undefined;
};

export type ProofFileSource = {
  /** The proof file host (PROOF_FILES_URL). */
  readonly host: string;
  /** This site, tried second. */
  readonly siteOrigin: string;
  readonly fetch: (url: string) => Promise<Response>;
  /** The browser's Cache Storage for these files, when there is one. */
  readonly cache?: Cache;
  /** The pins. Tests only; everything else uses PROOF_FILES. */
  readonly files?: Readonly<Record<string, string>>;
};

/** Where a pinned file is looked for, in order: the host, by its fingerprint, then this site, by its path. */
export const proofFileUrls = (path: string, src: Pick<ProofFileSource, 'host' | 'siteOrigin' | 'files'>): string[] => {
  const sha = (src.files ?? PROOF_FILES)[path];
  return sha ? [`${src.host}/sha256/${sha}`, `${new URL(src.siteOrigin).origin}/${path}`] : [];
};

const sha256Hex = async (b: Uint8Array): Promise<string> =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(b))), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');

// A single-page-app host answers a missing file with its page and 200: that is "not there".
const usable = (r: Response | undefined): r is Response =>
  !!r && r.ok && !(r.headers.get('content-type') ?? '').includes('text/html');

/**
 * A pinned file's bytes, checked against its SHA-256. The browser's cache is looked at first,
 * under every place the file may have come from (the host's address, and this site's own, where
 * a visitor from before the host keeps a copy), so a good copy kept from either is used without
 * downloading it again. Only then is each place tried on the network, in turn. A copy that
 * doesn't match, cached or downloaded, is dropped from the cache and never returned.
 * @throws ProofFileError 'wrong' when a copy was had but none matched, 'unreachable' when none was had
 */
export const loadProofFile = async (path: string, src: ProofFileSource): Promise<Uint8Array> => {
  const want = (src.files ?? PROOF_FILES)[path];
  if (!want) throw new ProofFileError(path, 'wrong');
  const urls = proofFileUrls(path, src);
  if (src.cache) {
    for (const url of urls) {
      const hit = await src.cache.match(url).catch(() => undefined);
      if (!usable(hit)) continue;
      let bytes: Uint8Array | undefined;
      try {
        bytes = new Uint8Array(await hit.arrayBuffer());
      } catch {
        bytes = undefined;
      }
      if (bytes && (await sha256Hex(bytes)) === want) return bytes;
      await src.cache.delete(url).catch(() => undefined);
    }
  }
  let wrong = false;
  for (const url of urls) {
    let res: Response | undefined;
    try {
      res = await src.fetch(url);
    } catch {
      continue;
    }
    if (!usable(res)) continue;
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await res.arrayBuffer());
    } catch {
      continue;
    }
    if ((await sha256Hex(bytes)) !== want) {
      wrong = true;
      console.warn(`VeilCore: ${url} is not ${path} as this site pins it (SHA-256 ${want}); not used.`);
      continue;
    }
    await src.cache
      ?.put(url, new Response(new Uint8Array(bytes), { headers: { 'content-type': 'application/octet-stream' } }))
      .catch(() => undefined);
    return bytes;
  }
  throw new ProofFileError(path, wrong ? 'wrong' : 'unreachable');
};

/**
 * A fetch for midnight-js's FetchZkConfigProvider that answers this site's pinned paths
 * (/keys/<circuit>.verifier and the rest) from loadProofFile, checked, and passes every other
 * request to `base` as it is.
 */
export const proofFileFetch =
  (base: typeof fetch, src: Omit<ProofFileSource, 'fetch'>): typeof fetch =>
  async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path =
      (init?.method ?? 'GET').toUpperCase() === 'GET' ? pinnedPathOf(url, src.siteOrigin, src.files) : undefined;
    if (!path) return base(input, init);
    const bytes = await loadProofFile(path, { ...src, fetch: (u) => base(u) });
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: { 'content-type': 'application/octet-stream' },
    });
  };

/** The ProofFileError behind a library's wrapped error (midnight-js wraps fetch failures), if there is one. */
export const proofFileErrorIn = (e: unknown): ProofFileError | undefined => {
  for (let x: unknown = e, i = 0; x && i < 5; x = (x as { cause?: unknown }).cause, i++)
    if (x instanceof ProofFileError) return x;
  return undefined;
};
