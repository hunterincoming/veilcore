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
import {
  claimLinkNow,
  claimTxIds,
  hashesFor,
  LinkNotReady,
  readyClaimLink,
  readyTwoClaimLink,
  twoClaimLinkNow,
  type ClaimAt,
} from './link-hashes';
import type { Claim } from '../../../contract/src/verify-claims';
import { fieldSchemaId } from '../../../contract/src/field-schema';
import { SCHEMAS } from './field-set';
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

const bytes = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));
const schemaId = (s: string) => fieldSchemaId(SCHEMAS[s]);
const LAB_KEY = { x: BigInt('0x' + 'aa'.repeat(32)), y: BigInt('0x' + 'aa'.repeat(32)) };

/**
 * Midnight's claims contract as the check page reads it (chain/claim-check.ts readClaimAt): what
 * the call at each hash recorded. `at` maps a hash to its claim; anything else can't be read.
 */
const chain = (at: Record<string, Claim>) =>
  vi.fn<ClaimAt>((_contract, txHash) =>
    at[txHash] ? Promise.resolve(at[txHash]) : Promise.reject(new Error('no such transaction')),
  );

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

/** What Midnight really recorded at each hash in HASH. */
const ON_CHAIN: Record<string, Claim> = {
  [HASH[CLAIM_ID]]: {
    kind: 'range',
    record: bytes(saved.record),
    schema: schemaId(saved.schema),
    slot: 0,
    op: 'at most',
    bound: 300n,
  },
  [HASH[LAB_ID]]: { kind: 'attested', record: bytes(saved.record), schema: new Uint8Array(32), attester: LAB_KEY },
};
const honest = () => chain(ON_CHAIN);

describe('a claim and lab signature saved before the hash fix', () => {
  it('as saved, the link would be refused by the check page', () => {
    expect(readClaimLink(hashOf(claimLink(saved, ORIGIN)))).toBeUndefined();
  });

  it('gets a link that checks, every transaction by its hash, and the hashes are saved back once', async () => {
    const f = indexer();
    const save = vi.fn();
    const atHash = honest();
    const link = await readyClaimLink(saved, ORIGIN, { lookup: lookupWith(f), read: atHash, save });
    const read = readClaimLink(hashOf(link));
    // Each new hash was read back from Midnight before it was saved.
    expect(atHash.mock.calls.map((c) => c[1]).sort()).toEqual([HASH[CLAIM_ID], HASH[LAB_ID]].sort());
    expect(read).toMatchObject({ txId: HASH[CLAIM_ID], attested: { txId: HASH[LAB_ID] } });
    expect(save).toHaveBeenCalledTimes(1);
    expect([...(save.mock.calls[0][0] as Map<string, string>)]).toEqual([
      [CLAIM_ID, HASH[CLAIM_ID]],
      [LAB_ID, HASH[LAB_ID]],
    ]);
    // Once saved as hashes, the next link asks nothing and saves nothing.
    const again = vi.fn();
    const f2 = indexer();
    const reads = honest();
    await readyClaimLink(read as MadeClaim, ORIGIN, { lookup: lookupWith(f2), read: reads, save: again });
    expect(f2).not.toHaveBeenCalled();
    expect(reads).not.toHaveBeenCalled();
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
    const id = schemaId(MATCH_SCHEMA);
    const markerChain = {
      ...ON_CHAIN,
      [HASH[CLAIM_ID]]: { kind: 'range', record: bytes(saved.record), schema: id, slot: 2, op: 'at least', bound: 30n },
      [HASH[MORE_ID]]: { kind: 'range', record: bytes(saved.record), schema: id, slot: 1, op: 'at least', bound: 1n },
    } as Record<string, Claim>;
    const link = await readyClaimLink(marker, ORIGIN, { lookup: lookupWith(indexer()), read: chain(markerChain) });
    expect(readClaimLink(hashOf(link))?.more?.[0].txId).toBe(HASH[MORE_ID]);
    // The further claim's hash naming some other bound: no link, nothing saved.
    const save = vi.fn();
    await expect(
      readyClaimLink(marker, ORIGIN, {
        lookup: lookupWith(indexer()),
        read: chain({ ...markerChain, [HASH[MORE_ID]]: { ...markerChain[HASH[MORE_ID]], bound: 2n } }),
        save,
      }),
    ).rejects.toBeInstanceOf(LinkNotReady);
    expect(save).not.toHaveBeenCalled();
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
    const twoOnChain = {
      [HASH[CLAIM_ID]]: {
        kind: 'distinct',
        record: bytes(two.record),
        other: bytes(two.other),
        schema: schemaId(two.schema),
      },
    } as Record<string, Claim>;
    const read = chain(twoOnChain);
    const link = await readyTwoClaimLink(two, ORIGIN, { lookup: lookupWith(indexer()), read });
    expect(readTwoClaimLink(hashOf(link))?.txId).toBe(HASH[CLAIM_ID]);
    expect(read).toHaveBeenCalledWith(CONTRACT, HASH[CLAIM_ID], true);
    // The indexer's hash names a claim about other records: no link, nothing saved.
    const save = vi.fn();
    await expect(
      readyTwoClaimLink(two, ORIGIN, {
        lookup: lookupWith(indexer()),
        read: chain({ [HASH[CLAIM_ID]]: { ...twoOnChain[HASH[CLAIM_ID]], other: bytes('cc'.repeat(32)) } }),
        save,
      }),
    ).rejects.toBeInstanceOf(LinkNotReady);
    expect(save).not.toHaveBeenCalled();
    await expect(
      readyTwoClaimLink(two, ORIGIN, { lookup: lookupWith(indexer(false) as typeof fetch) }),
    ).rejects.toBeInstanceOf(LinkNotReady);
  });
});

