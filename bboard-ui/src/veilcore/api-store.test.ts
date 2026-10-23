// Sealed records at the one choke point (api-store.ts, CONTRACT.md): against a stand-in
// registry that stores what it is sent, as the real one does.
//
//   - nothing private reaches the registry: every request body, URL and header made while
//     saving, pairing, granting, offering, claiming and making a licence is captured, and
//     no private value appears in any of them (only the record's public name may);
//   - what is saved sealed loads back whole; an unchanged row is re-sent as the same bytes;
//   - a record that doesn't match its fingerprint is found, and never sent;
//   - a row sealed with another key is locked: listed, never sent back, can be deleted;
//   - rows saved in plain text before sealing are saved again sealed, and a backup is due;
//   - with sealed rows and no key here, no key is made and nothing is saved;
//   - a whole-set read the registry cut short is finished by paging, or said;
//   - grants carry their values and are sent again when their record changes.
import { createCipheriv, randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubWebLocks } from './fixtures/web-locks';

const local = new Map<string, string>();
type Row = Record<string, unknown> & { id: string };
type Grant = { show: string[]; forFingerprint: string | null; values: unknown };
let rows: Map<string, Row>;
let licenses: Map<string, Row>;
let grants: Map<string, Grant>;
let transfers: Map<string, Record<string, unknown>>;
let sent: { method: string; url: string; headers: string; body: string }[];
let truncate: number | null;
let failPaging: boolean;
let listValues: boolean;

const json = (v: unknown, status = 200, headers: Record<string, string> = {}) =>
  Promise.resolve(
    new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json', ...headers } }),
  );

/** The registry, as far as these tests need it. */
const registry = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? 'GET').toUpperCase();
  const body = typeof init?.body === 'string' ? init.body : '';
  sent.push({ method, url, headers: JSON.stringify(init?.headers ?? {}), body });
  const path = new URL(url).pathname;
  const q = new URL(url).searchParams;
  const table = path === '/api/licenses' ? licenses : rows;
  if (path === '/api/records' || path === '/api/licenses') {
    if (method === 'PUT') {
      for (const r of JSON.parse(body) as Row[]) table.set(r.id, r);
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      const ids = (JSON.parse(body) as { ids: string[] }).ids;
      const removed = ids.filter((id) => table.delete(id));
      return json({ ok: true, removed });
    }
    const all = [...table.values()];
    if (q.has('limit')) {
      if (failPaging) return json({ error: 'down' }, 503);
      const sorted = all.sort((a, b) => a.id.localeCompare(b.id));
      const after = q.get('cursor') ?? '';
      const page = sorted.filter((r) => r.id > after).slice(0, 2);
      const more = sorted.filter((r) => r.id > after).length > 2;
      return json({
        [path.slice(5)]: page,
        nextCursor: more ? page[page.length - 1].id : null,
        limit: 2,
      });
    }
    if (truncate !== null && all.length > truncate) {
      return json(all.slice(0, truncate), 200, { 'X-VeilCore-Truncated': 'true' });
    }
    return json(all);
  }
  const grant = /^\/api\/records\/([^/]+)\/disclosure$/.exec(path);
  if (grant && method === 'PUT') {
    const g = JSON.parse(body) as Grant;
    grants.set(decodeURIComponent(grant[1]), g);
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
    // As the registry lists them (with `values`), or as one that doesn't list values.
    return json(
      [...grants].map(([recordId, g]) => ({
        recordId,
        show: g.show,
        forFingerprint: g.forFingerprint,
        ...(listValues ? { values: g.values } : {}),
      })),
    );
  }
  if (path === '/transfers' && method === 'POST') {
    const b = JSON.parse(body) as Record<string, unknown>;
    transfers.set('TR-0A1B2C3D', b);
    return json({ transferId: 'TR-0A1B2C3D', claimCode: 'ab'.repeat(16) });
  }
  const claim = /^\/transfers\/([^/]+)\/claim$/.exec(path);
  if (claim && method === 'POST') {
    const t = transfers.get(claim[1])!;
    const src = rows.get(t.sourceRecord as string)!;
    // CONTRACT.md #8: only a stub for the recipient, and the offer byte-identical.
    const stub: Row = {
      id: 'VEIL-RECEIVED',
      strainName: src.strainName,
      ...(src.profile ? { profile: src.profile } : {}),
      receivedFrom: src.id,
      receivedFromCommitment: src.recordFingerprint,
      receivedAt: Date.UTC(2026, 9, 16),
      transferId: claim[1],
    };
    rows.set(stub.id, stub);
    return json({
      recordId: stub.id,
      descendedFrom: src.id,
      parentCommitment: src.recordFingerprint,
      ...(t.sealedOffer ? { offerSealed: t.sealedOffer } : {}),
    });
  }
  return json({ error: `no route ${method} ${path}` }, 404);
};

