// "Prove it" by link: the registry carries messages, this browser does the believing.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const local = new Map<string, string>();
const session = new Map<string, string>();
const storage = (m: Map<string, string>) => ({
  getItem: (k: string) => m.get(k) ?? null,
  setItem: (k: string, v: string) => void m.set(k, v),
  removeItem: (k: string) => void m.delete(k),
});
const ID = `PR-${'AB'.repeat(16)}`;
const IDENTITY = 'e0'.repeat(32);
const TX = 'aa'.repeat(32);
const TOKEN = 'Abcdefghijklmnopqrstu_';
const answer = (txId: string, answeredAt = Date.now()) => ({ txId, answeredAt });

type Sent = { url: string; init?: RequestInit };
let sent: Sent[] = [];
const respond = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  local.clear();
  session.clear();
  sent = [];
  vi.stubGlobal('localStorage', storage(local));
  vi.stubGlobal('sessionStorage', storage(session));
});

describe('the checker asks', () => {
  it('posts its own challenge and only the hash of the answer token, with no holder key, and puts the token in the link fragment', async () => {
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      sent.push({ url, init });
      return respond(200, { id: ID, expiresAt: 1 });
    });
    const relay = await import('./prove-relay');
    const r = await relay.askToProve({ identity: IDENTITY.toUpperCase(), asker: ' Example Lab ', recordId: 'VEIL-1' });
    if ('error' in r) throw new Error(r.error);
    const m = new RegExp(`/prove/${ID}#t=([A-Za-z0-9_-]{22})$`).exec(r.link);
    expect(m).not.toBeNull();
    const token = m?.[1] ?? '';
    expect(sent).toHaveLength(1);
    const headers = sent[0].init?.headers as Record<string, string>;
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('x-holder-key');
    const body = JSON.parse(sent[0].init?.body as string) as Record<string, string>;
    expect(body).toEqual({
      identity: IDENTITY,
      challenge: r.ask.challenge,
      answerTokenHash: await relay.answerTokenHash(token),
      asker: 'Example Lab',
    });
    expect(sent[0].init?.body).not.toContain(token); // the token itself never goes to the registry
    expect(relay.myAsk(ID)).toMatchObject({
      identity: IDENTITY,
      challenge: r.ask.challenge,
      recordId: 'VEIL-1',
      token,
    });
    expect(relay.proveLink(ID, token)).toBe(r.link);
  });

  it('makes a different 128-bit token every time, and hashes it the way the registry does', async () => {
    const relay = await import('./prove-relay');
    const a = relay.newAnswerToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(relay.newAnswerToken()).not.toBe(a);
    // SHA-256 of the text "abc".
    expect(await relay.answerTokenHash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('reads the token from a link fragment, and nothing else', async () => {
    const relay = await import('./prove-relay');
    expect(relay.tokenFromHash(`#t=${TOKEN}`)).toBe(TOKEN);
    expect(relay.tokenFromHash(`t=${TOKEN}`)).toBe(TOKEN);
    expect(relay.tokenFromHash('')).toBeUndefined();
    expect(relay.tokenFromHash('#t=short')).toBeUndefined();
    expect(relay.tokenFromHash(`#t=${TOKEN}x`)).toBeUndefined();
    expect(relay.tokenFromHash(`#x=${TOKEN}`)).toBeUndefined();
  });

  it('says so when the registry is down or answers nonsense, and keeps nothing', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    const relay = await import('./prove-relay');
    expect(await relay.askToProve({ identity: IDENTITY })).toMatchObject({ error: /could not reach/ });
    vi.stubGlobal('fetch', () => respond(200, { id: '../../etc' }));
    expect(await relay.askToProve({ identity: IDENTITY })).toMatchObject({ error: /unexpected/ });
    expect(await relay.askToProve({ identity: 'nope' })).toMatchObject({ error: /no on-chain identity/ });
    expect(relay.myAsks()).toHaveLength(0);
  });
});

