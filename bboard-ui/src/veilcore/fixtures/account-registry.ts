// Stand-ins for the account copy's tests: the registry's /account-copy, /account-slot and older
// /vault routes as lineage/account-copy.mjs and passkey-vault.mjs answer them (tokens checked by
// their SHA-256, a save over a newer copy refused with 409, a new copy only with its first way in),
// and a passkey with a PRF secret and a backup-state flag. Tests can reach in to play a dishonest
// registry: drop a slot, put back an older copy, delete the copy.
// SPDX-License-Identifier: Apache-2.0

import { createHash, randomBytes } from 'node:crypto';

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const reply = (status: number, json: unknown) => new Response(JSON.stringify(json), { status });

export type CopyRow = { writeHash: string; iv: string; ct: string; updatedAt: number };
export type SlotRow = { copyId: string; kind: string; readHash: string; iv: string; ct: string; createdAt: number };

export const accountRegistry = (inner?: typeof fetch) => {
  const copies = new Map<string, CopyRow>();
  const slots = new Map<string, SlotRow>();
  const legacy = new Map<string, { hash: string; iv: string; ct: string }>();
  /** Every body the registry was sent, for "nothing readable left the device" checks. */
  const sent: string[] = [];
  const calls: { method: string; path: string }[] = [];
  let at = 1;
  const slotList = (id: string) =>
    [...slots.entries()]
      .filter(([, s]) => s.copyId === id)
      .map(([slotId, s]) => ({ slotId, kind: s.kind, createdAt: s.createdAt, wrap: sha(`${s.iv}.${s.ct}`) }));

  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = new URL(url, 'http://registry.test').pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const isOurs = /^\/(account-copy|account-slot|vault)\//.test(path);
    if (!isOurs) {
      if (inner) return inner(input, init);
      return reply(404, { error: 'no route' });
    }
    calls.push({ method, path });
    const raw = (init?.body as string) ?? '{}';
    sent.push(raw);
    const body = JSON.parse(raw) as Record<string, string | Record<string, string> | undefined>;
    const token = body.token as string | undefined;
    let m: RegExpExecArray | null;

    if ((m = /^\/account-slot\/([0-9a-f]{32})\/read$/.exec(path))) {
      const s = slots.get(m[1]);
      if (!s) return reply(404, { error: 'no such way in' });
      if (!token || sha(token) !== s.readHash) return reply(403, { error: 'this way in needs its own key' });
      return reply(200, { copyId: s.copyId, kind: s.kind, iv: s.iv, ct: s.ct });
    }
    if ((m = /^\/account-copy\/([0-9a-f]{32})\/slots\/([0-9a-f]{32})(\/delete)?$/.exec(path))) {
      const c = copies.get(m[1]);
      if (!c) return reply(404, { error: 'no such copy' });
      if (!token || sha(token) !== c.writeHash) return reply(403, { error: 'this copy needs its key' });
      if (m[3]) {
        if (slotList(m[1]).length <= 1) return reply(409, { error: 'last way in' });
        slots.delete(m[2]);
        return reply(200, { removed: true });
      }
      if (slots.has(m[2])) return reply(409, { error: 'exists' });
      slots.set(m[2], {
        copyId: m[1],
        kind: body.kind as string,
        readHash: body.tokenHash as string,
        iv: body.iv as string,
        ct: body.ct as string,
        createdAt: at++,
      });
      return reply(200, { added: true });
    }
    if ((m = /^\/account-copy\/([0-9a-f]{32})(\/read|\/head|\/delete)?$/.exec(path))) {
      const id = m[1];
      const c = copies.get(id);
      if (!m[2]) {
        if (c && (!token || sha(token) !== c.writeHash)) return reply(403, { error: 'this copy needs its key' });
        if (c && body.prev !== sha(`${c.iv}.${c.ct}`)) return reply(409, { error: 'changed' });
        if (!c && body.prev !== 'none') return reply(409, { error: 'changed' });
        if (!c) {
          const s = body.slot as Record<string, string> | undefined;
          if (!s) return reply(400, { error: 'a new copy needs its first way in' });
          if (slots.has(s.slotId)) return reply(409, { error: 'that way in already opens another copy' });
          slots.set(s.slotId, { copyId: id, kind: s.kind, readHash: s.tokenHash, iv: s.iv, ct: s.ct, createdAt: at++ });
        }
        copies.set(id, {
          writeHash: c?.writeHash ?? sha(token as string),
          iv: body.iv as string,
          ct: body.ct as string,
          updatedAt: at++,
        });
        return reply(200, { saved: true, fingerprint: sha(`${body.iv as string}.${body.ct as string}`) });
      }
      if (!c) return reply(404, { error: 'no such copy' });
      if (!token || sha(token) !== c.writeHash) return reply(403, { error: 'this copy needs its key' });
      if (m[2] === '/delete') {
        copies.delete(id);
        for (const [sid, s] of slots) if (s.copyId === id) slots.delete(sid);
        return reply(200, { deleted: true });
      }
      if (m[2] === '/head')
        return reply(200, { fingerprint: sha(`${c.iv}.${c.ct}`), updatedAt: c.updatedAt, slots: slotList(id) });
      return reply(200, { iv: c.iv, ct: c.ct, updatedAt: c.updatedAt, slots: slotList(id) });
    }
    if ((m = /^\/vault\/([0-9a-f]{32})(\/read|\/delete)?$/.exec(path))) {
      const row = legacy.get(m[1]);
      const ok = row && token && row.hash === sha(token);
      if (!m[2]) {
        if (row && !ok) return reply(403, { error: 'this copy needs its passkey' });
        if (row && body.prev !== sha(`${row.iv}.${row.ct}`)) return reply(409, { error: 'changed' });
        legacy.set(m[1], { hash: sha(token as string), iv: body.iv as string, ct: body.ct as string });
        return reply(200, { saved: true });
      }
      if (!row) return reply(404, { error: 'no such copy' });
      if (!ok) return reply(403, { error: 'this copy needs its passkey' });
      if (m[2] === '/delete') {
        legacy.delete(m[1]);
        return reply(200, { deleted: true });
      }
      return reply(200, { iv: row.iv, ct: row.ct });
    }
    return reply(404, { error: 'no route' });
  };
  return { fetch, copies, slots, legacy, sent, calls };
};

