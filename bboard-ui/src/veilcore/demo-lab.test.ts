// VeilCore's demo lab (demo-lab.ts; summit 5b item 16): the file veilcore.org publishes says it is
// a demo key for invented data, and every page that names the key says so, in every language.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_LAB_KEYS, isDemoLabKey } from './demo-lab';
import { labIdentity, signerLabel, strengthLabel, type ResolvedAttestation } from './attesters';
import { labIdentityText, labIdentityWords } from './lab-identity-words';
import { makeTranslator } from '../i18n/translate';
import { appEn } from '../i18n/app/en';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';

const file = JSON.parse(
  readFileSync(new URL('../../public/.well-known/veilcore-lab.json', import.meta.url), 'utf8'),
) as { format: string; name: string; description: string; keys: { publicKey: string }[] };
const [DEMO] = [...DEMO_LAB_KEYS];
const NOW = Date.parse('2026-11-25T12:00:00Z');

const att = (publicKey: string, domain = true): ResolvedAttestation => ({
  attestationId: 'att_demo',
  type: 'laboratory-report',
  subjectCommitment: 'b'.repeat(64),
  attester: { publicKey, displayName: 'VeilCore Demo Lab' },
  documentHash: 'e'.repeat(64),
  hashAlgorithm: 'sha256',
  issuedAt: '2026-11-20T10:00:00Z',
  signature: 'sig',
  strength: 'signed',
  vettedAttester: false,
  registeredAs: {
    displayName: 'VeilCore Demo Lab',
    nameCheck: null,
    domainCheck: domain
      ? { domain: 'veilcore.org', method: 'file', checkedAt: '2026-11-24T03:00:00.000Z', claimChecked: true }
      : null,
  },
  retraction: null,
  signatureValid: true,
});

const LANGS = [
  ['en', appEn, 'DEMO'],
  ['de', appDe, 'DEMO'],
  ['es', appEs, 'DEMO'],
  ['fr', appFr, 'DÉMO'],
  ['ja', appJa, 'デモ'],
] as const;

describe('the demo lab', () => {
  it('the published file keeps its key and says it is a demo key for invented data', () => {
    expect(file.format).toBe('veilcore-lab/v1');
    expect(file.keys.map((k) => k.publicKey)).toEqual([...DEMO_LAB_KEYS]);
    // The registry reads a name of at most 200 characters (veilcore-api lineage/lab-domain.mjs).
    expect(file.name.length).toBeLessThanOrEqual(200);
    for (const text of [file.name, file.description]) {
      expect(text).toMatch(/demo/i);
      expect(text).toMatch(/invented data/);
      expect(text).toMatch(/not a laboratory/);
    }
  });

  it('knows its key, in either case, and nothing else', () => {
    expect(isDemoLabKey(DEMO)).toBe(true);
    expect(isDemoLabKey(DEMO.toUpperCase())).toBe(true);
    expect(isDemoLabKey('a1'.repeat(32))).toBe(false);
    expect(isDemoLabKey(undefined)).toBe(false);
  });

  it.each(LANGS)('every line naming it says demo, invented data, not a lab (%s)', (lang, dict, mark) => {
    const tr = makeTranslator(lang, dict);
    for (const domain of [true, false]) {
      const a = att(DEMO, domain);
      const id = labIdentity(a, NOW);
      expect(id.demo).toBe(true);
      const label = signerLabel(a, 'Signed by', NOW, tr);
      expect(label.who).toContain(mark);
      expect(label.text).toContain(mark);
      expect(strengthLabel(a, tr).why).toContain(mark);
      // The badge: said first, and drawn as a caution, never like a lab someone verified.
      const words = labIdentityWords(id, tr);
      expect(words.tone).toBe('caution');
      expect(words.body[0]).toEqual({ key: 'app.labid.demo' });
      expect(labIdentityText(id, tr)).toContain(mark);
    }
  });

  it('any other key reads exactly as before', () => {
    const a = att('a1'.repeat(32));
    const id = labIdentity(a, NOW);
    expect(id.demo).toBeUndefined();
    const tr = makeTranslator('en', appEn);
    expect(signerLabel(a, 'Signed by', NOW, tr).who).not.toMatch(/DEMO/);
    expect(labIdentityWords(id, tr).tone).toBe('website');
  });
});
