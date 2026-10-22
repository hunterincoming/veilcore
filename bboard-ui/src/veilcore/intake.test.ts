// A partner's intake link (intake.ts): what is accepted, and what goes back.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hostOf, loadIntake, parseIntake, returnProblem, returnUrl, saveIntake } from './intake';

beforeEach(() => {
  const m = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  });
});

const q = (o: Record<string, string>) => `?${new URLSearchParams(o).toString()}`;

describe('a partner’s intake link', () => {
  it('takes an https return address, a state, and an optional reference and name', () => {
    const p = parseIntake(
      q({ return: 'https://lab.example/in?x=1', state: 'abcd1234', ref: ' S-1\u0007 ', name: 'Plant' }),
    );
    expect(p.ok && p.request).toEqual({
      returnTo: 'https://lab.example/in?x=1',
      state: 'abcd1234',
      ref: 'S-1',
      name: 'Plant',
    });
    expect(p.ok && hostOf(p.request)).toBe('lab.example');
  });

  it('refuses what could send the answer somewhere unsafe', () => {
    expect(returnProblem('http://lab.example/', true)).toBe('notHttps');
    expect(returnProblem('javascript:alert(1)', true)).toBe('notHttps');
    expect(returnProblem('data:text/html,hi', true)).toBe('notHttps');
    expect(returnProblem('https://a:b@lab.example/', true)).toBe('credentials');
    expect(returnProblem('https://lab.example/#x', true)).toBe('hasHash');
    expect(returnProblem('not a url', true)).toBe('notUrl');
    expect(returnProblem(`https://lab.example/${'a'.repeat(2001)}`, true)).toBe('tooLong');
    // A local test page on a test network only.
    expect(returnProblem('http://localhost:3000/done', false)).toBeUndefined();
    expect(returnProblem('http://localhost:3000/done', true)).toBe('notHttps');
    expect(parseIntake(q({ state: 'abcd1234' }))).toEqual({ ok: false, problem: 'noReturn' });
    expect(parseIntake(q({ return: 'https://lab.example/', state: 'short' }))).toEqual({
      ok: false,
      problem: 'badState',
    });
    expect(parseIntake(q({ return: 'https://lab.example/', state: 'has space 123' }))).toEqual({
      ok: false,
      problem: 'badState',
    });
  });

  it('sends back only the record’s ID, proof code and check link, with the state, after the #', () => {
    const r = { returnTo: 'https://lab.example/in?x=1', state: 'abcd1234', ref: 'S-1', name: 'Secret name' };
    const url = new URL(
      returnUrl(r, {
        recordId: 'VEIL-1',
        proofCode: 'ab'.repeat(32),
        checkLink: 'https://veilcore.org/verify/VEIL-1?fp=ab',
      }),
    );
    expect(url.origin + url.pathname + url.search).toBe('https://lab.example/in?x=1');
    const h = new URLSearchParams(url.hash.slice(1));
    expect(Object.fromEntries(h)).toEqual({
      veilcore: 'veilcore/intake/v1',
      state: 'abcd1234',
      record: 'VEIL-1',
      proof: 'ab'.repeat(32),
      check: 'https://veilcore.org/verify/VEIL-1?fp=ab',
    });
    expect(url.href).not.toContain('Secret');
    expect(Object.fromEntries(new URLSearchParams(new URL(returnUrl(r, 'declined')).hash.slice(1)))).toEqual({
      veilcore: 'veilcore/intake/v1',
      state: 'abcd1234',
      declined: '1',
    });
  });

  it('a request kept for the tab is checked again when read', () => {
    saveIntake({ returnTo: 'https://lab.example/', state: 'abcd1234' });
    expect(loadIntake(true)?.state).toBe('abcd1234');
    sessionStorage.setItem('veilcore:intake', JSON.stringify({ returnTo: 'http://evil.example/', state: 'abcd1234' }));
    expect(loadIntake(true)).toBeUndefined();
  });
});

describe('attack pass on the intake link, 22 Oct', () => {
  it('4: a bare # at the end is refused too', async () => {
    const { returnProblem } = await import('./intake');
    expect(returnProblem('https://lab.example/x#', true)).toBe('hasHash');
  });

  it('3: format and line-separator characters are taken out of text from the link', async () => {
    const { clean, oddHost } = await import('./intake');
    expect(clean('a‮b​c d\u0085e', 100)).toBe('abcde');
    expect(oddHost('10.0.0.5')).toBe(true);
    expect(oddHost('xn--pple-43d.com')).toBe(true);
    expect(oddHost('lab.example:8443')).toBe(true);
    expect(oddHost('lab.example')).toBe(false);
  });

  it('2: a request expires after an hour, and only records picked for it can be sent', async () => {
    const { saveIntake, loadIntake, allowRecord, INTAKE_TTL_MS } = await import('./intake');
    const t0 = Date.now();
    saveIntake({ returnTo: 'https://lab.example/', state: 'abcd1234' }, t0);
    expect(loadIntake(true, t0)?.allowed).toEqual([]);
    allowRecord('VEIL-1');
    expect(loadIntake(true)?.allowed).toEqual(['VEIL-1']);
    expect(loadIntake(true, t0 + INTAKE_TTL_MS + 1)).toBeUndefined();
    // Gone for good once expired.
    expect(loadIntake(true, t0)).toBeUndefined();
  });
});
