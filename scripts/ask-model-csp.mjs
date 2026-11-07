// The Content-Security-Policy of Ask's two on-device model workers (docs/ask-veilcore.md,
// "v2.1: the on-device model"). The page's own policy is not changed for the model: its
// connect-src stays 'self' and the registry. Each worker file gets its own policy instead,
// served on its own route (scripts/vercel-config.mjs), and the worker checks that its policy is
// the one in force before it does anything (bboard-ui/src/ask-local/worker-csp.ts):
//
//   download worker  may fetch only the pinned model folders on Hugging Face (one commit each,
//                    resolve/<commit>/, never main), Hugging Face's file-storage host, which
//                    those addresses redirect to, and this site (the model library,
//                    /ask-model/...). No other host. It never sees what is typed.
//   engine worker    may fetch nothing (connect-src 'none'). It holds what is typed; it reads the
//                    weights and the library from the browser's cache, where the download worker
//                    put them and where they are checked again before every start.
//
// Both: scripts only from this site, WebAssembly compiled (the engine), no eval, Trusted Types
// required with no policy allowed, nothing else.
// SPDX-License-Identifier: Apache-2.0

/** Hugging Face's file-storage hosts: a redirect host the pin script reports must be one of these. */
export const HF_STORAGE_HOST =
  /^(cas-bridge\.xethub\.hf\.co|cdn-lfs(-[a-z0-9-]+)?\.hf\.co|cdn-lfs(-[a-z0-9-]+)?\.huggingface\.co)$/;

/** The worker files as Vite names them in the build: assets/<name>.worker-<hash>.js. */
export const MODEL_WORKER_FILE = /^\/assets\/ask-model-(download|engine)\.worker-[A-Za-z0-9_-]+\.js$/;
/** The same, as Vercel route sources (PCRE), one per worker. */
export const modelWorkerRouteSrc = (which) => `^/assets/ask-model-${which}\\.worker-[A-Za-z0-9_-]+\\.js$`;
/** Every other path: the site's own headers. */
export const SITE_ROUTE_SRC = '^/(?!assets/ask-model-(?:download|engine)\\.worker-[A-Za-z0-9_-]+\\.js$).*$';

const COMMIT = /^[0-9a-f]{40}$/;
const REPO = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** The pinned folder of one model, as the download worker fetches it. */
export const modelFolder = (m) => `https://huggingface.co/${m.repo}/resolve/${m.commit}/`;

/** Where the manifest's pins are not usable, why; undefined when they are. */
export const manifestProblem = (manifest) => {
  if (!manifest || !Array.isArray(manifest.models)) return 'no models';
  for (const m of manifest.models) {
    if (!REPO.test(m.repo ?? '')) return `${m.id}: repo is not owner/name`;
    if (!COMMIT.test(m.commit ?? '')) return `${m.id}: not pinned to a commit`;
  }
  for (const h of manifest.redirectHosts ?? [])
    if (!HF_STORAGE_HOST.test(h)) return `${h} is not a Hugging Face file-storage host`;
  return undefined;
};

const common = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
];

/** The download worker's policy. With nothing pinned it may fetch nothing at all. */
export const downloadWorkerCsp = (manifest) => {
  const pinned = manifest?.pinned === true && !manifestProblem(manifest);
  const connect = pinned
    ? [...manifest.models.map(modelFolder), ...(manifest.redirectHosts ?? []).map((h) => `https://${h}`)].join(' ')
    : '';
  return [...common, "script-src 'self'", `connect-src ${connect ? `${connect} 'self'` : "'none'"}`].join('; ');
};

/** The engine worker's policy: WebAssembly, and no network at all. */
export const engineWorkerCsp = () =>
  [...common, "script-src 'self' 'wasm-unsafe-eval'", "connect-src 'none'"].join('; ');