describe('reading and answering a request', () => {
  it('reads a request, treats unknown as ended, and refuses a body for another id', async () => {
    const good = {
      id: ID,
      identity: IDENTITY,
      challenge: 'cc'.repeat(32),
      asker: '',
      createdAt: 1,
      expiresAt: 2,
      answers: [answer(TX, 5)],
    };
    const relay = await import('./prove-relay');
    vi.stubGlobal('fetch', () => respond(200, good));
    expect(await relay.getProveRequest(ID)).toEqual(good);
    vi.stubGlobal('fetch', () => respond(404, { error: 'no such request' }));
    expect(await relay.getProveRequest(ID)).toBeNull();
    vi.stubGlobal('fetch', () => respond(200, { ...good, id: `PR-${'CD'.repeat(16)}` }));
    expect(await relay.getProveRequest(ID)).toMatchObject({ error: /unexpected/ });
    vi.stubGlobal('fetch', () => respond(200, { ...good, answers: [TX] })); // the old shape
    expect(await relay.getProveRequest(ID)).toMatchObject({ error: /unexpected/ });
    expect(await relay.getProveRequest('PR-../x')).toBeNull();
  });

  it('the holder posts only the transaction id and the token from the link, with no holder key', async () => {
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      sent.push({ url, init });
      return respond(200, { ok: true, answers: 1 });
    });
    const relay = await import('./prove-relay');
    expect(await relay.answerProveRequest(ID, `0x${TX.toUpperCase()}`, TOKEN)).toEqual({ ok: true });
    expect(sent[0].url).toMatch(new RegExp(`/prove-requests/${ID}/answers$`));
    expect(JSON.parse(sent[0].init?.body as string)).toEqual({ txId: TX, token: TOKEN });
    expect(JSON.stringify(sent[0].init?.headers).toLowerCase()).not.toContain('holder');
  });

  it('without a token nothing is sent, and a refusal from the registry is passed on', async () => {
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      sent.push({ url, init });
      return respond(403, { error: 'this answer needs the whole link it was sent with' });
    });
    const relay = await import('./prove-relay');
    expect(await relay.answerProveRequest(ID, TX, '')).toMatchObject({ error: /missing its last part/ });
    expect(sent).toHaveLength(0);
    expect(await relay.answerProveRequest(ID, TX, TOKEN)).toMatchObject({ error: /whole link/ });
  });
});