beforeEach(() => {
  vi.resetModules();
  local.clear();
  rows = new Map();
  licenses = new Map();
  grants = new Map();
  transfers = new Map();
  sent = [];
  truncate = null;
  failPaging = false;
  listValues = true;
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  vi.stubGlobal('fetch', registry);
  stubWebLocks();
});

/**
 * Until the app has gone quiet: no new request to the registry for three windows in a row.
 * A fixed 30 ms was overrun when the machine was busy (sealing runs between a change and its
 * save), and these tests failed under a full parallel run while passing alone.
 */
const settle = async (): Promise<void> => {
  let last = -1;
  let quiet = 0;
  const until = Date.now() + 5000;
  while (quiet < 3 && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 40));
    if (sent.length === last) quiet++;
    else {
      quiet = 0;
      last = sent.length;
    }
  }
};

/** Private values, each one findable in a request if it leaked. */
const S = {
  bredBy: 'SENTINEL-bred-by-Hollis',
  notes: 'SENTINEL-notes-do-not-send',
  parent: 'SENTINEL-parent-Grandaddy',
  method: 'SENTINEL-method-backcross',
  refId: 'SENTINEL-ref-LOT-7781',
  taxon: 'SENTINEL-taxon-Cannabis',
  dateCreated: '2011-11-11',
  dnaFile: 'SENTINEL-dna-report.pdf',
  dnaFp: 'd7a1'.repeat(16),
  licensee: 'SENTINEL-licensee-Acme',
  territory: 'SENTINEL-territory',
  quantity: 'SENTINEL-quantity-12-clones',
  note: 'SENTINEL-offer-note',
};
const PUBLIC_NAME = 'Public Name OK';

/**
 * A page load. Since round 3 (L1) nothing is sealed and sent under a key that isn't in a
 * checked backup: unless `noKey`, a browser without one makes a key and checks its backup
 * first, as the app has a holder do before anything is saved.
 */
const modules = async (opts: { noKey?: boolean } = {}) => {
  const records = await import('./records');
  const vault = await import('./vault');
  const api = await import('./api-store');
  const { fingerprintRecord, newNonce } = await import('./commitment');
  if (!opts.noKey && !vault.vaultKeyIfAny()) {
    vault.mintVault();
    vault.markVaultBackedUp();
  }
  return { records, vault, api, fingerprintRecord, newNonce };
};

const plantInput = async (over: Record<string, unknown> = {}) => {
  const { fingerprintRecord, newNonce } = await import('./commitment');
  const fields = {
    nonce: newNonce(),
    strainName: PUBLIC_NAME,
    bredBy: S.bredBy,
    dateCreated: S.dateCreated,
    notes: S.notes,
    loggedAt: Date.UTC(2026, 9, 1),
    parents: [{ name: S.parent }],
    breedingMethod: S.method,
    refId: S.refId,
    taxon: S.taxon,
    ...over,
  };
  return { ...fields, recordFingerprint: await fingerprintRecord(fields) };
};

/** Every form a secret could take in a request. */
const forms = (b64url: string): string[] => {
  const bytes = Buffer.from(b64url, 'base64url');
  return [b64url, bytes.toString('base64'), bytes.toString('hex')];
};

