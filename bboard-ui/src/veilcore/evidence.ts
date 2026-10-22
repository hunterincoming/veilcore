// A sales report behind a royalty statement.
//
// A statement says what the licensee sold; the licensor has only their word. So the licensee
// can attach the report the figure came from: a Metrc sales export, a POS report, a
// spreadsheet. The file never leaves their device. Its SHA-256, name and size go inside the
// statement, under the licensee's signature, dated on Midnight with the rest of the deal.
// The licensee sends the file itself however they like; the licensor's page checks it is
// byte for byte the file the licensee signed for. From then on, neither can swap the report:
// a later "here's the real one" has another fingerprint.
//
// Pulling sales straight from Metrc needs VeilCore to be a Metrc validated integrator and each
// licensee to grant it an API key (docs/agreements-live.md). This works today, with any system.
// SPDX-License-Identifier: Apache-2.0

export type Evidence = {
  /** SHA-256 of the file's bytes, hex. */
  readonly sha256: string;
  readonly name: string;
  readonly size: number;
};

/** Reports up to this size (a year of a large shop's sales export fits). */
export const MAX_EVIDENCE_BYTES = 50 * 1024 * 1024;

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');

/** The file's name as shown: no paths, no control characters, at most 120 characters. */
const cleanName = (n: string) =>
  // eslint-disable-next-line no-control-regex -- control characters are what this removes
  (n.split(/[\\/]/).pop() ?? '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120) || 'report';

export const fingerprintFile = async (f: File): Promise<string> =>
  hex(await crypto.subtle.digest('SHA-256', await f.arrayBuffer()));

export const evidenceOf = async (f: File): Promise<Evidence> => {
  if (f.size > MAX_EVIDENCE_BYTES) throw new Error('That file is over 50 MB. Attach a report for just this period.');
  if (f.size === 0) throw new Error('That file is empty.');
  return { sha256: await fingerprintFile(f), name: cleanName(f.name), size: f.size };
};

/** Whether a file is exactly the report a statement was signed with. */
export const isTheReport = async (f: File, e: Evidence): Promise<boolean> =>
  f.size === e.size && (await fingerprintFile(f)) === e.sha256;

export const isEvidence = (v: unknown): v is Evidence =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Evidence).sha256 === 'string' &&
  /^[0-9a-f]{64}$/.test((v as Evidence).sha256) &&
  typeof (v as Evidence).name === 'string' &&
  Number.isSafeInteger((v as Evidence).size);

export const sizeText = (n: number) =>
  n < 1024 ? `${n} bytes` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
