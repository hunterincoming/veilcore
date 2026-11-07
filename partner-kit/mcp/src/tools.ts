// veilcore-mcp's three tools. What each one reveals, and to whom, is in ../README.md.
//
//   check_record(link)          a record's public check, from its check link (record-check):
//                               asks VeilCore's registry the record's id and proof code, as
//                               the check page does, and looks the date stamp up on Midnight
//                               itself. Nothing private: a check link is meant to be shared.
//                               `acceptable` is true only when nothing contradicts the record
//                               AND its date was checked on Midnight here; a date the registry
//                               merely reports, or no date, is named in `missing` (panel
//                               review, S2).
//   check_document(link, path)  whether a file on this computer is byte for byte one of the
//                               files sealed in the document record the link names. The file
//                               is read here and never sent anywhere; the answer is yes or no.
//                               Only a file under the allowed folder (VEILCORE_MCP_ROOT, else
//                               the folder the server was started in), and only a path given
//                               in the call: a link that suggests where to look is refused, so
//                               a planted link can't turn this into a file oracle (S3).
//   draft_link(kind, preset, count)
//                               a veilcore.org link that opens the logging screen with only
//                               the kind of record, the preset and how many. Names, parents
//                               and records are never in a link: the person picks them there.
//
// None of them saves, signs, sends a transaction or reads a record's private contents.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { acceptable, datedOnChain, whatIsMissing, type CheckOptions } from '../../record-check/src/check.js';
import { checkRecord, type ChainOptions } from '../../record-check/src/node.js';

export const DEFAULT_ORIGIN = 'https://veilcore.org';
/** The bulk import's row limit (bboard-ui veilcore/bulk-import.ts MAX_ROWS): the most a batch makes. */
export const MAX_BATCH = 500;
/** The largest file check_document reads. */
export const MAX_FILE_BYTES = 1024 * 1024 * 1024;
export const DOCUMENT_PROFILE = 'veilcore/profile/document/v1';
/** The most files a document link may list (a document record has a handful). */
export const MAX_DOCUMENT_FILES = 20;
/** Never read: the kernel's and devices' pseudo-files, whatever size they report. */
const SYSTEM_DIRS = ['/proc', '/sys', '/dev'];

const KINDS = ['plant', 'animal', 'strain'] as const;
const PRESETS = ['record', 'cross', 'clones', 'offspring'] as const;
type Kind = (typeof KINDS)[number];
type Preset = (typeof PRESETS)[number];

export class ToolInputError extends Error {}

export type ToolContext = {
  readonly origin?: string;
  readonly registry?: string;
  readonly fetch?: CheckOptions['fetch'];
  /** For tests: the date stamp look-up, in place of Midnight's indexer. */
  readonly checkAnchor?: CheckOptions['checkAnchor'];
  /** How the date stamp is looked up on Midnight (the indexer, a second one, a Blockfrost id). */
  readonly chain?: ChainOptions;
  /**
   * check_document reads only files inside this folder: VEILCORE_MCP_ROOT, or, unset, the
   * folder the server was started in. There is no "anywhere" setting.
   */
  readonly root?: string;
};

export type ToolDefinition = {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly annotations: Record<string, boolean>;
};