describe('nothing private reaches the registry', () => {
  it('through save, pairing, grant, licence, offer and claim: nothing typed is sent, the name included (round 5)', async () => {
    const { records, vault } = await modules();
    const { saveGrant, disclosureFrom } = await import('./disclosure');
    const licensesMod = await import('./licenses');
    const transfersMod = await import('./transfers');

    const rec = records.createRecord(await plantInput());
    await settle();
    records.pairDna(rec.id, S.dnaFp, S.dnaFile);
    await settle();
    const now = records.getRecord(rec.id)!;
    // Granting only what is not private: the record exists, and when it was sealed.
    const g = await saveGrant(now, disclosureFrom(['existence', 'sealed-at']));
    expect('error' in g).toBe(false);
    licensesMod.createLicense({
      type: 'license',
      recordId: rec.id,
      recordFingerprint: rec.recordFingerprint,
      agreementFingerprint: 'ag'.repeat(32),
      terms: {
        licensee: S.licensee,
        startDate: '2026-10-01',
        endDate: '2027-10-01',
        extraTerms: S.notes,
        rights: 'cultivate',
        territory: S.territory,
        royaltyType: 'percent',
        royaltyAmount: '5',
        unitBasis: 'per-plant',
        sublicensable: false,
        exclusive: false,
      },
    });
    await settle();
    const offer = await transfersMod.offerTransfer(now, 'lab', { quantity: S.quantity, note: S.note });
    if ('error' in offer) throw new Error(offer.error);
    const code = transfersMod.shareCodeFor(offer.transferId, offer.claimCode, undefined, offer.offerKey);
    const parsed = transfersMod.parseShareCode(code);
    const claim = await transfersMod.claimTransfer(parsed.transferId, parsed.claimCode);
    if ('error' in claim) throw new Error(claim.error);
    await records.hydrate();
    const opened = await transfersMod.openClaimOffer(claim, parsed.offerKey, undefined);
    expect(typeof opened).toBe('object');
    const fields = records.offerFieldsOf(typeof opened === 'object' ? opened.fields : {});
    const received = await records.sealReceived(claim.recordId, { deliveryNote: fields.note }, fields);
    await settle();

    // The received record was built here from the offer: the sender's details, sealed.
    expect(received).toMatchObject({ bredBy: S.bredBy, dateCreated: S.dateCreated, quantity: S.quantity });
    expect(received?.deliveryNote).toBe(S.note);
    expect(await records.checkIntegrity(received!)).toBe('match');

    const vaultKey = vault.vaultKeyIfAny()!;
    expect(vaultKey).toBeTruthy();
    // The name is sealed too since round 5 (CONTRACT.md #28): it is never on the wire.
    const secrets = [...Object.values(S), PUBLIC_NAME, ...forms(vaultKey), ...forms(offer.offerKey)];
    expect(sent.length).toBeGreaterThan(5);
    for (const req of sent) {
      const all = `${req.url}\n${req.headers}\n${req.body}`;
      for (const s of secrets) expect(all.includes(s), `${s} in ${req.method} ${req.url}`).toBe(false);
    }
    // Every stored record and licence row is sealed, with only the public fields beside it.
    const allowed = new Set([
      'id',
      'profile',
      'recordFingerprint',
      'keyBinding',
      'supersedes',
      'supersededBy',
      'receivedFrom',
      'receivedFromCommitment',
      'receivedAt',
      'transferId',
      'attestation',
      // The name's salted code (round 6, CONTRACT.md #33): nothing about the name without the salt.
      'nameCode',
      // The row's revision (round 3, L2): the same number as inside the box.
      'rev',
      'sealed',
    ]);
    for (const r of rows.values()) {
      expect(r.sealed, r.id).toBeTruthy();
      for (const k of Object.keys(r)) expect(allowed.has(k), `${r.id}.${k}`).toBe(true);
    }
    for (const l of licenses.values()) expect(Object.keys(l).sort()).toEqual(['id', 'rev', 'sealed']); // rev: round 4, F1
    // The POST /transfers body carries the sealed offer, not its contents or key.
    const post = sent.find((r) => r.method === 'POST' && r.url.endsWith('/transfers'));
    expect(Object.keys(JSON.parse(post!.body) as object).sort()).toEqual(['sealedOffer', 'sourceRecord', 'toHandle']);
  });
});

describe('sealed rows load back', () => {
  it('whole, with the fingerprint checked here; an unchanged set is re-sent as the same bytes', async () => {
    const { records, api } = await modules();
    const rec = records.createRecord(await plantInput());
    await settle();
    const stored = structuredClone(rows.get(rec.id)!);

    vi.resetModules(); // a new tab: same browser storage, same registry
    const again = await modules();
    await again.records.hydrate();
    const back = again.records.getRecord(rec.id)!;
    expect(back).toMatchObject({ bredBy: S.bredBy, notes: S.notes, parents: [{ name: S.parent }], taxon: S.taxon });
    expect(again.records.integrityOf(rec.id)).toBe('match');
    expect(again.api.rowStateOf('veilcore.records.v1', rec.id)).toBe('open');
    void api;

    // Saving again with nothing changed sends the very bytes the registry holds.
    again.records.createRecord(await plantInput({ strainName: 'Another' }));
    await settle();
    expect(rows.get(rec.id)).toEqual(stored);
  });

  it('a licence comes back whole', async () => {
    const { records } = await modules();
    records.createRecord(await plantInput());
    await settle();
    const lic = await import('./licenses');
    lic.createLicense({
      type: 'license',
      recordId: 'VEIL-X',
      recordFingerprint: 'f'.repeat(64),
      agreementFingerprint: 'a'.repeat(64),
      terms: { licensee: S.licensee } as never,
    });
    await settle();
    vi.resetModules();
    const lic2 = await import('./licenses');
    lic2.startLicenseSync();
    await settle();
    expect(lic2.allLicenses()[0]).toMatchObject({ recordId: 'VEIL-X', terms: { licensee: S.licensee } });
  });
});

