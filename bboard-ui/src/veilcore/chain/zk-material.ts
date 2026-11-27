// The files the prover needs:
//   keys/<circuit>.prover, keys/<circuit>.verifier     the proving keys      } from VeilCore's proof
//   params/bls_midnight_2p<k>                          public parameters     } file host, each checked
//                                                                            } against its pinned SHA-256
//   /zkir/<circuit>.bzkir (or .zkir, converted here)    the circuit, from this site
// The keys and parameters come from the host this build names (proof-files.ts, VITE_PROOF_FILES_URL),
// or, in a build without one, from this site's /keys and /params as before. Kept in the
// browser's Cache Storage after the first download. Only the circuits this app calls are
// served: a request for any other key is refused, so this prover cannot be used for anything else.
// SPDX-License-Identifier: Apache-2.0

import { jsonIrToBinary, type KeyMaterialProvider, type ProvingKeyMaterial } from '@midnight-ntwrk/zkir-v2';
import { BROWSER_CIRCUITS, CLAIMS_BROWSER_CIRCUITS } from './config';
import { PROOF_FILES, loadProofFile } from './proof-files';

/**
 * Which circuit a prover is asked for. Ledger 8 names the circuit itself (`anchor`). Ledger 9,
 * the network's ledger after its fork (mainnet since 6 November 2026), names the deployed key:
 * `contract:<address>/<circuit>?vk=<SHA-256 of the verifier key the contract holds>`
 * (midnight-js 5 / compact-js ContractKeyLocation, the same grammar). Anything else is refused.
 */
export const circuitOfKeyLocation = (
  keyLocation: string,
): { readonly circuit: string; readonly verifierKeySha256?: string } | undefined => {
  if (/^[A-Za-z0-9_]+$/.test(keyLocation)) return { circuit: keyLocation };
  const m = /^contract:[0-9a-fA-F]{64}\/([A-Za-z0-9_]+)\?vk=([0-9a-f]{64})$/.exec(keyLocation);
  return m ? { circuit: m[1], verifierKeySha256: m[2] } : undefined;
};

const sha256Hex = async (b: Uint8Array): Promise<string> =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(b))), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');

/**
 * k of each circuit the browser proves (measured with Zkir.getK on the compiled circuits): the
 * main contract's are 13 and 14; the claims contract's proveAttested 13, proveValue 15,
 * proveRange 16, and proveDistinct and proveUnchanged 17 (docs/claims-design.md, Size). The
 * site doesn't host the k=17 parameters yet (scripts/fetch-params.mjs pins 13 to 16), so asking
 * for them says they aren't on this site yet.
 */
export const PARAMS_K = [13, 14, 15, 16, 17] as const;

export type Progress = (msg: string) => void;

const isHtml = (r: Response): boolean => (r.headers.get('content-type') ?? '').includes('text/html');

const fetchBytes = async (url: string, cache: Cache | undefined): Promise<Uint8Array | undefined> => {
  const hit = cache ? await cache.match(url) : undefined;
  const res = hit ?? (await fetch(url));
  // A single-page-app host answers a missing file with index.html and 200: that is "missing".
  if (!res.ok || isHtml(res)) return undefined;
  if (!hit && cache) await cache.put(url, res.clone()).catch(() => undefined);
  return new Uint8Array(await res.arrayBuffer());
};

/**
 * `proofFiles`: the proof file host (PROOF_FILES_URL) and, for tests, the pins and a fetch.
 * Without a host, keys and parameters are read from `origin` as before, unchecked.
 */
export type ProofFilesOption = {
  readonly host: string;
  readonly files?: Readonly<Record<string, string>>;
  readonly fetch?: (url: string) => Promise<Response>;
};

export const makeKeyMaterialProvider = (
  origin: string,
  cacheName: string,
  progress: Progress,
  proofFiles?: ProofFilesOption,
): KeyMaterialProvider => {
  const opened =
    typeof caches !== 'undefined' ? caches.open(cacheName).catch(() => undefined) : Promise.resolve(undefined);
  const memo = new Map<string, Promise<ProvingKeyMaterial | undefined>>();
  const params = new Map<number, Promise<Uint8Array>>();
  const pins = proofFiles?.files ?? PROOF_FILES;

  /** A key or parameter file: checked from the host when this build names one, else from this site. */
  const bigFile = async (path: string, cache: Cache | undefined): Promise<Uint8Array | undefined> => {
    if (!proofFiles) return fetchBytes(`${origin}/${path}`, cache);
    if (!Object.hasOwn(pins, path)) return undefined;
    return loadProofFile(path, {
      host: proofFiles.host,
      siteOrigin: origin,
      fetch: proofFiles.fetch ?? ((u) => fetch(u)),
      cache,
      files: pins,
    });
  };

  const load = async (circuit: string): Promise<ProvingKeyMaterial | undefined> => {
    const cache = await opened;
    progress('Downloading the proving keys (first time only)…');
    const [proverKey, verifierKey] = await Promise.all([
      bigFile(`keys/${circuit}.prover`, cache),
      bigFile(`keys/${circuit}.verifier`, cache),
    ]);
    let ir = await fetchBytes(`${origin}/zkir/${circuit}.bzkir`, cache);
    if (!ir) {
      const json = await fetchBytes(`${origin}/zkir/${circuit}.zkir`, cache);
      if (json) ir = jsonIrToBinary(new TextDecoder().decode(json));
    }
    if (!proverKey || !verifierKey || !ir) {
      throw new Error(`The proving files for ${circuit} are not on this site yet.`);
    }
    return { proverKey, verifierKey, ir };
  };

  return {
    lookupKey: async (keyLocation: string) => {
      const at = circuitOfKeyLocation(keyLocation);
      if (!at || ![...BROWSER_CIRCUITS, ...CLAIMS_BROWSER_CIRCUITS].includes(at.circuit as never)) return undefined;
      let m = memo.get(at.circuit);
      if (!m) {
        m = load(at.circuit);
        memo.set(at.circuit, m);
        m.catch(() => memo.delete(at.circuit));
      }
      const material = await m;
      // Ledger 9 names the key the contract holds: this site's files must be exactly those.
      if (
        material &&
        at.verifierKeySha256 !== undefined &&
        (await sha256Hex(material.verifierKey)) !== at.verifierKeySha256
      )
        throw new Error(`This site's proving files for ${at.circuit} are not the ones the contract uses.`);
      return material;
    },
    getParams: (k: number) => {
      if (!(PARAMS_K as readonly number[]).includes(k))
        return Promise.reject(new Error(`No parameters for k=${k} here.`));
      let p = params.get(k);
      if (!p) {
        p = (async () => {
          progress('Downloading the public parameters (first time only)…');
          const b = await bigFile(`params/bls_midnight_2p${k}`, await opened);
          if (!b) throw new Error(`The public parameters (k=${k}) are not on this site yet.`);
          return b;
        })();
        params.set(k, p);
        p.catch(() => params.delete(k));
      }
      return p;
    },
  };
};
