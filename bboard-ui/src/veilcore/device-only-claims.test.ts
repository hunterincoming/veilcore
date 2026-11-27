// "Prove a fact" for a document kept on this device only (docs/device-only-records.md,
// "Proving a number"): off until the holder turns it on, "exactly" asked for twice, and the
// registry sent nothing typed even then. The registry is deny-by-default here
// (fixtures/dishonest-registry.ts lieEverywhere): every request it is sent is kept, and any
// route the app isn't expected to call is refused and counted. The claim call itself is a
// stand-in that keeps what it is given: that is what goes to Midnight through the sponsor.
// An ordinary document, the potency form and claim links made before are as they were.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, installStorage, settle, type Browser } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';
import { lieEverywhere } from './fixtures/dishonest-registry';
import { MARKERS, backUp, nothingLeft, pathOf, until } from './fixtures/device-only-doc';
import { makeFieldSet } from './field-set';
import { KIND_SCHEMA, KIND_SCHEMA_ID } from './document-kind';
import { canProve, proveShown, type ClaimCalls } from './prove-number';
import { claimLink, readClaimLink, type MadeClaim } from './claim-link';
import type { ClaimMaterial } from './claims-input';

vi.mock('./chain/config', async (actual) => ({ ...(await actual<Record<string, unknown>>()), CLAIMS_READY: true }));

let reg: FakeRegistry;
beforeEach(() => {
  vi.unstubAllGlobals();
  installStorage();
  reg = fakeRegistry();
  vi.stubGlobal('fetch', reg.fetch);
  stubWebLocks();
  (globalThis as { document?: unknown }).document ??= {
    visibilityState: 'visible',
    createElement: () => ({ click() {} }),
  };
});
afterEach(() => vi.unstubAllGlobals());

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
/** The numbers typed for the batch: 120 plants, 80 in flower, 12.50 m². */
const NUMBERS = [120n, 80n, 1250n];

/** A grow batch with something typed in every field, sealed in this browser. */
const sealBatch = (b: Browser, deviceOnly: boolean) =>
  b.run(async () => {
    const { sealDocumentRecord } = await import('./seal-record');
    const fieldSet = await makeFieldSet(KIND_SCHEMA['grow-batch'], NUMBERS);
    const sealed = await sealDocumentRecord({
      title: MARKERS[0],
      type: 'other',
      issuer: MARKERS[1],
      reference: MARKERS[2],
      issued: '2026-11-01',
      files: [{ name: MARKERS[5], sha256: 'ab'.repeat(32), size: 1234 }],
      about: [],
      holder: MARKERS[3],
      notes: MARKERS[4],
      fieldSet,
    });
    const r = b.m.records.createRecord(deviceOnly ? { ...sealed, deviceOnly: true } : sealed);
    await until(() =>
      reg.sent.some((p) => p.method === 'PUT' && pathOf(p.url) === '/api/records/dating' && p.body.includes(r.id)),
    );
    await settle(150);
    return r;
  });

type Call = { circuit: string; commitment: string; schemaId: string; slot: number; direction?: string; bound?: bigint };
/** The claim calls, standing in for the chain: what each was given is what would be published. */
const standInChain = () => {
  const calls: Call[] = [];
  const receipt = (n: number) => ({
    contract: 'c1'.repeat(32),
    txId: `00${n.toString(16).padStart(2, '0')}beef`,
    blockHeight: 4242,
  });
  const chain: ClaimCalls = {
    proveRangeOnChain: (m: ClaimMaterial, slot, direction, bound) => {
      calls.push({
        circuit: 'proveRange',
        commitment: hex(m.commitment),
        schemaId: hex(m.schemaId),
        slot,
        direction,
        bound,
      });
      return Promise.resolve(receipt(calls.length));
    },
    proveValueOnChain: (m: ClaimMaterial, slot) => {
      calls.push({ circuit: 'proveValue', commitment: hex(m.commitment), schemaId: hex(m.schemaId), slot });
      return Promise.resolve(receipt(calls.length));
    },
  };
  return { calls, chain };
};

