// A holder whose claim and lab signature were saved before PR #234 (the sponsor's 66-hex
// identifiers, not the hashes) still gets links that check (PR #231, third review): each
// identifier is turned into its hash before the link is made, the hash is saved back, and no
// link is made at all when that can't be done right now (link-hashes.ts).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { claimLink, readClaimLink, type MadeClaim } from './claim-link';
import { readTwoClaimLink, type TwoClaim } from './two-record-claims';
import { claimTxIds, hashesFor, LinkNotReady, readyClaimLink, readyTwoClaimLink } from './link-hashes';
import { recordWithHashes } from './tx-rename';
import { txHashOf } from './chain/tx-hash';
import { MATCH_SCHEMA } from './marker-claims';

const ORIGIN = 'https://veilcore.org';
const hashOf = (link: string) => link.slice(link.indexOf('#'));
const CONTRACT = 'c1'.repeat(32);
// Saved by an older build: the sponsor's identifiers (a leading byte, then 32).
const CLAIM_ID = '00' + 'a1'.repeat(32);
const LAB_ID = '00' + 'b2'.repeat(32);
const MORE_ID = '00' + 'c3'.repeat(32);
const HASH = { [CLAIM_ID]: 'a9'.repeat(32), [LAB_ID]: 'b9'.repeat(32), [MORE_ID]: 'c9'.repeat(32) } as Record<
  string,
  string
>;

/** A Midnight indexer that knows these three transactions by identifier (chain/tx-hash.ts query). */
const indexer = (up = true) =>
  vi.fn((_u: unknown, init?: RequestInit) => {
    if (!up) return Promise.reject(new TypeError('Failed to fetch'));
    const body = JSON.parse(init?.body as string) as { variables: { byId: { identifier: string } } };
    const id = body.variables.byId.identifier;
    const transactions = HASH[id] ? [{ hash: HASH[id], identifiers: [id] }] : [];
    return Promise.resolve(new Response(JSON.stringify({ data: { transactions } })));
  });
const lookupWith = (f: typeof fetch) => (id: string) => txHashOf(id, { fetch: f, indexer: 'https://i.example' });

/** A claim as an older build kept it, with the lab signature's call it put in every link. */
const saved: MadeClaim = {
  kind: 'range',
  contract: CONTRACT,
  txId: CLAIM_ID,
  record: 'ee'.repeat(32),
  schema: 'veilcore/schema/potency/v1',
  slot: 0,
  op: 'at-most',
  bound: '300',
  attested: { txId: LAB_ID, attester: 'aa'.repeat(64) },
};