export const TOOLS: readonly ToolDefinition[] = [
  {
    name: 'check_record',
    title: 'Check a VeilCore record',
    description:
      'Check a VeilCore record from its check link: whether the registry has it, whether its proof code matches the link, its date stamp (looked up on Midnight itself), lab signatures and what none of this shows. Sends the record id and proof code in the link to VeilCore’s public registry, and asks a Midnight indexer about the date stamp. `acceptable` is true only when nothing contradicts the record and its date was checked on Midnight; otherwise `missing` says what is lacking, such as a date the registry only reports. A record shows prior possession by a date.',
    inputSchema: {
      type: 'object',
      properties: { link: { type: 'string', description: 'The record’s check link (https://veilcore.org/verify/…).' } },
      required: ['link'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'check_document',
    title: 'Check a file against a sealed document',
    description:
      'Whether a file on this computer is, byte for byte, one of the files sealed in the document record a document check link names. The file is read on this computer and sent nowhere; the answer is only yes or no (no, too, when there is no readable file at that path). Only a file inside the allowed folder (VEILCORE_MCP_ROOT, or the folder the server was started in), and only a path the person gives: a link that suggests where to look is refused. It does not check the document’s date: open the link in a browser for that.',
    inputSchema: {
      type: 'object',
      properties: {
        link: { type: 'string', description: 'The document check link (https://veilcore.org/check-document#d=…).' },
        path: {
          type: 'string',
          description: 'The file to check, on this computer: a path the person gave, inside the allowed folder.',
        },
      },
      required: ['link', 'path'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'draft_link',
    title: 'Make a link to start a record',
    description:
      'A veilcore.org link that opens the logging screen ready for one record, a cross, clones of a plant or offspring of an animal, with only the kind, the preset and how many. Nothing is saved: the person checks and saves on that screen, and picks any parent there.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: [...KINDS] },
        preset: { type: 'string', enum: [...PRESETS] },
        count: { type: 'integer', minimum: 1, maximum: MAX_BATCH },
      },
      required: ['kind', 'preset'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const str = (args: Record<string, unknown>, key: string, max = 20_000): string => {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new ToolInputError(`${key} is required (text).`);
  if (v.length > max) throw new ToolInputError(`${key} is too long.`);
  return v.trim();
};

// ---- draft_link ----

/** Which presets fit which kind: a plant is cut, an animal has offspring. */
const fits = (kind: Kind, preset: Preset) =>
  preset === 'record' ||
  preset === 'cross' ||
  (preset === 'clones' && kind === 'plant') ||
  (preset === 'offspring' && kind === 'animal');

/** The same link the site's ask/handoff.ts draftLink makes and readDraftFragment reads. */
export const draftLink = (origin: string, kind: unknown, preset: unknown, count?: unknown): string => {
  if (!KINDS.includes(kind as Kind)) throw new ToolInputError(`kind must be one of ${KINDS.join(', ')}.`);
  if (!PRESETS.includes(preset as Preset)) throw new ToolInputError(`preset must be one of ${PRESETS.join(', ')}.`);
  const k = kind as Kind;
  const p = preset as Preset;
  if (!fits(k, p))
    throw new ToolInputError(p === 'clones' ? 'Clones are cut from a plant.' : 'Offspring are of an animal.');
  const q = new URLSearchParams({ kind: k, preset: p });
  if (p === 'clones' || p === 'offspring') {
    const n = count === undefined ? 1 : count;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1)
      throw new ToolInputError('count must be a whole number from 1.');
    q.set('count', String(Math.min(n, MAX_BATCH)));
  }
  return `${origin.replace(/\/+$/, '')}/new#draft=${q.toString()}`;
};

// ---- check_document ----

type DocumentFile = { name: string; sha256: string; size: number };

/** The sealed files a document check link names (`#d=` base64url of {"v":1,"fields":{…}}). */
export const documentFilesOf = (link: string): DocumentFile[] => {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    throw new ToolInputError('That is not a link.');
  }
  const hash = url.hash;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  // A link that says where to look for the file is refused: a document link never does, and
  // one that does is written to make this tool read a file the person didn't name (S3).
  for (const [k] of [...url.searchParams, ...params]) if (PATH_HINT.test(k)) throw new ToolInputError(SUGGESTS_PATH);
  const d = params.get('d');
  if (!d || !/^[A-Za-z0-9_-]+$/.test(d)) throw new ToolInputError('That is not a document check link (no #d=).');
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(d, 'base64url').toString('utf8'));
  } catch {
    throw new ToolInputError('The document check link can’t be read: ask for the whole link.');
  }
  const fields = (parsed as { v?: unknown; fields?: unknown } | null)?.fields as Record<string, unknown> | undefined;
  if ((parsed as { v?: unknown }).v !== 1 || !fields || fields.profile !== DOCUMENT_PROFILE)
    throw new ToolInputError('That link is not for a document record.');
  if (suggestsPath(parsed) || suggestsPath(fields)) throw new ToolInputError(SUGGESTS_PATH);
  const files = Array.isArray(fields.files) ? fields.files : [];
  for (const f of files) {
    if (!f || typeof f !== 'object') continue;
    if (suggestsPath(f)) throw new ToolInputError(SUGGESTS_PATH);
    const name = (f as { name?: unknown }).name;
    // A sealed file's name is a name, never a path.
    if (typeof name === 'string' && /[\\/]|^~|^\.\.?$/.test(name)) throw new ToolInputError(SUGGESTS_PATH);
  }
  const out = files.filter(
    (f): f is DocumentFile =>
      !!f &&
      typeof f === 'object' &&
      typeof (f as DocumentFile).sha256 === 'string' &&
      /^[0-9a-f]{64}$/.test((f as DocumentFile).sha256) &&
      Number.isInteger((f as DocumentFile).size),
  );
  if (!out.length) throw new ToolInputError('That document record names no files.');
  if (files.length > MAX_DOCUMENT_FILES) throw new ToolInputError('That document link lists too many files.');
  return out;
};

const inside = (dir: string, p: string) => p === dir || p.startsWith(dir.endsWith(path.sep) ? dir : dir + path.sep);

/** Keys a link might use to say where a file is: none belongs in a document link. */
const PATH_HINT =
  /^(path|paths|file|filepath|file_path|filename|dir|directory|folder|location|local|open|at|cwd|root)$/i;
const SUGGESTS_PATH =
  'That link says where to look for the file. A document check link never does: give the file’s path yourself, from a folder this server may read.';
const suggestsPath = (o: unknown): boolean =>
  !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).some((k) => PATH_HINT.test(k));

/** The folder check_document may read: VEILCORE_MCP_ROOT, else where the server was started. */
export const allowedRoot = (root?: string): string => path.resolve(root ?? process.cwd());

/**
 * SHA-256 of a file on this computer, read as a stream. Refuses anything outside the allowed
 * folder (allowedRoot: there is always one), a symbolic link, the system's pseudo-files (/proc,
 * /sys, /dev), and more than MAX_FILE_BYTES however large the file says it is. A path with no
 * plain file at it gives undefined, which check_document answers exactly as a file that doesn't
 * match: the answer never says whether a path exists (S3).
 */
export const fileSha256 = async (
  file: string,
  root?: string,
): Promise<{ sha256: string; size: number } | undefined> => {
  const abs = path.resolve(file);
  const rootAbs = allowedRoot(root);
  const r = await realpath(rootAbs).catch(() => undefined);
  if (!r) throw new ToolInputError('The folder this server may read does not exist.');
  // Judged on the path as given, before anything is read: outside the folder, nothing is looked at.
  if (!inside(rootAbs, abs) && !inside(r, abs))
    throw new ToolInputError('That file is outside the folder this server may read.');
  if (SYSTEM_DIRS.some((d) => inside(d, abs))) throw new ToolInputError('That is a system file, not a document.');
  const l = await lstat(abs).catch(() => undefined);
  if (!l) return undefined;
  if (l.isSymbolicLink()) throw new ToolInputError('That path is a link to another file: give the file itself.');
  if (!l.isFile()) return undefined;
  const real = await realpath(abs);
  if (SYSTEM_DIRS.some((d) => inside(d, real))) throw new ToolInputError('That is a system file, not a document.');
  if (!inside(r, real)) throw new ToolInputError('That file is outside the folder this server may read.');
  if (l.size > MAX_FILE_BYTES) throw new ToolInputError('That file is too large to check here.');
  const h = createHash('sha256');
  let size = 0;
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(real);
    stream
      .on('data', (c: Buffer) => {
        size += c.length;
        if (size > MAX_FILE_BYTES) stream.destroy(new ToolInputError('That file is too large to check here.'));
        else h.update(c);
      })
      .on('end', () => resolve())
      .on('error', reject);
  });
  return { sha256: h.digest('hex'), size };
};