describe('the choice on a device-only record’s page', () => {
  it('is off until turned on; an ordinary document is as before', () => {
    expect(proveShown({ deviceOnly: true, optedIn: false, enabled: true })).toBe(false);
    expect(proveShown({ deviceOnly: true, optedIn: true, enabled: true })).toBe(true);
    expect(proveShown({ deviceOnly: true, optedIn: true, enabled: false })).toBe(false);
    for (const optedIn of [false, true])
      for (const enabled of [false, true]) expect(proveShown({ deviceOnly: false, optedIn, enabled })).toBe(true);
  });

  it('“exactly” needs a second confirmation on a device-only record, and only there', () => {
    const ok = { boundOk: true, meets: true };
    expect(canProve({ ...ok, deviceOnly: true, how: 'exactly', confirmedExact: false })).toBe(false);
    expect(canProve({ ...ok, deviceOnly: true, how: 'exactly', confirmedExact: true })).toBe(true);
    expect(canProve({ ...ok, deviceOnly: true, how: 'at-most', confirmedExact: false })).toBe(true);
    expect(canProve({ ...ok, deviceOnly: true, how: 'at-least', confirmedExact: false })).toBe(true);
    expect(canProve({ ...ok, deviceOnly: false, how: 'exactly', confirmedExact: false })).toBe(true);
    // As before, for every record: no limit, or a number that doesn't meet it, proves nothing.
    expect(canProve({ boundOk: false, meets: false, deviceOnly: false, how: 'at-most', confirmedExact: false })).toBe(
      false,
    );
    expect(canProve({ boundOk: true, meets: false, deviceOnly: true, how: 'at-most', confirmedExact: true })).toBe(
      false,
    );
  });

  it('the page shows no way to prove until the box is ticked, then says what would be published', async () => {
    const A = await browser('page');
    const record = await sealBatch(A, true);
    const html = await A.run(async () => {
      // The components are drawn to text, as on a server: no page for them to look at.
      const g = globalThis as { document?: unknown };
      const page0 = g.document;
      delete g.document;
      const { LanguageProvider } = await import('../i18n');
      const { DeviceOnlyProve } = await import('../components/document/ProveNumber');
      vi.stubGlobal('window', {
        localStorage: { getItem: () => null, setItem: () => undefined },
        location: { search: '', origin: 'https://test.veilcore.org' },
      });
      const page = (props: Record<string, unknown>) =>
        renderToStaticMarkup(
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(DeviceOnlyProve, { record, ...props } as never),
          ),
        );
      try {
        return {
          off: page({}),
          on: page({ initialOn: true }),
          exact: page({ initialOn: true, initialHow: 'exactly' }),
        };
      } finally {
        vi.stubGlobal('window', undefined);
        g.document = page0;
      }
    });
    // Off: the choice and what it would do, and nothing that proves.
    expect(html.off).toContain('data-device-only-prove="off"');
    expect(html.off).toContain('Off unless you turn it on here.');
    expect(html.off).toContain('Nothing is sent to VeilCore’s registry.');
    // Who can tie a claim to this record is said before the choice, and again before the button.
    const TIE =
      'What you prove is public on Midnight in a way that VeilCore, and anyone who has this record’s check link, can tie to this record. VeilCore can also tie it to the holder key that dated the record.';
    expect(html.off).toContain(TIE);
    expect(html.on.split(TIE).length).toBeGreaterThanOrEqual(3);
    expect(html.off).not.toContain('data-prove-number');
    expect(html.off).not.toContain('data-prove-go');
    // On: the panel, and before anything is typed, that the limit decides what is published.
    expect(html.on).toContain('data-device-only-prove="on"');
    expect(html.on).toContain('data-prove-number');
    expect(html.on).toContain('What will be published if you go ahead');
    expect(html.on).toContain('Type a limit to see exactly what would be published.');
    expect(html.on).toContain('through VeilCore’s fee service');
    // "Exactly": the number itself is named, the box is unticked, and the button can't be pressed.
    expect(html.exact).toContain('data-device-only-publish="exactly"');
    expect(html.exact).toContain(
      'the form “Grow batch”, the field “Plants in this batch on the record’s date” and the number itself, 120, with a code that stands for this record.',
    );
    expect(html.exact).toContain('Yes, publish the number itself: 120, on Midnight, for good.');
    expect(html.exact).toMatch(
      /<button[^>]*\bdisabled=""[^>]*data-prove-go=""|<button[^>]*data-prove-go=""[^>]*\bdisabled=""/,
    );
    expect(html.exact).not.toMatch(
      /data-device-only-confirm-exact=""[^>]*\bchecked=""|\bchecked=""[^>]*data-device-only-confirm-exact=""/,
    );
  });
});