// The indexer's answer to "which hash has this id" is not taken on its word (fourth review, polish
// 1): a lying or broken indexer could name someone else's transaction, and a saved hash is never
// looked up again, so that holder's link would fail for good. The claim at the hash is read and
// compared with the holder's own, as the check page compares it, before anything is saved.
describe('a lying indexer: the hash it gives is checked before it is saved', () => {
  /** An indexer that answers every id with `liar`'s hash (as if that transaction carried it). */
  const lying = (liar: string) =>
    vi.fn((_u: unknown, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string) as { variables: { byId: { identifier: string } } };
      const id = body.variables.byId.identifier;
      return Promise.resolve(
        new Response(JSON.stringify({ data: { transactions: [{ hash: liar, identifiers: [id] }] } })),
      );
    });
  const OTHER = 'f7'.repeat(32);

  it.each<[string, Claim | undefined]>([
    ['someone else’s claim about another record', { ...ON_CHAIN[HASH[CLAIM_ID]], record: bytes('ab'.repeat(32)) }],
    ['a claim with another bound', { ...ON_CHAIN[HASH[CLAIM_ID]], bound: 301n }],
    ['a claim in the other direction', { ...ON_CHAIN[HASH[CLAIM_ID]], op: 'at least' }],
    ['a claim about another number', { ...ON_CHAIN[HASH[CLAIM_ID]], slot: 1 }],
    ['a claim under another schema', { ...ON_CHAIN[HASH[CLAIM_ID]], schema: new Uint8Array(32) }],
    ['a laboratory signature', ON_CHAIN[HASH[LAB_ID]]],
    ['nothing that can be read', undefined],
  ])('the claim’s hash naming %s: no link, nothing saved', async (_what, atLie) => {
    const save = vi.fn();
    const only: MadeClaim = { ...saved, attested: undefined };
    await expect(
      readyClaimLink(only, ORIGIN, {
        lookup: lookupWith(lying(OTHER) as typeof fetch),
        read: chain(atLie ? { [OTHER]: atLie } : {}),
        save,
      }),
    ).rejects.toBeInstanceOf(LinkNotReady);
    expect(save).not.toHaveBeenCalled();
  });

  it('the lab signature’s hash naming another key’s signature, or one on another record: no link, nothing saved', async () => {
    for (const lie of [
      { ...ON_CHAIN[HASH[LAB_ID]], attester: { x: 1n, y: 2n } },
      { ...ON_CHAIN[HASH[LAB_ID]], record: bytes('ab'.repeat(32)) },
      ON_CHAIN[HASH[CLAIM_ID]],
    ] as Claim[]) {
      const save = vi.fn();
      // The claim itself is honest (its id already a hash); only the lab's call is looked up.
      const c: MadeClaim = { ...saved, txId: HASH[CLAIM_ID] };
      await expect(
        readyClaimLink(c, ORIGIN, {
          lookup: lookupWith(lying(OTHER) as typeof fetch),
          read: chain({ ...ON_CHAIN, [OTHER]: lie }),
          save,
        }),
      ).rejects.toBeInstanceOf(LinkNotReady);
      expect(save).not.toHaveBeenCalled();
    }
  });

  it('a later try asks again, and an honest answer then makes the link and saves it', async () => {
    const save = vi.fn();
    await expect(
      readyClaimLink(saved, ORIGIN, { lookup: lookupWith(lying(OTHER) as typeof fetch), read: honest(), save }),
    ).rejects.toBeInstanceOf(LinkNotReady);
    expect(save).not.toHaveBeenCalled();
    const link = await readyClaimLink(saved, ORIGIN, { lookup: lookupWith(indexer()), read: honest(), save });
    expect(readClaimLink(hashOf(link))?.txId).toBe(HASH[CLAIM_ID]);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('a link that needs nothing looked up is ready at once (for the clipboard, copy-link.ts)', () => {
  it('only when every id is a hash', () => {
    expect(claimLinkNow(saved, ORIGIN)).toBeUndefined();
    const hashed: MadeClaim = { ...saved, txId: HASH[CLAIM_ID], attested: { ...saved.attested!, txId: HASH[LAB_ID] } };
    expect(readClaimLink(hashOf(claimLinkNow(hashed, ORIGIN)!))).toMatchObject({ txId: HASH[CLAIM_ID] });
    const two = {
      kind: 'distinct',
      contract: CONTRACT,
      txId: CLAIM_ID,
      record: 'ee'.repeat(32),
      other: 'dd'.repeat(32),
      schema: 'veilcore/schema/potency/v1',
    } as TwoClaim;
    expect(twoClaimLinkNow(two, ORIGIN)).toBeUndefined();
    expect(readTwoClaimLink(hashOf(twoClaimLinkNow({ ...two, txId: HASH[CLAIM_ID] }, ORIGIN)!))?.txId).toBe(
      HASH[CLAIM_ID],
    );
    // Never a link the check page would refuse.
    expect(claimLinkNow({ ...hashed, record: 'not a record' }, ORIGIN)).toBeUndefined();
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

  // Safari refuses a clipboard write that comes after a wait (copy-link.ts): the clipboard must be
  // asked before the first `await` of the tap handler, and a link made but not copied gets a button.
  it.each(['components/document/ProveNumber.tsx', 'components/document/TwoRecordClaims.tsx'])(
    '%s: the clipboard is asked inside the tap, and a ready link has its own button',
    (file) => {
      const src = fs.readFileSync(path.join(HERE, '..', file), 'utf8');
      const body = src.slice(src.indexOf('const copy = async'));
      const handler = body.slice(0, body.indexOf('\n  };\n'));
      expect(handler.indexOf('copyLink(')).toBeGreaterThan(-1);
      expect(handler.indexOf('copyLink(')).toBeLessThan(handler.indexOf('await '));
      expect(src).not.toContain('await navigator.clipboard.writeText');
      expect(src).toContain("t('app.claim.linkReady')");
      expect(src).toContain('data-claim-copy-ready');
    },
  );
});

describe('the words for a link that can’t be made, or is ready to copy', () => {
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const budget = JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', 'complexity-budget.json'), 'utf8')) as {
    jargon: { terms: Record<string, string[]> };
  };
  it.each(['en', 'de', 'es', 'fr', 'ja'])('%s: there, in its own words, with no banned word', async (lang) => {
    const { document: words } = (await import(`../i18n/app/${lang}/document.ts`)) as {
      document: Record<string, string>;
    };
    const { document: en } = await import('../i18n/app/en/document');
    for (const key of ['app.claim.linkLater', 'app.claim.linkReady']) {
      const w = words[key];
      expect(w, `${lang} ${key}`).toBeTruthy();
      if (lang !== 'en') expect(w, `${lang} ${key} is translated`).not.toBe((en as Record<string, string>)[key]);
      for (const term of budget.jargon.terms[lang]) expect(w.toLowerCase(), `${lang} ${key}`).not.toContain(term);
    }
  });
});