describe('checking the answers', () => {
  const setup = async () => {
    vi.stubGlobal('fetch', () => respond(200, { id: ID }));
    const relay = await import('./prove-relay');
    const r = await relay.askToProve({ identity: IDENTITY, anchorTx: 'bb'.repeat(32) });
    if ('error' in r) throw new Error(r.error);
    return { relay, ask: r.ask };
  };

  it('checks against the challenge and identity this browser kept', async () => {
    const { relay, ask } = await setup();
    const seen: unknown[] = [];
    const next = await relay.checkAnswers(ask, [answer(TX)], {
      checkOwnership: (input) => {
        seen.push(input);
        return Promise.resolve({ accepted: true, reason: '' });
      },
      checkAnchor: () => Promise.resolve(true),
    });
    expect(seen).toEqual([{ txId: TX, identity: IDENTITY, challenge: ask.challenge }]);
    expect(next.confirmed).toMatchObject({ txId: TX, anchor: true });
    expect(relay.myAsk(ID)?.confirmed?.txId).toBe(TX); // saved, so a new tab shows it
  });

  it('keeps junk answers as refused, tries a not-yet-indexed one again, and confirms the real one', async () => {
    const { relay, ask } = await setup();
    const junk = 'cc'.repeat(32);
    const pending = 'dd'.repeat(32);
    const verdicts: Record<string, { accepted: boolean; reason: string }> = {
      [junk]: { accepted: false, reason: 'that proof did not answer this challenge' },
      [pending]: { accepted: false, reason: 'No such transaction.' },
    };
    const check = {
      checkOwnership: ({ txId }: { txId: string }) => Promise.resolve(verdicts[txId]),
      checkAnchor: () => Promise.resolve(true),
    };
    const answers = [answer(junk), answer(pending)];
    const first = await relay.checkAnswers(ask, answers, check);
    expect(first.confirmed).toBeUndefined();
    expect(Object.keys(first.refused ?? {})).toEqual([junk]);

    verdicts[pending] = { accepted: true, reason: '' };
    const calls: string[] = [];
    const second = await relay.checkAnswers(first, answers, {
      ...check,
      checkOwnership: (i) => {
        calls.push(i.txId);
        return check.checkOwnership(i);
      },
    });
    expect(calls).toEqual([pending]); // the refused one is not checked again
    expect(second.confirmed?.txId).toBe(pending);
  });

  it('gives a transaction the network does not know 15 minutes from when it came in, then refuses it plainly', async () => {
    const { relay, ask } = await setup();
    const t0 = 1_000_000_000;
    let clock = t0;
    const calls: string[] = [];
    const check = {
      checkOwnership: ({ txId }: { txId: string }) => {
        calls.push(txId);
        return Promise.resolve({ accepted: false, reason: 'No such transaction.' });
      },
      checkAnchor: () => Promise.resolve(true),
    };
    const answers = [answer(TX, t0)];
    clock = t0 + relay.NOT_INDEXED_GRACE_MS - 1;
    const within = await relay.checkAnswers(ask, answers, check, () => clock);
    expect(within.refused).toBeUndefined();
    clock = t0 + relay.NOT_INDEXED_GRACE_MS + 1;
    const after = await relay.checkAnswers(within, answers, check, () => clock);
    expect(after.refused?.[TX]).toBe(relay.NEVER_APPEARED);
    await relay.checkAnswers(after, answers, check, () => clock);
    expect(calls).toHaveLength(2); // refused: not checked again
  });

  it('network trouble is never a verdict, however long it lasts', async () => {
    const { relay, ask } = await setup();
    const reasons = [
      'could not reach the Midnight network’s indexer; try again in a few minutes',
      'The indexer answered 502.',
    ];
    for (const reason of reasons) {
      const next = await relay.checkAnswers(
        ask,
        [answer(TX, 0)],
        {
          checkOwnership: () => Promise.resolve({ accepted: false, reason }),
          checkAnchor: () => Promise.resolve(true),
        },
        () => 10 * relay.NOT_INDEXED_GRACE_MS,
      );
      expect(next.refused).toBeUndefined();
    }
  });

  it('checks each answer once per look, even if the registry lists it twice', async () => {
    const { relay, ask } = await setup();
    const calls: string[] = [];
    await relay.checkAnswers(ask, [answer(TX), answer(TX), answer(`0x${TX.toUpperCase()}`)], {
      checkOwnership: ({ txId }) => {
        calls.push(txId);
        return Promise.resolve({ accepted: false, reason: 'could not reach the indexer' });
      },
      checkAnchor: () => Promise.resolve(true),
    });
    expect(calls).toEqual([TX]);
  });
});

describe('how often the checker looks', () => {
  it('every 5 seconds for 2 minutes, then every 30, and stops when the request expires', async () => {
    const relay = await import('./prove-relay');
    const since = 1_000_000;
    const expires = since + 7 * 86_400_000;
    expect(relay.nextPollMs(since, since, expires)).toBe(5_000);
    expect(relay.nextPollMs(since, since + 119_999, expires)).toBe(5_000);
    expect(relay.nextPollMs(since, since + 120_000, expires)).toBe(30_000);
    expect(relay.nextPollMs(since, expires - 1, expires)).toBe(30_000);
    expect(relay.nextPollMs(since, expires, expires)).toBeNull();
  });
});