export type AccountRegistry = ReturnType<typeof accountRegistry>;

/**
 * A passkey: one id and PRF secret (the same on every device it syncs to), and the backup-state
 * flag its authenticator data carries (BS=1 synced; 0 stays on this device).
 */
export const fakePasskey = (opts: { synced?: boolean } = {}) => {
  const state = {
    rawId: randomBytes(16),
    secret: randomBytes(32),
    synced: opts.synced ?? true,
    /** Set to give a different PRF output when asked afterwards than at creation (an authenticator bug). */
    driftAfterCreate: false,
    created: false,
  };
  const prf = async (input: Uint8Array<ArrayBuffer>, secret: Uint8Array) => {
    const k = await crypto.subtle.importKey('raw', new Uint8Array(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
    ]);
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, input));
  };
  const authData = () => {
    const a = new Uint8Array(37);
    a[32] = 0x01 | 0x04 | 0x08 | (state.synced ? 0x10 : 0);
    return a.buffer;
  };
  type Ask = {
    publicKey: {
      rpId?: string;
      rp?: { id?: string };
      user?: { name?: string };
      allowCredentials?: { id: Uint8Array }[];
      extensions: { prf: { eval: { first: Uint8Array<ArrayBuffer> } } };
    };
  };
  const asks: Ask[] = [];
  const credential = async (o: Ask, kind: 'create' | 'get') => {
    asks.push(o);
    const secret = kind === 'get' && state.driftAfterCreate ? randomBytes(32) : state.secret;
    const results = {
      prf: { enabled: true, results: { first: await prf(o.publicKey.extensions.prf.eval.first, secret) } },
    };
    return {
      rawId: state.rawId.buffer.slice(state.rawId.byteOffset, state.rawId.byteOffset + 16),
      getClientExtensionResults: () => results,
      response: kind === 'get' ? { authenticatorData: authData() } : { getAuthenticatorData: () => authData() },
    };
  };
  const credentials = {
    create: async (o: Ask) => {
      state.created = true;
      return credential(o, 'create');
    },
    get: async (o: Ask) => credential(o, 'get'),
  };
  return { state, credentials, asks };
};
