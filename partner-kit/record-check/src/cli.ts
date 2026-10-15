// npx @veilcore/partner-kit check <check link> [options]
//
// Prints the check as JSON (or plain words with --text). Exit status: 0 when the record
// exists, the link's fingerprint matches, and nothing given contradicts it (sealed fields,
// the key in the link, the date stamp when looked up); 1 when the check ran and any of
// that is not so; 2 when nothing could be checked (a bad link, the registry unreachable,
// wrong options). Exit 0 is not a verdict about the material: read the answer.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { checkRecord, LinkError, RegistryError, type RecordCheck } from './node.js';

const USAGE = `Check a VeilCore record from its check link. Free, no account, no key.

  partner-kit check <check link or record id> [options]

Options:
  --registry <url>               the registry to ask (default: VeilCore's public registry).
                                 Never taken from the link.
  --fields <file.json>           the record's sealed fields, if the depositor gave them
                                 (record/sealed-fields.json from their evidence bundle):
                                 they must hash to the record's fingerprint.
  --on-chain                     look the date stamp up on Midnight (needs @veilcore/contracts
                                 installed, and a Blockfrost project id on mainnet/preprod
                                 unless --indexer is given).
  --indexer <url>                the Midnight indexer to ask (implies --on-chain).
  --second-indexer <url>         a second indexer; both must agree.
  --blockfrost-project-id <id>   or VEILCORE_BLOCKFROST_PROJECT_ID.
  --text                         plain words instead of JSON.
  --timeout <seconds>            per request (default 15).

Exit status: 0 the record exists and the link's fingerprint matches (and nothing given
contradicts it); 1 the check ran and that is not so; 2 nothing could be checked.
VeilCore never vouches: the answer says what was checked and what is someone's word.`;

/** Exit 0 only when nothing in the answer contradicts the link. */
export const exitCodeOf = (c: RecordCheck): 0 | 1 =>
  c.recordExists &&
  c.fingerprintMatches === true &&
  c.disclosedFieldsMatch !== false &&
  c.keyBound.keyInLink !== 'does-not-match' &&
  c.dated.status !== 'not-confirmed'
    ? 0
    : 1;

/** The answer in plain words. */
export const asText = (c: RecordCheck): string => {
  const lines = [c.summary, ''];
  const d = c.dated;
  // Nothing is listed for a link that doesn't match: none of it was checked.
  if (c.recordExists && c.fingerprint && c.fingerprintMatches !== false) {
    lines.push(`Fingerprint: ${c.fingerprint}`);
    if (d.batch) lines.push(`Batch: ${d.batch} (root ${d.batchRoot ?? '?'})`);
    lines.push(`Date: ${d.reason}`);
    if (d.bitcoinStamp) lines.push(`Bitcoin stamp file: ${d.bitcoinStamp} (the registry's report)`);
    lines.push(`Key: ${c.keyBound.reason}`);
    for (const r of c.labReceipts) lines.push(`- ${r.words}`);
    if (c.labReceiptsTotal > c.labReceipts.length)
      lines.push(`  (${c.labReceiptsTotal - c.labReceipts.length} more not fetched)`);
    if (c.registryFirstSeen) lines.push(`First stored by the registry: ${c.registryFirstSeen} (the registry’s clock)`);
  }
  if (c.problems.length) lines.push('', 'Could not be checked:', ...c.problems.map((p) => `- ${p}`));
  lines.push('', 'What this does not show:', ...c.whatThisDoesNotShow.map((p) => `- ${p}`));
  return lines.join('\n');
};

/** Where the CLI writes: process.stdout and process.stderr, or anything with write(). */
type Out = { write(s: string): unknown };

export const main = async (
  argv: readonly string[],
  out: Out = process.stdout,
  err: Out = process.stderr,
): Promise<number> => {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        registry: { type: 'string' },
        fields: { type: 'string' },
        'on-chain': { type: 'boolean' },
        indexer: { type: 'string' },
        'second-indexer': { type: 'string' },
        'blockfrost-project-id': { type: 'string' },
        text: { type: 'boolean' },
        timeout: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (e) {
    err.write(`${e instanceof Error ? e.message : String(e)}\n\n${USAGE}\n`);
    return 2;
  }
  const { values: v, positionals } = parsed;
  if (v.help) {
    out.write(`${USAGE}\n`);
    return 0;
  }
  const [cmd, link, ...rest] = positionals;
  if (cmd !== 'check' || !link || rest.length > 0) {
    err.write(`${USAGE}\n`);
    return 2;
  }
  let fields: unknown;
  if (v.fields !== undefined) {
    try {
      fields = JSON.parse(readFileSync(v.fields, 'utf8')) as unknown;
    } catch (e) {
      err.write(`Could not read ${v.fields} as JSON: ${e instanceof Error ? e.message : String(e)}\n`);
      return 2;
    }
  }
  const timeout = v.timeout === undefined ? 15 : Number(v.timeout);
  if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 300) {
    err.write('--timeout is a number of seconds, at most 300.\n');
    return 2;
  }
  const blockfrostProjectId = v['blockfrost-project-id'] ?? process.env.VEILCORE_BLOCKFROST_PROJECT_ID;
  const onChain = v['on-chain'] === true || v.indexer !== undefined || v['second-indexer'] !== undefined;
  try {
    const c = await checkRecord(link, {
      registry: v.registry,
      fields,
      timeoutMs: timeout * 1000,
      chain: onChain
        ? {
            indexer: v.indexer,
            secondIndexer: v['second-indexer'],
            blockfrostProjectId,
            timeoutMs: timeout * 1000,
          }
        : undefined,
    });
    out.write(v.text ? `${asText(c)}\n` : `${JSON.stringify(c, null, 2)}\n`);
    return exitCodeOf(c);
  } catch (e) {
    if (e instanceof LinkError || e instanceof RegistryError) {
      err.write(`${e.message}\n`);
      return 2;
    }
    err.write(`The check failed: ${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
};