describe('a record that does not match its fingerprint', () => {
  it('is found when it is loaded and never sent again', async () => {
    const { records } = await modules();
    const rec = records.createRecord(await plantInput());
    await settle();
    // The registry changes the public fingerprint: the sealed fields no longer give it. (A
    // name it puts beside the box is ignored since round 5: the box has the name.)
    rows.set(rec.id, { ...rows.get(rec.id)!, recordFingerprint: 'e'.repeat(64), strainName: 'Renamed by someone' });
    const tampered = structuredClone(rows.get(rec.id)!);

    vi.resetModules();
    const again = await modules();
    await again.records.hydrate();
    expect(again.records.integrityOf(rec.id)).toBe('mismatch');
    sent = [];
    again.records.createRecord(await plantInput({ strainName: 'New one' }));
    await settle();
    const put = sent.find((r) => r.method === 'PUT' && r.url.endsWith('/api/records'));
    const ids = (JSON.parse(put!.body) as Row[]).map((r) => r.id);
    expect(ids).not.toContain(rec.id);
    expect(rows.get(rec.id)).toEqual(tampered);
    // Nor is a correction made from it.
    await expect(again.records.issueCorrection(rec.id, { notes: 'x' }, 'fix')).rejects.toThrow(/proof code/);
  });

  it('is refused, said and not sent when it is made that way here', async () => {
    const { records } = await modules();
    const { useSaveProblem } = await import('./save-status');
    void useSaveProblem;
    const input = { ...(await plantInput()), recordFingerprint: 'e'.repeat(64) };
    const result = await records.createRecordSaved(input);
    expect(result.result.ok).toBe(false);
    expect(result.result.refused[0]).toMatchObject({ id: result.record.id, words: 'app.sealed.refuse.mismatch' });
    expect(rows.has(result.record.id)).toBe(false);
  });
});

/** A row sealed with a key this browser doesn't have. */
const foreignRow = (id: string, name: string, receivedAt?: number): Row => {
  const key = randomBytes(32);
  const kid = 'f00dfacecafe0001';
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(`veilcore:sealed:v1\0records\0${id}\0${kid}`));
  const ct = Buffer.concat([c.update(JSON.stringify({ bredBy: 'x' })), c.final(), c.getAuthTag()]);
  return {
    id,
    strainName: name,
    ...(receivedAt ? { receivedAt } : {}),
    sealed: { v: 1, alg: 'A256GCM', kid, iv: iv.toString('base64url'), ct: ct.toString('base64url') },
  };
};

