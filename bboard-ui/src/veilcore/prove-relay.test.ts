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
  it('posts its own challenge with no holder key, remembers it, and hands back one link', async () => {
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      sent.push({ url, init });
      return respond(200, { id: ID, expiresAt: 1 });
    });
    const relay = await import('./prove-relay');
    const r = await relay.askToProve({ identity: IDENTITY.toUpperCase(), asker: ' Example Lab ', recordId: 'VEIL-1' });
    if ('error' in r) throw new Error(r.error);
    expect(r.link).toMatch(new RegExp(`/prove/${ID}$`));
    expect(sent).toHaveLength(1);
    const headers = sent[0].init?.headers as Record<string, string>;
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('x-holder-key');
    const body = JSON.parse(sent[0].init?.body as string) as Record<string, string>;
    expect(body).toEqual({ identity: IDENTITY, challenge: r.ask.challenge, asker: 'Example Lab' });
    expect(relay.myAsk(ID)).toMatchObject({ identity: IDENTITY, challenge: r.ask.challenge, recordId: 'VEIL-1' });
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
      answers: [],
    };
    const relay = await import('./prove-relay');
    vi.stubGlobal('fetch', () => respond(200, good));
    expect(await relay.getProveRequest(ID)).toEqual(good);
    vi.stubGlobal('fetch', () => respond(404, { error: 'no such request' }));
    expect(await relay.getProveRequest(ID)).toBeNull();
    vi.stubGlobal('fetch', () => respond(200, { ...good, id: `PR-${'CD'.repeat(16)}` }));
    expect(await relay.getProveRequest(ID)).toMatchObject({ error: /unexpected/ });
    expect(await relay.getProveRequest('PR-../x')).toBeNull();
  });

  it('the holder posts only the transaction id, with no holder key', async () => {
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      sent.push({ url, init });
      return respond(200, { ok: true, answers: 1 });
    });
    const relay = await import('./prove-relay');
    expect(await relay.answerProveRequest(ID, `0x${TX.toUpperCase()}`)).toEqual({ ok: true });
    expect(sent[0].url).toMatch(new RegExp(`/prove-requests/${ID}/answers$`));
    expect(JSON.parse(sent[0].init?.body as string)).toEqual({ txId: TX });
    expect(JSON.stringify(sent[0].init?.headers).toLowerCase()).not.toContain('holder');
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
    const next = await relay.checkAnswers(ask, [TX], {
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
    const first = await relay.checkAnswers(ask, [junk, pending], check);
    expect(first.confirmed).toBeUndefined();
    expect(Object.keys(first.refused ?? {})).toEqual([junk]);

    verdicts[pending] = { accepted: true, reason: '' };
    const calls: string[] = [];
    const second = await relay.checkAnswers(first, [junk, pending], {
      ...check,
      checkOwnership: (i) => {
        calls.push(i.txId);
        return check.checkOwnership(i);
      },
    });
    expect(calls).toEqual([pending]); // the refused one is not checked again
    expect(second.confirmed?.txId).toBe(pending);
  });
});