describe('a claim and lab signature saved before the hash fix', () => {
  it('as saved, the link would be refused by the check page', () => {
    expect(readClaimLink(hashOf(claimLink(saved, ORIGIN)))).toBeUndefined();
  });

  it('gets a link that checks, every transaction by its hash, and the hashes are saved back once', async () => {
    const f = indexer();
    const save = vi.fn();
    const link = await readyClaimLink(saved, ORIGIN, { lookup: lookupWith(f), save });
    const read = readClaimLink(hashOf(link));
    expect(read).toMatchObject({ txId: HASH[CLAIM_ID], attested: { txId: HASH[LAB_ID] } });
    expect(save).toHaveBeenCalledTimes(1);
    expect([...(save.mock.calls[0][0] as Map<string, string>)]).toEqual([
      [CLAIM_ID, HASH[CLAIM_ID]],
      [LAB_ID, HASH[LAB_ID]],
    ]);
    // Once saved as hashes, the next link asks nothing and saves nothing.
    const again = vi.fn();
    const f2 = indexer();
    await readyClaimLink(read as MadeClaim, ORIGIN, { lookup: lookupWith(f2), save: again });
    expect(f2).not.toHaveBeenCalled();
    expect(again).not.toHaveBeenCalled();
  });

  it('further claims on a lab’s comparison are converted too', async () => {
    const marker: MadeClaim = {
      ...saved,
      schema: MATCH_SCHEMA,
      slot: 2,
      op: 'at-least',
      bound: '30',
      more: [{ kind: 'range', txId: MORE_ID, slot: 1, op: 'at-least', bound: '1' }],
    };
    expect(claimTxIds(marker)).toEqual([CLAIM_ID, LAB_ID, MORE_ID]);
    const link = await readyClaimLink(marker, ORIGIN, { lookup: lookupWith(indexer()) });
    expect(readClaimLink(hashOf(link))?.more?.[0].txId).toBe(HASH[MORE_ID]);
  });

  it('indexer down: no link at all, nothing saved; never a link the check page would refuse', async () => {
    const save = vi.fn();
    await expect(
      readyClaimLink(saved, ORIGIN, { lookup: lookupWith(indexer(false) as typeof fetch), save }),
    ).rejects.toBeInstanceOf(LinkNotReady);
    expect(save).not.toHaveBeenCalled();
    // An identifier nothing carries, or an answer that isn't a hash: the same.
    await expect(
      readyClaimLink({ ...saved, txId: '00' + 'dd'.repeat(32) }, ORIGIN, {
        lookup: lookupWith(indexer() as typeof fetch),
      }),
    ).rejects.toBeInstanceOf(LinkNotReady);
    await expect(hashesFor([CLAIM_ID], () => Promise.resolve('not a hash'))).rejects.toBeInstanceOf(LinkNotReady);
  });

  it('each layer on its own: a failed lookup refuses, and a link the check page would refuse is never handed out', async () => {
    // The lookup alone (without the link's own check behind it).
    await expect(hashesFor([CLAIM_ID], () => Promise.reject(new Error('down')))).rejects.toBeInstanceOf(LinkNotReady);
    // The link's own check alone: nothing to look up, but the saved claim is not one the page reads.
    const lookup = vi.fn();
    await expect(
      readyClaimLink({ ...saved, txId: 'ab'.repeat(32), attested: undefined, record: 'not a record' }, ORIGIN, {
        lookup,
      }),
    ).rejects.toBeInstanceOf(LinkNotReady);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('a hash is never looked up', async () => {
    const lookup = vi.fn();
    expect((await hashesFor(['ab'.repeat(32)], lookup)).size).toBe(0);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('a claim about two records, the same', async () => {
    const two = {
      kind: 'distinct',
      contract: CONTRACT,
      txId: CLAIM_ID,
      record: 'ee'.repeat(32),
      other: 'dd'.repeat(32),
      schema: 'veilcore/schema/potency/v1',
    } as TwoClaim;
    const link = await readyTwoClaimLink(two, ORIGIN, { lookup: lookupWith(indexer()) });
    expect(readTwoClaimLink(hashOf(link))?.txId).toBe(HASH[CLAIM_ID]);
    await expect(
      readyTwoClaimLink(two, ORIGIN, { lookup: lookupWith(indexer(false) as typeof fetch) }),
    ).rejects.toBeInstanceOf(LinkNotReady);
  });
});

describe('saving the hashes back (records.ts renameTransactions)', () => {
  const map = new Map([
    [CLAIM_ID, HASH[CLAIM_ID]],
    [LAB_ID, HASH[LAB_ID]],
    [MORE_ID, HASH[MORE_ID]],
  ]);

  it('renames claims, their lab signature and further claims, claims about two records and the lab’s call', () => {
    // As a record comes back from the device, or from a backup file restored on another one.
    const record = {
      id: 'r1',
      claims: [{ ...saved, more: [{ kind: 'range', txId: MORE_ID, slot: 1 }] }],
      twoClaims: [{ txId: CLAIM_ID, kind: 'distinct' }],
      labOnChain: { contract: CONTRACT, txId: LAB_ID, blockHeight: 7 },
    };
    expect(recordWithHashes(record, map)).toEqual({
      id: 'r1',
      claims: [
        {
          ...saved,
          txId: HASH[CLAIM_ID],
          attested: { ...saved.attested, txId: HASH[LAB_ID] },
          more: [{ kind: 'range', txId: HASH[MORE_ID], slot: 1 }],
        },
      ],
      twoClaims: [{ txId: HASH[CLAIM_ID], kind: 'distinct' }],
      labOnChain: { contract: CONTRACT, txId: HASH[LAB_ID], blockHeight: 7 },
    });
  });

  it('leaves a record with nothing to rename untouched', () => {
    const plain = { id: 'r2', claims: [{ txId: 'ab'.repeat(32) }] };
    const bare: { id: string; claims?: { txId: string }[] } = { id: 'r3' };
    expect(recordWithHashes(plain, map)).toBeUndefined();
    expect(recordWithHashes(bare, map)).toBeUndefined();
  });
});

describe('the pages make claim links only through link-hashes.ts', () => {
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  it.each([
    ['components/document/ProveNumber.tsx', 'readyClaimLink'],
    ['components/document/TwoRecordClaims.tsx', 'readyTwoClaimLink'],
  ])('%s: never claimLink / twoClaimLink straight to the clipboard', (file, ready) => {
    const src = fs.readFileSync(path.join(HERE, '..', file), 'utf8');
    expect(src).toContain(`${ready}(`);
    expect(src).toContain('renameTransactions');
    expect(src).not.toMatch(/\b(claimLink|twoClaimLink)\(/);
  });
});