describe('locked rows', () => {
  it('are listed by name, never sent back by a save, and can be deleted', async () => {
    const { records } = await modules();
    records.createRecord(await plantInput());
    await settle();
    rows.set('VEIL-LOCKED', foreignRow('VEIL-LOCKED', 'Old plant', Date.UTC(2026, 9, 2)));
    const lockedBefore = structuredClone(rows.get('VEIL-LOCKED'));
    // Same holder, but this browser's key is a different one from the locked row's.
    await records.hydrate();
    // No date: this browser didn't make the key that locked it, and a received date says
    // nothing about the key (review L8).
    expect(records.lockedRecords()).toEqual([{ id: 'VEIL-LOCKED', strainName: 'Old plant', kid: 'f00dfacecafe0001' }]);
    expect(records.getRecord('VEIL-LOCKED')).toBeUndefined();
    sent = [];
    records.createRecord(await plantInput({ strainName: 'Next' }));
    await settle();
    for (const r of sent.filter((x) => x.method === 'PUT')) expect(r.body.includes('VEIL-LOCKED')).toBe(false);
    expect(rows.get('VEIL-LOCKED')).toEqual(lockedBefore);

    expect(await records.deleteLockedRecord('VEIL-LOCKED')).toEqual({ ok: true });
    expect(rows.has('VEIL-LOCKED')).toBe(false);
    expect(records.lockedRecords()).toEqual([]);
    // Only a locked record goes this way.
    expect('error' in (await records.deleteLockedRecord(records.allRecords()[0].id))).toBe(true);
  });

  it('a locked agreement is listed and shown plainly, never sent back by a save, and can be deleted', async () => {
    const { records } = await modules();
    records.createRecord(await plantInput());
    await settle();
    const lic = await import('./licenses');
    lic.startLicenseSync();
    lic.createLicense({
      type: 'license',
      recordId: 'VEIL-X',
      recordFingerprint: 'f'.repeat(64),
      agreementFingerprint: 'a'.repeat(64),
      terms: { licensee: S.licensee } as never,
    });
    await settle();
    // Sealed under another vault key: only its id and box are on the registry.
    licenses.set('LIC-LOCKED', { id: 'LIC-LOCKED', sealed: foreignRow('LIC-LOCKED', '').sealed });
    const lockedBefore = structuredClone(licenses.get('LIC-LOCKED'));
    vi.resetModules();
    const lic2 = await import('./licenses');
    lic2.startLicenseSync();
    // Waits for the load to land rather than a fixed 30 ms, which a busy machine overran
    // (the test failed under a full parallel run and passed alone).
    await vi.waitFor(() => expect(lic2.lockedLicenses()).toEqual([{ id: 'LIC-LOCKED', kid: 'f00dfacecafe0001' }]), {
      timeout: 5000,
    });
    expect(lic2.allLicenses().map((l) => l.id)).not.toContain('LIC-LOCKED');

    // Shown like a locked record: plainly, with a Delete button and the way back; no edit.
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MemoryRouter } = await import('react-router-dom');
    const { LockedAgreements } = await import('../components/LockedRecords');
    const { LanguageProvider } = await import('../i18n');
    // The language picker reads the page's address and storage: English, no ?lang=.
    vi.stubGlobal('window', { localStorage, location: { search: '' } });
    let html: string;
    try {
      html = renderToStaticMarkup(
        React.createElement(
          LanguageProvider,
          null,
          React.createElement(MemoryRouter, null, React.createElement(LockedAgreements)),
        ),
      );
    } finally {
      vi.stubGlobal('window', undefined);
    }
    expect(html).toContain('1 locked agreement');
    expect(html).toContain('data-locked-agreement="LIC-LOCKED"');
    expect(html).toContain('LIC-LOCKED');
    expect(html).toContain('Delete');
    expect(html).toContain('Restore my backup');
    expect(html).toContain('can’t be changed or sent');
    expect(html).not.toMatch(/Edit|Renew|Revoke/);

    // A save of the open agreements leaves it alone.
    sent = [];
    lic2.createLicense({
      type: 'license',
      recordId: 'VEIL-Y',
      recordFingerprint: 'e'.repeat(64),
      agreementFingerprint: 'b'.repeat(64),
      terms: { licensee: 'Other' } as never,
    });
    await settle();
    const puts = sent.filter((x) => x.method === 'PUT' && x.url.endsWith('/api/licenses'));
    expect(puts.length).toBe(1);
    expect(puts[0].body.includes('LIC-LOCKED')).toBe(false);
    expect(licenses.get('LIC-LOCKED')).toEqual(lockedBefore);

    expect(await lic2.deleteLockedLicense('LIC-LOCKED')).toEqual({ ok: true });
    expect(licenses.has('LIC-LOCKED')).toBe(false);
    expect(sent.some((x) => x.method === 'DELETE' && x.url.endsWith('/api/licenses'))).toBe(true);
    expect(lic2.lockedLicenses()).toEqual([]);
    // Only a locked agreement goes this way.
    expect('error' in (await lic2.deleteLockedLicense(lic2.allLicenses()[0].id))).toBe(true);
  });

  it('with sealed rows and no key here, no key is made and nothing is saved', async () => {
    const { records, vault } = await modules({ noKey: true });
    const holder = await import('./holder');
    holder.holderKey();
    rows.set('VEIL-LOCKED', foreignRow('VEIL-LOCKED', 'Old plant'));
    await records.hydrate();
    sent = [];
    const out = await records.createRecordSaved(await plantInput());
    expect(out.result.ok).toBe(false);
    expect(out.result.refused).toEqual([expect.objectContaining({ id: '*', words: 'app.sealed.refuse.noKey' })]);
    expect(vault.vaultKeyIfAny()).toBeNull();
    // Nothing is saved: no locked copy is sent. Only the record's proof code may be, to be
    // dated (CONTRACT.md #38): no box, no vault key id, nothing typed.
    expect(sent.some((r) => r.method === 'PUT' && !r.url.endsWith('/api/records/dating'))).toBe(false);
    for (const r of sent.filter((x) => x.url.endsWith('/api/records/dating')))
      for (const row of JSON.parse(r.body ?? '[]') as Record<string, unknown>[])
        expect(Object.keys(row).every((k) => ['id', 'recordFingerprint', 'keyBinding'].includes(k))).toBe(true);
  });
});

/** A file a test hands to checkBackup or restoreAny. */
const fileOf = (text: string) =>
  ({ text: () => Promise.resolve(text), size: text.length, name: 'f' }) as unknown as File;

describe('rows saved in plain text before sealing', () => {
  it('wait for a checked backup of a new key, then are saved again sealed (CONTRACT.md #23)', async () => {
    const holder = await import('./holder');
    holder.holderKey();
    const plain = { id: 'VEIL-OLD', ...(await plantInput()), licenseIds: [] };
    rows.set('VEIL-OLD', plain);
    const { records, vault, api } = await modules({ noKey: true });
    expect(vault.vaultKeyIfAny()).toBeNull();
    await records.hydrate();
    await settle();
    // A key is made, so there is something to back up; nothing is sealed with it yet.
    expect(vault.vaultKeyIfAny()).not.toBeNull();
    expect(vault.vaultNeedsBackup()).toBe(true);
    expect(rows.get('VEIL-OLD')).toEqual(plain);
    expect(sent.some((r) => r.method === 'PUT')).toBe(false);
    // The backup is saved and checked: now they are sealed.
    const { backupContents, checkBackup } = await import('./backup');
    expect((await checkBackup(fileOf(JSON.stringify(backupContents())))).ok).toBe(true);
    await settle();
    await settle();
    const stored = rows.get('VEIL-OLD')!;
    expect(stored.sealed).toBeTruthy();
    expect(stored.bredBy).toBeUndefined();
    const put = sent.find((r) => r.method === 'PUT' && r.url.endsWith('/api/records'))!;
    for (const v of Object.values(S)) expect(put.body.includes(v)).toBe(false);
    await records.hydrate();
    expect(api.rowStateOf('veilcore.records.v1', 'VEIL-OLD')).toBe('open');
    expect(records.getRecord('VEIL-OLD')).toMatchObject({ bredBy: S.bredBy, notes: S.notes });
  });
});