// ---- the calls ----

export const callTool = async (
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext = {},
): Promise<Record<string, unknown>> => {
  switch (name) {
    case 'check_record': {
      // The date stamp is looked up on Midnight itself, never taken from the registry's report.
      const check = await checkRecord(str(args, 'link', 4000), {
        ...(ctx.registry ? { registry: ctx.registry } : {}),
        ...(ctx.fetch ? { fetch: ctx.fetch } : {}),
        ...(ctx.checkAnchor ? { checkAnchor: ctx.checkAnchor } : { chain: ctx.chain ?? {} }),
      });
      const nothingContradicts = acceptable(check);
      const onChain = datedOnChain(check);
      return {
        acceptable: nothingContradicts && onChain,
        nothingContradicts,
        datedOnChain: onChain,
        missing: whatIsMissing(check),
        summary: check.summary,
        check,
      };
    }
    case 'check_document': {
      const files = documentFilesOf(str(args, 'link'));
      const mine = await fileSha256(str(args, 'path', 4096), ctx.root);
      // Yes or no only: never the file's hash, name or size, nor the record's files, nor
      // whether there is a file at that path.
      return { match: !!mine && files.some((f) => f.sha256 === mine.sha256 && f.size === mine.size) };
    }
    case 'draft_link':
      return { link: draftLink(ctx.origin ?? DEFAULT_ORIGIN, args.kind, args.preset, args.count) };
    default:
      throw new ToolInputError(`No tool called ${name}.`);
  }
};