describe('proving from a document kept on this device only', () => {
  it('sends the registry nothing typed: the claim goes to the chain call alone, and is kept on this device', async () => {
    const A = await browser('claims');
    const record = await sealBatch(A, true);
    expect(record.deviceOnly).toBe(true);
    expect((await backUp(A)).out.ok).toBe(true);
    await settle(150);
    // From here on every request to the registry is kept, and an unexpected route is refused.
    const { seen, denied } = lieEverywhere(reg, 'purged', record);
    const { calls, chain } = standInChain();

    const claims = await A.run(async () => {
      const { proveNumber } = await import('./prove-number');
      const now = () => A.m.records.getRecord(record.id)!;
      // At most 150 plants: the limit is published, the number (120) is not.
      const range = await proveNumber(now(), 0, 'at-most', 150n, { calls: chain, optedIn: true });
      // "Exactly" without the second confirmation: refused before anything is called.
      await expect(proveNumber(now(), 2, 'exactly', 0n, { calls: chain, optedIn: true })).rejects.toThrow(
        /needs your confirmation/,
      );
      await expect(
        proveNumber(now(), 2, 'exactly', 0n, { calls: chain, optedIn: true, confirmedExact: false }),
      ).rejects.toThrow(/Nothing was sent/);
      expect(calls).toHaveLength(1);
      const exact = await proveNumber(now(), 2, 'exactly', 0n, { calls: chain, optedIn: true, confirmedExact: true });
      await settle(200);
      await A.m.records.hydrate();
      await settle(200);
      return { range, exact, kept: now().claims ?? [] };
    });

    // What the chain call was given, and so what is published: the record's commitment, the
    // form's id, the slot, and the limit with its direction, or (exactly) the slot alone, whose
    // value the circuit publishes.
    expect(calls).toEqual([
      {
        circuit: 'proveRange',
        commitment: claims.range.record,
        schemaId: KIND_SCHEMA_ID['grow-batch'],
        slot: 0,
        direction: 'at-most',
        bound: 150n,
      },
      { circuit: 'proveValue', commitment: claims.range.record, schemaId: KIND_SCHEMA_ID['grow-batch'], slot: 2 },
    ]);
    expect(claims.range).toMatchObject({
      kind: 'range',
      op: 'at-most',
      bound: '150',
      slot: 0,
      schema: KIND_SCHEMA['grow-batch'],
    });
    expect(claims.exact).toMatchObject({ kind: 'value', value: '1250', slot: 2 });
    expect(claims.kept.map((c) => c.txId)).toEqual([claims.range.txId, claims.exact.txId]);

    // The registry: no request carries anything typed, the numbers' secret, the claim, its
    // commitment or its transaction; nothing but a read was sent after the claims; no
    // unexpected route was called.
    const held = await A.run(() => A.m.records.getRecord(record.id)!.fieldSet!);
    const secrets = [
      ...MARKERS,
      held.fieldSecret,
      claims.range.record,
      claims.range.txId,
      claims.exact.txId,
      KIND_SCHEMA_ID['grow-batch'],
      record.fieldSetRoot as string,
      'fieldSet',
      'claims',
      'deviceOnly',
    ];
    expect(seen.length).toBeGreaterThan(0);
    for (const r of seen)
      for (const s of secrets) expect(`${r.path}\n${r.body}`, `${r.method} ${r.path}`).not.toContain(s);
    expect(seen.filter((r) => r.method !== 'GET' && r.path !== '/api/records/dating')).toEqual([]);
    expect(denied).toEqual([]);
    expect(nothingLeft(reg, record)).toEqual([]);
    for (const r of reg.sent)
      for (const s of secrets.slice(MARKERS.length)) expect(`${r.url}\n${r.body}`).not.toContain(s);

    // The claims are in this device's own store, and in the next backup.
    const B = await browser('claims-reload', {}, 'claims');
    await B.run(async () => {
      await B.m.records.hydrate();
      await settle(150);
      const shown = B.m.records.getRecord(record.id)!;
      expect(shown.deviceOnly).toBe(true);
      expect((shown.claims ?? []).map((c) => c.txId)).toEqual([claims.range.txId, claims.exact.txId]);
    });
  });

  it('the call itself refuses a device-only record unless its holder turned proving on', async () => {
    // Review of 16 Nov: only "exactly" was checked in the call; the choice itself was the page's alone.
    const A = await browser('gate');
    const record = await sealBatch(A, true);
    const { calls, chain } = standInChain();
    await A.run(async () => {
      const { proveNumber } = await import('./prove-number');
      const now = A.m.records.getRecord(record.id)!;
      await expect(proveNumber(now, 0, 'at-most', 150n, { calls: chain })).rejects.toThrow(
        /turned on|Nothing was sent/,
      );
      await expect(proveNumber(now, 0, 'at-most', 150n, { calls: chain, optedIn: false })).rejects.toThrow(
        /Nothing was sent/,
      );
      await expect(
        proveNumber(now, 0, 'at-most', 150n, { calls: chain, optedIn: true, enabled: false }),
      ).rejects.toThrow(/Nothing was sent/);
    });
    expect(calls).toEqual([]);
  });

  it('an ordinary document proves exactly as before: no second confirmation', async () => {
    const A = await browser('ordinary');
    const record = await sealBatch(A, false);
    expect(record.deviceOnly).toBeUndefined();
    const { calls, chain } = standInChain();
    const claim = await A.run(async () => {
      const { proveNumber } = await import('./prove-number');
      return proveNumber(A.m.records.getRecord(record.id)!, 0, 'exactly', 0n, { calls: chain });
    });
    expect(calls.map((c) => c.circuit)).toEqual(['proveValue']);
    expect(claim).toMatchObject({ kind: 'value', value: '120', slot: 0, keyBinding: record.keyBinding });
  });
});