describe('agreements saved in plain text before sealing', () => {
  it('are saved again sealed after a checked backup', async () => {
    const holder = await import('./holder');
    holder.holderKey();
    const plainLicence = {
      id: 'LIC-OLD',
      type: 'license',
      recordId: 'VEIL-1',
      recordFingerprint: 'f'.repeat(64),
      agreementFingerprint: 'a'.repeat(64),
      state: 'draft',
      createdAt: 1,
      terms: { licensee: S.licensee },
      royaltyLog: [],
    };
    licenses.set('LIC-OLD', plainLicence);
    const lic = await import('./licenses');
    lic.startLicenseSync();
    await settle();
    await settle();
    expect(licenses.get('LIC-OLD')).toEqual(plainLicence);
    const { backupContents, checkBackup } = await import('./backup');
    expect((await checkBackup(fileOf(JSON.stringify(backupContents())))).ok).toBe(true);
    await settle();
    await settle();
    expect(Object.keys(licenses.get('LIC-OLD')!).sort()).toEqual(['id', 'rev', 'sealed']);
    for (const r of sent) expect(r.body.includes(S.licensee)).toBe(false);
  });
});

describe('a claim’s stub', () => {
  it('is never sent back as it is; sealed without the offer, it keeps only what the registry gave', async () => {
    const holder = await import('./holder');
    holder.holderKey();
    rows.set('VEIL-STUB', {
      id: 'VEIL-STUB',
      strainName: 'Delivered',
      receivedFrom: 'VEIL-SRC',
      receivedFromCommitment: 'ab'.repeat(32),
      receivedAt: Date.UTC(2026, 9, 16),
      transferId: 'TR-0A1B2C3D',
    });
    const { records, api } = await modules();
    await records.hydrate();
    expect(api.rowStateOf('veilcore.records.v1', 'VEIL-STUB')).toBe('stub');
    records.createRecord(await plantInput());
    await settle();
    const put = sent.find((r) => r.method === 'PUT' && r.url.endsWith('/api/records'))!;
    expect((JSON.parse(put.body) as Row[]).map((r) => r.id)).not.toContain('VEIL-STUB');
    const sealed = await records.sealReceived('VEIL-STUB', {}, {});
    await settle();
    expect(sealed).toMatchObject({ strainName: 'Delivered', bredBy: '', loggedAt: Date.UTC(2026, 9, 16) });
    expect(await records.checkIntegrity(sealed!)).toBe('match');
    expect(rows.get('VEIL-STUB')!.sealed).toBeTruthy();
  });
});

describe('a whole-set read the registry cut short', () => {
  it('is finished by paging', async () => {
    const { records } = await modules();
    for (const n of ['A', 'B', 'C', 'D', 'E']) records.createRecord(await plantInput({ strainName: n }));
    // Until the registry holds all five: a fixed wait was overrun on a busy machine.
    await vi.waitFor(() => expect(rows.size).toBe(5), { timeout: 5000 });
    truncate = 2;
    vi.resetModules();
    const again = await modules();
    await again.records.hydrate();
    expect(again.records.allRecords()).toHaveLength(5);
    expect(again.records.useSealedView).toBeTypeOf('function');
    expect(again.api.loadNoticeOf('veilcore.records.v1')).toEqual({ truncated: false, unreadable: 0 });
  });

  it('is said when paging fails, not passed off as the whole set', async () => {
    const { records } = await modules();
    for (const n of ['A', 'B', 'C']) records.createRecord(await plantInput({ strainName: n }));
    await vi.waitFor(() => expect(rows.size).toBe(3), { timeout: 5000 });
    truncate = 1;
    failPaging = true;
    vi.resetModules();
    const again = await modules();
    await again.records.hydrate();
    expect(again.records.allRecords()).toHaveLength(1);
    expect(again.api.loadNoticeOf('veilcore.records.v1').truncated).toBe(true);
  });
});

