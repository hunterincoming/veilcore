// The passkey check page's script (public/tools/passkey-check.js), run as the page runs it, with
// a stand-in authenticator: what it reports, that its result line holds no secret, that its
// test input is its own (never the one that locks records), and that every string is in all
// five languages.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PRF_INPUT, rpIdFor } from './veilcore/passkey-backup';

type Flags = { up: boolean; uv: boolean; be: boolean; bs: boolean };
type Test = {
  kind: string;
  prf: boolean | null;
  stable: boolean | null;
  flags: Flags | null;
  attachment: string | null;
  code: string | null;
  error: string | null;
};
type Kit = {
  VERSION: string;
  PRF_LABEL: string;
  LANGS: string[];
  STRINGS: Record<string, Record<string, string>>;
  rpIdFor: (h: string) => string | undefined;
  flagsOf: (b: Uint8Array) => Flags | null;
  pickLang: (q: string, stored: string | null, browser: string[]) => string;
  clientOf: (ua: string, uaData?: unknown) => string;
  resultLine: (r: unknown) => string;
  checkCode: (prf: Uint8Array) => Promise<string>;
  runTest: (kind: string, rpId: string | undefined, progress: (k: string) => void, creds: unknown) => Promise<Test>;
};

const src = readFileSync(new URL('../public/tools/passkey-check.js', import.meta.url), 'utf8');
// The page's own script, run as written.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const kit = new Function(`${src}\nreturn PasskeyCheck;`)() as Kit;

/** A stand-in authenticator: HMAC-SHA-256 over the PRF input with its own secret, like CTAP2 hmac-secret. */
const authenticator = (
  opts: { secret?: Buffer; flags?: number; prf?: boolean; drift?: boolean; fail?: string } = {},
) => {
  const secret = opts.secret ?? Buffer.alloc(32, 7);
  let n = 0;
  const seen: { rpId?: string; allow?: unknown }[] = [];
  const authData = () => {
    const b = new Uint8Array(37);
    b[32] = opts.flags ?? 0x1d;
    return b.buffer;
  };
  const cred = (input: ArrayBuffer | Uint8Array) => {
    n++;
    const key = opts.drift && n > 1 ? Buffer.alloc(32, n) : secret;
    const out = createHmac('sha256', key)
      .update(Buffer.from(input as Uint8Array))
      .digest();
    return {
      rawId: new Uint8Array([1, 2, 3, 4]).buffer,
      authenticatorAttachment: 'platform',
      response: { authenticatorData: authData() },
      getClientExtensionResults: () =>
        opts.prf === false ? {} : { prf: { results: { first: new Uint8Array(out).buffer } } },
    };
  };
  return {
    seen,
    creds: {
      get: async ({
        publicKey,
      }: {
        publicKey: { rpId?: string; allowCredentials?: unknown; extensions: { prf: { eval: { first: Uint8Array } } } };
      }) => {
        if (opts.fail) throw Object.assign(new Error('stand-in'), { name: opts.fail });
        seen.push({ rpId: publicKey.rpId, allow: publicKey.allowCredentials });
        return cred(publicKey.extensions.prf.eval.first);
      },
      create: async () => ({
        rawId: new Uint8Array([9, 9]).buffer,
        getClientExtensionResults: () => ({ prf: { enabled: opts.prf !== false } }),
      }),
    },
  };
};