describe('claim links', () => {
  // A transaction named by its hash, as every link names it (tx-hash-rule.ts).
  const base = { contract: 'c1'.repeat(32), txId: 'be'.repeat(32), record: 'ab'.repeat(32), slot: 0 } as const;
  it('a link made before, for the potency form, still reads exactly', () => {
    const potency: MadeClaim = {
      ...base,
      kind: 'range',
      schema: 'veilcore/schema/potency/v1',
      op: 'at-most',
      bound: '300',
    };
    const link = claimLink(potency, 'https://test.veilcore.org');
    expect(readClaimLink(link.slice(link.indexOf('#')))).toEqual(potency);
  });
  it('a link for a grow batch or a harvest lot reads on this build; one for a form it doesn’t know is refused', () => {
    for (const schema of Object.values(KIND_SCHEMA)) {
      const c: MadeClaim = { ...base, kind: 'value', schema, value: '120' };
      const link = claimLink(c, 'https://test.veilcore.org');
      expect(readClaimLink(link.slice(link.indexOf('#')))).toEqual(c);
    }
    const unknown = claimLink(
      { ...base, kind: 'value', schema: 'veilcore/schema/not-published/v1', value: '1' },
      'https://x',
    );
    expect(readClaimLink(unknown.slice(unknown.indexOf('#')))).toBeUndefined();
  });
});