describe('disclosure grants carry their values', () => {
  it('only the granted keys’ values, never a parent’s record id; an animal’s ID and scheme', async () => {
    const { grantValuesFor } = await import('./disclosure');
    const plant = {
      ...(await plantInput()),
      id: 'VEIL-P',
      parents: [{ name: 'Mother', recordId: 'VEIL-SECRET-LINK' }],
      dnaFingerprint: S.dnaFp,
      dnaFileSha256: 'c'.repeat(64),
      dnaPairSalt: 'b5'.repeat(32),
    };
    expect(grantValuesFor(plant, ['existence', 'descent-clean'])).toEqual({});
    // The DNA report only bound (round 5, CONTRACT.md #29): never its SHA-256 or pairing fingerprint.
    const { dnaPairBinding } = await import('./chain/pairing');
    expect(grantValuesFor(plant, ['parent-names', 'breeding-method', 'sealed-at', 'attestation-status'])).toEqual({
      parents: [{ name: 'Mother' }],
      breedingMethod: S.method,
      loggedAt: plant.loggedAt,
      dnaPairBinding: dnaPairBinding('c'.repeat(64), plant.recordFingerprint, 'b5'.repeat(32)),
    });
    // Without the record's salt (not made yet), nothing about the report is published.
    expect(grantValuesFor({ ...plant, dnaPairSalt: undefined }, ['attestation-status'])).toEqual({});
    // The name only under its own grant (round 5, CONTRACT.md #28).
    expect(grantValuesFor(plant, ['name'])).toEqual({ name: PUBLIC_NAME });
    expect(grantValuesFor(plant, ['existence'])).toEqual({});
    expect(grantValuesFor(plant, ['individual-id'])).toEqual({}); // a plant has none
    const animal = {
      ...plant,
      profile: 'veilcore/profile/animal-individual/v1',
      refId: 'US-840-123',
      animal: { breed: 'Angus', idScheme: 'NAIS', sex: 'female', herd: 'H' },
    };
    expect(grantValuesFor(animal as never, ['individual-id', 'breeding-method'])).toEqual({
      individualId: 'US-840-123',
      idScheme: 'NAIS',
    });
  });

  it('a grant whose record has changed is sent again with the new values and fingerprint; a pairing forces it', async () => {
    const { records } = await modules();
    const { saveGrant, disclosureFrom } = await import('./disclosure');
    const rec = records.createRecord(await plantInput());
    await settle();
    await saveGrant(rec, disclosureFrom(['existence', 'attestation-status']));
    expect(grants.get(rec.id)).toEqual({
      show: ['existence', 'attestation-status'],
      forFingerprint: rec.recordFingerprint,
      values: {},
    });
    // A grant made before grants had values (or from an older version of the record).
    grants.set(rec.id, { ...grants.get(rec.id)!, forFingerprint: null, values: null });
    sent = [];
    records.pairDna(rec.id, S.dnaFp, 'r.pdf', { fileSha256: 'C'.repeat(64) });
    await settle();
    await settle();
    const { dnaBindingOf } = await import('./dna-link');
    const paired = records.getRecord(rec.id)!;
    expect(paired.dnaPairSalt).toMatch(/^[0-9a-f]{64}$/);
    expect(grants.get(rec.id)).toEqual({
      show: ['existence', 'attestation-status'],
      forFingerprint: rec.recordFingerprint,
      values: { dnaPairBinding: dnaBindingOf(paired) },
    });
    // Up to date: not sent again by the next save.
    sent = [];
    records.createRecord(await plantInput({ strainName: 'Other' }));
    await settle();
    await settle();
    expect(sent.filter((r) => r.method === 'PUT' && r.url.endsWith('/disclosure'))).toEqual([]);
    expect(sent.some((r) => r.url.endsWith('/api/disclosures'))).toBe(true);
  });

  it('a pairing changed without the fingerprint changing (another tab or device) is sent again: the values differ', async () => {
    const { records } = await modules();
    const { saveGrant, disclosureFrom, syncGrants } = await import('./disclosure');
    const rec = records.createRecord(await plantInput());
    await settle();
    records.pairDna(rec.id, S.dnaFp, 'r.pdf', { fileSha256: 'a'.repeat(64) });
    await settle();
    await saveGrant(records.getRecord(rec.id)!, disclosureFrom(['existence', 'attestation-status']));
    const { dnaBindingOf } = await import('./dna-link');
    expect(grants.get(rec.id)?.values).toEqual({ dnaPairBinding: dnaBindingOf(records.getRecord(rec.id)!) });

    // The record as this browser now holds it: a different report paired, same fingerprint,
    // and no `force` from a pairing made in this tab.
    const repaired = { ...records.getRecord(rec.id)!, dnaFingerprint: 'e'.repeat(64), dnaFileSha256: 'f'.repeat(64) };
    expect(repaired.recordFingerprint).toBe(rec.recordFingerprint);
    sent = [];
    expect(await syncGrants((id) => (id === rec.id ? repaired : undefined))).toBe(1);
    expect(grants.get(rec.id)).toEqual({
      show: ['existence', 'attestation-status'],
      forFingerprint: rec.recordFingerprint,
      values: { dnaPairBinding: dnaBindingOf(repaired) },
    });
    // Now the same: nothing sent.
    sent = [];
    expect(await syncGrants((id) => (id === rec.id ? repaired : undefined))).toBe(0);
    expect(sent.filter((r) => r.method === 'PUT')).toEqual([]);

    // A registry that doesn't list values: read per record, and compared the same way.
    listValues = false;
    const unpaired = { ...repaired, dnaFingerprint: undefined, dnaFileSha256: undefined };
    sent = [];
    expect(await syncGrants((id) => (id === rec.id ? unpaired : undefined))).toBe(1);
    expect(sent.some((r) => r.method === 'GET' && r.url.endsWith(`/api/records/${rec.id}/disclosure`))).toBe(true);
    expect(grants.get(rec.id)?.values).toEqual({});
    sent = [];
    expect(await syncGrants((id) => (id === rec.id ? unpaired : undefined))).toBe(0);
  });
});

