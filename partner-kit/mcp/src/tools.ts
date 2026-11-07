// veilcore-mcp's three tools. What each one reveals, and to whom, is in ../README.md.
//
//   check_record(link)          a record's public check, from its check link (record-check):
//                               asks VeilCore's registry the record's id and proof code, as
//                               the check page does. Nothing private: a check link is meant
//                               to be shared.
//   check_document(link, path)  whether a file on this computer is byte for byte one of the
//                               files sealed in the document record the link names. The file
//                               is read here and never sent anywhere; the answer is yes or no.
//   draft_link(kind, preset, count)
//                               a veilcore.org link that opens the logging screen with only
//                               the kind of record, the preset and how many. Names, parents
//                               and records are never in a link: the person picks them there.
//
// None of them saves, signs, sends a transaction or reads a record's private contents.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { acceptable, checkRecord, type CheckOptions } from '../../record-check/src/check.js';

export const DEFAULT_ORIGIN = 'https://veilcore.org';
/** The bulk import's row limit (bboard-ui veilcore/bulk-import.ts MAX_ROWS): the most a batch makes. */
export const MAX_BATCH = 500;
/** The largest file check_document reads. */
export const MAX_FILE_BYTES = 1024 * 1024 * 1024;
export const DOCUMENT_PROFILE = 'veilcore/profile/document/v1';

const KINDS = ['plant', 'animal', 'strain'] as const;
const PRESETS = ['record', 'cross', 'clones', 'offspring'] as const;
type Kind = (typeof KINDS)[number];
type Preset = (typeof PRESETS)[number];

export class ToolInputError extends Error {}

export type ToolContext = {
  readonly origin?: string;
  readonly registry?: string;
  readonly fetch?: CheckOptions['fetch'];
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
      'Check a VeilCore record from its check link: whether the registry has it, whether its proof code matches the link, its date stamp, lab signatures and what none of this shows. Sends the record id and proof code in the link to VeilCore’s public registry. A record shows prior possession by a date.',
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
      'Whether a file on this computer is, byte for byte, one of the files sealed in the document record a document check link names. The file is read on this computer and sent nowhere; the answer is only yes or no. It does not check the document’s date: open the link in a browser for that.',
    inputSchema: {
      type: 'object',
      properties: {
        link: { type: 'string', description: 'The document check link (https://veilcore.org/check-document#d=…).' },
        path: { type: 'string', description: 'The file to check, on this computer.' },
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
  let hash: string;
  try {
    hash = new URL(link).hash;
  } catch {
    throw new ToolInputError('That is not a link.');
  }
  const d = new URLSearchParams(hash.replace(/^#/, '')).get('d');
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
  const files = Array.isArray(fields.files) ? fields.files : [];
  const out = files.filter(
    (f): f is DocumentFile =>
      !!f &&
      typeof f === 'object' &&
      typeof (f as DocumentFile).sha256 === 'string' &&
      /^[0-9a-f]{64}$/.test((f as DocumentFile).sha256) &&
      Number.isInteger((f as DocumentFile).size),
  );
  if (!out.length) throw new ToolInputError('That document record names no files.');
  return out;
};

/** SHA-256 of a file on this computer, read as a stream; refuses what isn't a file or is too large. */
export const fileSha256 = async (path: string): Promise<{ sha256: string; size: number }> => {
  const s = await stat(path).catch(() => undefined);
  if (!s?.isFile()) throw new ToolInputError('No file at that path.');
  if (s.size > MAX_FILE_BYTES) throw new ToolInputError('That file is too large to check here.');
  const h = createHash('sha256');
  await new Promise<void>((resolve, reject) =>
    createReadStream(path)
      .on('data', (c) => h.update(c))
      .on('end', () => resolve())
      .on('error', reject),
  );
  return { sha256: h.digest('hex'), size: s.size };
};

// ---- the calls ----

export const callTool = async (
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext = {},
): Promise<Record<string, unknown>> => {
  switch (name) {
    case 'check_record': {
      const check = await checkRecord(str(args, 'link', 4000), {
        ...(ctx.registry ? { registry: ctx.registry } : {}),
        ...(ctx.fetch ? { fetch: ctx.fetch } : {}),
      });
      return { acceptable: acceptable(check), summary: check.summary, check };
    }
    case 'check_document': {
      const files = documentFilesOf(str(args, 'link'));
      const mine = await fileSha256(str(args, 'path', 4096));
      // Yes or no only: never the file's hash, name or size, nor the record's files.
      return { match: files.some((f) => f.sha256 === mine.sha256 && f.size === mine.size) };
    }
    case 'draft_link':
      return { link: draftLink(ctx.origin ?? DEFAULT_ORIGIN, args.kind, args.preset, args.count) };
    default:
      throw new ToolInputError(`No tool called ${name}.`);
  }
};
