// Reads deployments/<network>.json: where VeilCore's contracts are deployed and the SHA-256 of
// every compiled artefact they were built with. Used by verify-deployment.mjs (the chain against
// the file), verify-build.mjs (a local build against the file) and deployments.test.mjs (the
// file against docs/fingerprints.md, the README and the release manifests).
//
// The file is checked against deployments/schema.json before anything uses it. The validator
// below covers the JSON Schema keywords that schema uses and nothing more, so the check needs no
// package; a keyword it does not know is an error, not silently skipped.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const NETWORKS = ['mainnet', 'preprod'];

const KNOWN = new Set([
  '$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'const', 'enum', 'pattern',
  'minimum', 'minLength', 'minItems', 'minProperties', 'required', 'properties',
  'additionalProperties', 'propertyNames', 'items', 'oneOf',
]);

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const isType = (v, t) => (t === 'number' ? typeof v === 'number' : t === typeOf(v));

/** Errors of `value` against `schema` (JSON Schema 2020-12, the subset deployments/schema.json uses). */
export const validate = (schema, value, root = schema, at = '') => {
  const errs = [];
  const where = at === '' ? '(top)' : at;
  for (const k of Object.keys(schema)) if (!KNOWN.has(k)) errs.push(`${where}: the schema uses "${k}", which this validator does not check`);
  if (schema.$ref !== undefined) {
    const m = /^#\/\$defs\/([A-Za-z0-9_-]+)$/.exec(schema.$ref);
    if (!m || root.$defs?.[m[1]] === undefined) return [...errs, `${where}: unknown $ref ${schema.$ref}`];
    errs.push(...validate(root.$defs[m[1]], value, root, at));
  }
  if (schema.oneOf !== undefined) {
    const ok = schema.oneOf.filter((s) => validate(s, value, root, at).length === 0).length;
    if (ok !== 1) errs.push(`${where}: matches ${ok} of the ${schema.oneOf.length} allowed forms, not exactly one`);
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => isType(value, t))) return [...errs, `${where}: is ${typeOf(value)}, not ${types.join(' or ')}`];
  }
  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) errs.push(`${where}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum !== undefined && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value)))
    errs.push(`${where}: must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`);
  if (typeof value === 'string') {
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(value)) errs.push(`${where}: "${value}" does not match ${schema.pattern}`);
    if (schema.minLength !== undefined && [...value].length < schema.minLength) errs.push(`${where}: shorter than ${schema.minLength}`);
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) errs.push(`${where}: below ${schema.minimum}`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errs.push(`${where}: fewer than ${schema.minItems} items`);
    if (schema.items !== undefined) value.forEach((v, i) => errs.push(...validate(schema.items, v, root, `${at}[${i}]`)));
  }
  if (typeOf(value) === 'object') {
    const keys = Object.keys(value);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) errs.push(`${where}: fewer than ${schema.minProperties} entries`);
    for (const r of schema.required ?? []) if (!(r in value)) errs.push(`${where}: "${r}" is missing`);
    for (const k of keys) {
      const sub = `${at}.${k}`;
      if (schema.propertyNames !== undefined) errs.push(...validate(schema.propertyNames, k, root, `${sub} (name)`));
      if (schema.properties?.[k] !== undefined) errs.push(...validate(schema.properties[k], value[k], root, sub));
      else if (schema.additionalProperties === false) errs.push(`${sub}: not allowed here`);
      else if (typeof schema.additionalProperties === 'object') errs.push(...validate(schema.additionalProperties, value[k], root, sub));
    }
  }
  return errs;
};

export const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
export const schema = () => readJson(path.join(ROOT, 'deployments', 'schema.json'));

/** deployments/<network>.json, checked against the schema. Throws, listing every problem, if it does not conform. */
export const loadDeployments = (network, root = ROOT) => {
  if (!NETWORKS.includes(network)) throw new Error(`No deployments file for "${network}". Use one of: ${NETWORKS.join(', ')}.`);
  const file = path.join(root, 'deployments', `${network}.json`);
  const d = readJson(file);
  const errs = validate(schema(), d);
  if (d.network !== network) errs.push(`.network is "${d.network}", but the file is ${network}.json`);
  for (const c of d.contracts ?? []) if (c.network !== network) errs.push(`${c.name}: network is "${c.network}" in ${network}.json`);
  if (errs.length > 0) throw new Error(`deployments/${network}.json does not match deployments/schema.json:\n  ${errs.join('\n  ')}`);
  return d;
};

/** Circuit name -> SHA-256 of its verifier key. */
export const verifierPins = (contract) =>
  Object.fromEntries(Object.entries(contract.circuits).map(([name, a]) => [name, a.verifierKey]));

/** Every artefact of one contract as docs/fingerprints.md names it (path under managed/<contract>/) -> SHA-256. */
export const artefactRows = (contract) => {
  const out = new Map();
  for (const [name, a] of Object.entries(contract.circuits)) {
    out.set(`keys/${name}.prover`, a.proverKey);
    out.set(`keys/${name}.verifier`, a.verifierKey);
    out.set(`zkir/${name}.bzkir`, a.bzkir);
    out.set(`zkir/${name}.zkir`, a.zkir);
  }
  out.set('contract/index.js', contract.contractCode);
  return out;
};

const ROW = /^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/;
const HEADER = /^Commit `([0-9a-f]{7,40})`, compiler `([^`]+)`/;

/**
 * docs/fingerprints.md: the main contract's table, then the claims contract's under
 * "## Claims contract". For each: the rows (path -> SHA-256) and the commit and compiler its
 * header line names.
 */
export const parseFingerprints = (text) => {
  const out = { veilcore: { rows: new Map() }, 'veilcore-claims': { rows: new Map() } };
  let part = 'veilcore';
  for (const line of text.replace(/\r/g, '').split('\n')) {
    if (line.startsWith('## Claims contract')) part = 'veilcore-claims';
    const h = HEADER.exec(line);
    if (h) Object.assign(out[part], { commit: h[1], compiler: h[2] });
    const r = ROW.exec(line);
    if (r) out[part].rows.set(r[1], r[2]);
  }
  return out;
};

/** Differences between two path -> SHA-256 tables, as readable lines. Empty when they are the same. */
export const tableDifferences = (have, want, haveName, wantName) => {
  const out = [];
  for (const [f, h] of want) {
    if (!have.has(f)) out.push(`${f} is in ${wantName} but not in ${haveName}`);
    else if (have.get(f) !== h) out.push(`${f}: ${haveName} has ${have.get(f).slice(0, 12)}…, ${wantName} has ${h.slice(0, 12)}…`);
  }
  for (const f of have.keys()) if (!want.has(f)) out.push(`${f} is in ${haveName} but not in ${wantName}`);
  return out;
};

/** The compiler version the repository pins (compiler-version at the root). */
export const pinnedCompiler = (root = ROOT) => readFileSync(path.join(root, 'compiler-version'), 'utf8').trim();