describe('the registry export', () => {
  it('is opened in the browser before it is written; a row it can’t open keeps `sealed`, with a note', async () => {
    const { records } = await modules();
    const rec = records.createRecord(await plantInput());
    await settle();
    const foreign = foreignRow('VEIL-LOCKED', 'Old plant');
    const exported = {
      format: 'veilcore-registry-export/v1',
      records: [{ ...rows.get(rec.id), registryFirstSeen: '2026-10-16T00:00:00.000Z' }, foreign],
      licenses: [],
      disclosures: {},
      proofs: {},
      batches: [],
    };
    const { fetchRegistryExport, LOCKED_ROW_NOTE } = await import('./registry-export');
    const out = await fetchRegistryExport(() => json(exported));
    if ('error' in out) throw new Error(out.error);
    const file = JSON.parse(await out.blob.text()) as { records: Row[]; lockedRows: number; opened: string };
    expect(file.records[0]).toMatchObject({
      id: rec.id,
      bredBy: S.bredBy,
      notes: S.notes,
      registryFirstSeen: '2026-10-16T00:00:00.000Z',
    });
    expect(file.records[0].sealed).toBeUndefined();
    expect(file.records[1]).toEqual({ ...foreign, note: LOCKED_ROW_NOTE });
    expect(file.lockedRows).toBe(1);
    expect(file.opened).toMatch(/opened in your browser/);
  });
});

// Round 5 (CONTRACT.md #28): a record's name goes inside the box. A row saved before has its
// name only in the clear, beside a box without it: it loads with that name, and is saved
// again at once with the name inside and none beside it.
describe('a name saved in the clear before round 5', () => {
  it('loads with its name, is saved again with the name sealed, and the load says so', async () => {
    const { records, vault } = await modules();
    const rec = records.createRecord(await plantInput({ strainName: 'Old clear name' }));
    await settle();
    // What the registry held for it before round 5: the name beside a box without it.
    const now = rows.get(rec.id)!;
    expect('strainName' in now).toBe(false);
    const opened = await vault.openRow('records', rec.id, now.sealed);
    if (!opened.ok) throw new Error('the row did not open');
    const { strainName, ...withoutName } = opened.value;
    expect(strainName).toBe('Old clear name');
    rows.set(rec.id, {
      ...now,
      strainName: 'Old clear name',
      sealed: await vault.sealRow('records', rec.id, withoutName),
    });

    vi.resetModules(); // a new tab: same browser storage, same registry
    const again = await modules();
    sent = [];
    await again.records.hydrate();
    expect(again.records.getRecord(rec.id)?.strainName).toBe('Old clear name');
    expect(again.records.integrityOf(rec.id)).toBe('match');
    expect(again.api.loadNoticeOf('veilcore.records.v1').nameInClear).toBe(1);
    await settle();
    // Saved again: the name inside the box, none in the clear.
    const puts = sent.filter((r) => r.method === 'PUT' && r.url.endsWith('/api/records'));
    expect(puts.length).toBeGreaterThan(0);
    for (const p of puts) expect(p.body).not.toContain('Old clear name');
    const after = rows.get(rec.id)!;
    expect('strainName' in after).toBe(false);
    const reopened = await again.vault.openRow('records', rec.id, after.sealed);
    expect(reopened).toMatchObject({ ok: true, value: { strainName: 'Old clear name' } });

    // The next load finds nothing to move.
    vi.resetModules();
    const third = await modules();
    await third.records.hydrate();
    expect(third.records.getRecord(rec.id)?.strainName).toBe('Old clear name');
    expect(third.api.loadNoticeOf('veilcore.records.v1').nameInClear).toBeUndefined();
  });

  it('publicPart never carries the name; a stub without one still shows as a record', async () => {
    const { api } = await modules();
    expect(api.publicPart({ id: 'VEIL-1', strainName: 'Secret', recordFingerprint: 'a'.repeat(64) })).toEqual({
      id: 'VEIL-1',
      recordFingerprint: 'a'.repeat(64),
    });
    expect(api.privatePart({ id: 'VEIL-1', strainName: 'Secret' })).toMatchObject({ strainName: 'Secret' });
  });
});
