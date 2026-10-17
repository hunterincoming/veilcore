// "Copy details for support" (support-details.ts): enough to act on, and nothing secret or typed.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browserName, scrub, supportMailto, supportText, supportTextNow } from './support-details';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(JSON.stringify({ commit: '39f7f64aa1b2' }))));
});

const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

describe('support details', () => {
  it('says the release, network, time, step, the error’s first sentence, browser, storage, outbox and backup', () => {
    const text = supportText({
      step: 'key date stamp',
      error:
        "The prover could not start in this browser: Failed to construct 'Worker': This document requires 'TrustedScriptURL' assignment. More text.",
      site: 'test.veilcore.org',
      commit: '39f7f64aa1b2c3d4',
      network: 'preprod',
      at: new Date('2026-10-17T18:22:05.123Z'),
      userAgent: MAC_CHROME,
      storageWorks: true,
      outboxCount: 1,
      backupChecked: 'no',
    });
    expect(text).toBe(
      [
        'VeilCore support details',
        'Site: test.veilcore.org · release 39f7f64aa1b2',
        'Network: preprod (test network)',
        'Time: 2026-10-17T18:22:05Z',
        'Step: key date stamp',
        "What went wrong: The prover could not start in this browser: Failed to construct 'Worker': This document requires 'TrustedScriptURL' assignment.",
        'Browser: Chrome 141 on macOS',
        'Browser storage works: yes',
        'Records waiting in this browser for VeilCore: 1',
        'Backup checked: no',
      ].join('\n'),
    );
  });

  it('takes out anything that could be a key, a code, a name, an address or a link', () => {
    const hex = 'ab'.repeat(32);
    const b64 = 'o1' + 'A'.repeat(43);
    const out = scrub(
      `VEIL-${hex.toUpperCase().slice(0, 32)}: refused for “Grandma’s Secret Kush” and "Hunter" ${hex} ${b64} hunter@example.com https://x.example/?project_id=abc`,
    );
    expect(out).not.toMatch(/[0-9a-fA-F]{17,}/);
    expect(out).not.toContain('Secret Kush');
    expect(out).not.toContain('Hunter');
    expect(out).not.toContain(b64);
    expect(out).not.toContain('@');
    expect(out).not.toContain('project_id');
  });

  it('never carries what this browser keeps: the holder key, the vault key, a record', async () => {
    const holder = 'cd'.repeat(32);
    const vault = 'Z'.repeat(43);
    store.set('veilcore.holder.v1', holder);
    store.set('veilcore.vault.v1', JSON.stringify({ key: vault, createdAt: 1 }));
    store.set(
      'veilcore.outbox.v1',
      JSON.stringify({ [holder]: { 'VEIL-1': { id: 'VEIL-1', strainName: 'Typed name' } } }),
    );
    const text = await supportTextNow('save to VeilCore', `could not save ${holder} with ${vault} for "Typed name"`);
    expect(text).not.toContain(holder);
    expect(text).not.toContain(vault);
    expect(text).not.toContain('Typed name');
    expect(text).toMatch(/Records waiting in this browser for VeilCore: 1/);
    expect(text).toMatch(/Backup checked: no/);
    expect(text).toMatch(/release 39f7f64aa1b2/);
  });

  it('names browsers plainly, and mails it to VeilCore', () => {
    expect(browserName(MAC_CHROME)).toBe('Chrome 141 on macOS');
    expect(
      browserName(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Safari 18.0 on iOS');
    expect(browserName('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0')).toBe(
      'Firefox 133 on Windows',
    );
    const mail = supportMailto('a\nb', 'key date stamp');
    expect(mail.startsWith('mailto:hunter@veilcore.org?subject=')).toBe(true);
    expect(mail).toContain('body=a%0Ab');
  });
});
