// For tests: VeilCore's registry as far as the sealed-records tests need it, in memory, with
// the rules of the real one that matter to them (CONTRACT.md):
//   - rows are kept per holder key; a PUT is refused for a plain-text row, and for a row
//     sealed with another vault key than the holder's rows already use;
//   - an id another holder owns is not written (notWritten);
//   - a claim leaves only a stub for the claimant and returns the sealed offer byte for byte;
//     a second claim is refused; GET /transfers/:id/offer answers only the claimant;
//   - `toHandle` must be a tag (64 lowercase hex);
//   - every request is kept, so a test can look for anything that shouldn't be in one.
// A test can make it misbehave: answer a GET with 429, list grants nobody made, send an
// older copy of a row, drop the sealed offer from a claim, refuse a row by id, or lose the
// answer to a request it carried out (`fault`).
//
// Round 3 adds what the third attack review's proofs used from the real registry: agreements
// saved before sealing (putLegacyLicense), the purge's emptied rows (purge), a delivery made
// before offers were sealed (an offer with no sealedOffer: the claim answers offerPlain while
// its source is plain text, and GET /transfers/:id/offer answers 409 once the source is sealed).
// SPDX-License-Identifier: Apache-2.0

export type Row = Record<string, unknown> & { id: string };
type Grant = { show: string[]; forFingerprint: string | null; values: unknown };
type Transfer = {
  id: string;
  from: string;
  body: Record<string, unknown>;
  claimCode: string;
  claimedBy?: string;
  createdAt: number;
};

export type Sent = { method: string; url: string; headers: string; body: string };

const json = (v: unknown, status = 200, headers: Record<string, string> = {}) =>
  Promise.resolve(
    new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json', ...headers } }),
  );