describe('the passkey check page', () => {
  it('asks a passkey twice and finds the same secret, synced, with a check code', async () => {
    const a = authenticator();
    const steps: string[] = [];
    const t = await kit.runTest('existing', 'veilcore.org', (k) => steps.push(k), a.creds);
    expect(t).toMatchObject({ prf: true, stable: true, attachment: 'platform', error: null });
    expect(t.flags).toEqual({ up: true, uv: true, be: true, bs: true });
    expect(t.code).toMatch(/^[0-9a-f]{8}$/);
    expect(steps).toEqual(['stepFirst', 'stepSecond']);
    // The second ask names the passkey the first one used.
    expect(a.seen[0]).toEqual({ rpId: 'veilcore.org', allow: undefined });
    expect(a.seen[1].allow).toBeDefined();
  });

  it('the same passkey gives the same check code anywhere; another passkey a different one', async () => {
    const one = await kit.runTest('existing', undefined, () => undefined, authenticator().creds);
    const again = await kit.runTest('existing', undefined, () => undefined, authenticator().creds);
    const other = await kit.runTest(
      'existing',
      undefined,
      () => undefined,
      authenticator({ secret: Buffer.alloc(32, 8) }).creds,
    );
    expect(again.code).toBe(one.code);
    expect(other.code).not.toBe(one.code);
  });

  it('a passkey that answers differently the second time is caught', async () => {
    const t = await kit.runTest('existing', undefined, () => undefined, authenticator({ drift: true }).creds);
    expect(t).toMatchObject({ prf: true, stable: false });
  });

  it('no PRF, a device-bound passkey, a test passkey, and a cancelled prompt', async () => {
    expect(
      await kit.runTest('existing', undefined, () => undefined, authenticator({ prf: false }).creds),
    ).toMatchObject({
      prf: false,
      code: null,
    });
    const bound = await kit.runTest('existing', undefined, () => undefined, authenticator({ flags: 0x05 }).creds);
    expect(bound.flags).toMatchObject({ be: false, bs: false });
    const steps: string[] = [];
    const made = await kit.runTest('new', undefined, (k) => steps.push(k), authenticator().creds);
    expect(made).toMatchObject({ kind: 'new', prf: true, stable: true });
    expect(steps[0]).toBe('stepMake');
    expect(
      await kit.runTest('existing', undefined, () => undefined, authenticator({ fail: 'NotAllowedError' }).creds),
    ).toMatchObject({ error: 'cancelled' });
    expect(
      await kit.runTest('existing', undefined, () => undefined, authenticator({ fail: 'SecurityError' }).creds),
    ).toMatchObject({ error: 'unsupported' });
  });

  it('its result line holds no secret: no PRF output, no credential id, nothing longer than the check code', async () => {
    const t = await kit.runTest('existing', 'veilcore.org', () => undefined, authenticator().creds);
    const line = kit.resultLine({
      date: '2026-11-20',
      client: kit.clientOf(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1',
      ),
      caps: { webauthn: true, platform: true, prf: true, hybrid: null },
      test: t,
    });
    expect(line).toBe(
      `passkey-check v1 · 2026-11-20 · Safari 18.4 on iOS 18.4 · webauthn=yes · platform=yes · prf-reported=yes · test=existing · prf=yes · stable=yes · be=1 bs=1 · attach=platform · code=${t.code}`,
    );
    expect(line).not.toMatch(/[0-9a-f]{9,}/i);
  });

  it('its PRF input is its own, never the one that locks records', () => {
    const mine = createHash('sha256').update(kit.PRF_LABEL).digest();
    expect(Buffer.from(mine).equals(Buffer.from(PRF_INPUT))).toBe(false);
    expect(kit.PRF_LABEL).toBe('veilcore/passkey-check/v1/prf-input');
  });

  it('asks for passkeys of the same site the app does', () => {
    for (const h of [
      'veilcore.org',
      'www.veilcore.org',
      'test.veilcore.org',
      'a.test.veilcore.org',
      'localhost',
      '127.0.0.1',
      'example.com',
    ])
      expect(kit.rpIdFor(h)).toBe(rpIdFor(h));
  });

  it('reads the flags byte of authenticator data', () => {
    const b = new Uint8Array(37);
    b[32] = 0x01 | 0x04 | 0x08;
    expect(kit.flagsOf(b)).toEqual({ up: true, uv: true, be: true, bs: false });
    expect(kit.flagsOf(new Uint8Array(10))).toBeNull();
  });

  it('picks the language from ?lang=, then the site’s choice, then the browser', () => {
    expect(kit.pickLang('?lang=ja', 'de', ['fr-FR'])).toBe('ja');
    expect(kit.pickLang('', 'de', ['fr-FR'])).toBe('de');
    expect(kit.pickLang('', null, ['fr-FR', 'en'])).toBe('fr');
    expect(kit.pickLang('?lang=xx', 'zz', ['pt-BR'])).toBe('en');
  });

  it('every string is in all five languages, with the same placeholders', () => {
    expect(kit.LANGS).toEqual(['en', 'de', 'es', 'fr', 'ja']);
    const keys = Object.keys(kit.STRINGS.en).sort();
    for (const l of kit.LANGS) {
      expect(Object.keys(kit.STRINGS[l]).sort(), l).toEqual(keys);
      for (const k of keys) {
        expect(kit.STRINGS[l][k].trim().length, `${l} ${k}`).toBeGreaterThan(0);
        expect(kit.STRINGS[l][k].match(/\{\w+\}/g) ?? [], `${l} ${k}`).toEqual(
          kit.STRINGS.en[k].match(/\{\w+\}/g) ?? [],
        );
        if (l !== 'en' && !['capWebauthn', 'no'].includes(k))
          expect(kit.STRINGS[l][k], `${l} ${k} left in English`).not.toBe(kit.STRINGS.en[k]);
      }
    }
    // The glossary's hold-never-own rule, and Spanish's phone word.
    const all = JSON.stringify(kit.STRINGS);
    expect(all).not.toMatch(/\b(own|owner|ownership|propietario|dueño|Eigentum|propriétaire)\b|所有/i);
    expect(JSON.stringify(kit.STRINGS.es)).not.toMatch(/móvil|ordenador/);
  });
});