export const fakeRegistry = () => {
  const records = new Map<string, Row & { holder: string }>();
  const licenses = new Map<string, Row & { holder: string }>();
  const grants = new Map<string, Grant & { holder: string }>();
  const transfers = new Map<string, Transfer>();
  const sent: Sent[] = [];
  const graph = new Map<string, string[]>();
  const misbehave = {
    /** Answer this many whole-set GETs of /api/records with 429. */
    refuseGets: 0,
    /** Grants to list that nobody made, by holder key. */
    inventedGrants: [] as { holder: string; recordId: string; show: string[] }[],
    /** Leave the sealed offer out of claims (and of GET /transfers/:id/offer), and send this instead. */
    offerPlainInstead: null as Record<string, unknown> | null,
    /** Extra fields put on every /transfers/sent row. */
    sentExtra: {} as Record<string, unknown>,
    /** Answer this many whole-set GETs of /api/licenses with 429. */
    refuseLicenseGets: 0,
    /** Ids a PUT rejects (as the real registry rejects a row it won't take). */
    rejectIds: new Set<string>(),
    /**
     * Called before each request is carried out. Returning 'lose' carries it out and then
     * throws, as a connection lost before the answer arrives does; 'fail' throws without
     * carrying it out; a Response is answered instead.
     */
    fault: null as ((method: string, path: string, body: string) => 'lose' | 'fail' | Response | undefined) | null,
  };
  let n = 0;

  const table = (path: string) => (path.startsWith('/api/licenses') ? licenses : records);
  /** What a pre-sealing claim passed on from a plain-text source. */
  const plainOffer = (src: Row, body: Record<string, unknown>) => ({
    strainName: src.strainName,
    bredBy: src.bredBy,
    dateCreated: src.dateCreated,
    ...(src.profile ? { profile: src.profile } : {}),
    ...(typeof body.quantity === 'string' ? { quantity: body.quantity } : {}),
    ...(typeof body.note === 'string' ? { note: body.note } : {}),
  });
  const strip = (r: Row & { holder: string }): Row => {
    const { holder: _h, ...rest } = r;
    void _h;
    return rest;
  };
  const kidOf = (holder: string): string | null => {
    for (const t of [records, licenses])
      for (const r of t.values()) {
        const s = r.sealed as { kid?: string } | undefined;
        if (r.holder === holder && s?.kid) return s.kid;
      }
    return null;
  };

  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = typeof init?.body === 'string' ? init.body : '';
    const f = misbehave.fault?.(method, new URL(url).pathname, body);
    if (f === 'fail') throw new TypeError('fetch failed');
    if (f instanceof Response) return f;
    const res = await carry(url, method, body, init);
    if (f === 'lose') throw new TypeError('fetch failed');
    return res;
  };

  const carry = (url: string, method: string, body: string, init?: RequestInit): Promise<Response> => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    sent.push({ method, url, headers: JSON.stringify(headers), body });
    const holder = headers['x-holder-key'] ?? '';
    const path = new URL(url).pathname;

    if (path === '/api/records' || path === '/api/licenses') {
      const t = table(path);
      if (method === 'PUT') {
        const kid = kidOf(holder);
        const rejected: { id: string; reason: string }[] = [];
        const notWritten: string[] = [];
        const items = JSON.parse(body) as Row[];
        const theirKid = items.map((r) => (r.sealed as { kid?: string } | undefined)?.kid).find(Boolean);
        for (const r of items) {
          const s = r.sealed as { kid?: string } | undefined;
          if (misbehave.rejectIds.has(r.id)) rejected.push({ id: r.id, reason: 'refused for this test' });
          else if (!s) rejected.push({ id: r.id, reason: 'new rows must be sealed' });
          else if ((kid ?? theirKid) !== s.kid)
            rejected.push({ id: r.id, reason: "sealed with a different vault key than this holder's other records" });
          else if (t.has(r.id) && t.get(r.id)!.holder !== holder) notWritten.push(r.id);
          else {
            // The registry keeps what it wrote itself (CONTRACT.md #16).
            const kept = t.get(r.id);
            const { attestation: _a, ...clientRow } = r;
            void _a;
            t.set(r.id, {
              ...clientRow,
              ...(kept?.attestation ? { attestation: kept.attestation } : {}),
              ...(kept?.receivedFrom ? { receivedFrom: kept.receivedFrom } : {}),
              holder,
            });
          }
        }
        return json({ ok: rejected.length === 0, rejected, notWritten });
      }
      if (method === 'DELETE') {
        const ids = (JSON.parse(body) as { ids: string[] }).ids;
        const removed = ids.filter((id) => t.get(id)?.holder === holder && t.delete(id));
        return json({ ok: true, removed });
      }
      if (path === '/api/records' && misbehave.refuseGets > 0) {
        misbehave.refuseGets--;
        return json({ error: 'whole-set reads are limited' }, 429);
      }
      if (path === '/api/licenses' && misbehave.refuseLicenseGets > 0) {
        misbehave.refuseLicenseGets--;
        return json({ error: 'whole-set reads are limited' }, 429);
      }
      return json([...t.values()].filter((r) => r.holder === holder).map(strip));
    }

    const grant = /^\/api\/records\/([^/]+)\/disclosure$/.exec(path);
    if (grant && method === 'PUT') {
      const g = JSON.parse(body) as Grant;
      grants.set(decodeURIComponent(grant[1]), { ...g, holder });
      return json({ recordId: grant[1], show: g.show, updatedAt: '2026-10-16T00:00:00.000Z' });
    }
    if (grant && method === 'GET') {
      const g = grants.get(decodeURIComponent(grant[1]));
      return json({
        recordId: grant[1],
        show: g?.show ?? [],
        forFingerprint: g?.forFingerprint ?? null,
        values: g?.values ?? null,
      });
    }
    if (path === '/api/disclosures') {
      return json([
        ...[...grants]
          .filter(([, g]) => g.holder === holder)
          .map(([recordId, g]) => ({ recordId, show: g.show, forFingerprint: g.forFingerprint, values: g.values })),
        ...misbehave.inventedGrants
          .filter((g) => g.holder === holder)
          .map((g) => ({ recordId: g.recordId, show: g.show, forFingerprint: null, values: null })),
      ]);
    }

    if (path === '/transfers' && method === 'POST') {
      const b = JSON.parse(body) as Record<string, unknown>;
      if (typeof b.toHandle !== 'string' || !/^[0-9a-f]{64}$/.test(b.toHandle))
        return json({ error: 'toHandle is a tag, not a name' }, 400);
      const src = records.get(String(b.sourceRecord));
      if (!src || src.holder !== holder) return json({ error: 'no such record under this holder key' }, 404);
      if (src.sealed && !b.sealedOffer)
        return json({ error: "a sealed record is offered with sealedOffer: the offer's details" }, 400);
      const id = `TR-${(++n).toString(16).toUpperCase().padStart(8, '0')}`;
      const claimCode = `${'c'.repeat(31)}${n % 10}`;
      transfers.set(id, { id, from: holder, body: b, claimCode, createdAt: Date.now() });
      return json({ transferId: id, sourceRecord: src.id, claimCode });
    }
    const claim = /^\/transfers\/([^/]+)\/claim$/.exec(path);
    if (claim && method === 'POST') {
      const t = transfers.get(claim[1]);
      if (!t) return json({ error: 'no such transfer' }, 404);
      if (t.claimedBy) return json({ error: 'this transfer has already been claimed' }, 409);
      const src = records.get(String(t.body.sourceRecord))!;
      // A delivery made before offers were sealed: the registry passes on the source's fields
      // while it can read them, and can't once the source is sealed (CONTRACT.md #8).
      if (!t.body.sealedOffer && src.sealed) return json({ error: 'ask the sender for a new code' }, 409);
      t.claimedBy = holder;
      const stubId = `VEIL-R${claim[1].slice(3)}`;
      records.set(stubId, {
        id: stubId,
        strainName: src.strainName,
        ...(src.profile ? { profile: src.profile } : {}),
        receivedFrom: src.id,
        receivedFromCommitment: src.recordFingerprint,
        receivedAt: Date.UTC(2026, 9, 16),
        transferId: claim[1],
        holder,
      });
      src.attestation = { type: 'receipt-confirmed', transferId: claim[1], attestedAt: Date.UTC(2026, 9, 16) };
      return json({
        recordId: stubId,
        descendedFrom: src.id,
        parentCommitment: src.recordFingerprint,
        ...(misbehave.offerPlainInstead
          ? { offerPlain: misbehave.offerPlainInstead }
          : t.body.sealedOffer
            ? { offerSealed: t.body.sealedOffer }
            : { offerPlain: plainOffer(src, t.body) }),
        ...(!t.body.sealedOffer && typeof t.body.note === 'string' ? { note: t.body.note } : {}),
      });
    }
    const offer = /^\/transfers\/([^/]+)\/offer$/.exec(path);
    if (offer && method === 'GET') {
      const t = transfers.get(offer[1]);
      if (!t || t.claimedBy !== holder) return json({ error: 'no such delivery' }, 404);
      const src = records.get(String(t.body.sourceRecord));
      if (!t.body.sealedOffer && !misbehave.offerPlainInstead) {
        if (!src || src.sealed) return json({ error: 'ask the sender for a new code' }, 409);
        return json({ transferId: t.id, offerPlain: plainOffer(src, t.body) });
      }
      return json({
        transferId: t.id,
        ...(misbehave.offerPlainInstead
          ? { offerPlain: misbehave.offerPlainInstead }
          : { offerSealed: t.body.sealedOffer }),
      });
    }
    if (path === '/transfers/sent') {
      return json({
        transfers: [...transfers.values()]
          .filter((t) => t.from === holder)
          .map((t) => ({
            id: t.id,
            source_record: t.body.sourceRecord,
            to_handle: t.body.toHandle,
            created_at: t.createdAt,
            ...(t.claimedBy ? { claimed_at: Date.UTC(2026, 9, 16) } : {}),
            ...misbehave.sentExtra,
          })),
      });
    }
    const anc = /^\/lineage\/ancestors\/([^/]+)$/.exec(path);
    if (anc) return json({ ancestors: graph.get(decodeURIComponent(anc[1])) ?? [] });
    if (path === '/lineage/verify' && method === 'POST') return json({ ok: true, generationsChecked: 1 });
    return json({ error: `no route ${method} ${path}` }, 404);
  };

  return {
    fetch,
    records,
    licenses,
    grants,
    transfers,
    sent,
    graph,
    misbehave,
    /** A holder's stored record rows, as the registry holds them. */
    rowsOf: (holder: string): Row[] => [...records.values()].filter((r) => r.holder === holder).map(strip),
    /** Put a row in as an older registry stored it (plain text, before sealing). */
    putLegacy: (holder: string, row: Row) => void records.set(row.id, { ...row, holder }),
    putGrant: (holder: string, recordId: string, show: string[]) =>
      void grants.set(recordId, { show, forFingerprint: null, values: null, holder }),
    /** An agreement as an older registry stored it (plain text). */
    putLegacyLicense: (holder: string, row: Row) => void licenses.set(row.id, { ...row, holder }),
    /** A delivery made before offers were sealed, as the old site made it. */
    putLegacyTransfer: (holder: string, sourceRecord: string, extra: Record<string, unknown> = {}) => {
      const id = `TR-${(++n).toString(16).toUpperCase().padStart(8, '0')}`;
      const claimCode = `${'d'.repeat(31)}${n % 10}`;
      transfers.set(id, { id, from: holder, body: { sourceRecord, ...extra }, claimCode, createdAt: Date.now() });
      return { transferId: id, claimCode };
    },
    /**
     * The purge's two-flag run (scripts/purge-plaintext.mjs): every plain row of this holder
     * keeps only its public fields and `contentsRemoved`; agreements keep only their id.
     */
    purge: (holder: string) => {
      for (const [id, r] of records)
        if (r.holder === holder && !r.sealed)
          records.set(id, {
            id,
            strainName: r.strainName,
            ...(r.recordFingerprint ? { recordFingerprint: r.recordFingerprint } : {}),
            contentsRemoved: true,
            holder,
          });
      for (const [id, r] of licenses)
        if (r.holder === holder && !r.sealed) licenses.set(id, { id, contentsRemoved: true, holder });
    },
  };
};

export type FakeRegistry = ReturnType<typeof fakeRegistry>;
