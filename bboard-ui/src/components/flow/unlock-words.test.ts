// The words around unlocking and the way back (the simplify-unlock plan, phase 1), in all five
// languages:
//   - the passkey button says "This device's lock", never Face ID, Touch ID or Windows Hello: the
//     phone's passcode works too, and the button shouldn't push biometrics; one line says what it is;
//   - the backup file is "one of the ways back", never "the only way to prove you hold your records"
//     (false once the records are saved with VeilCore);
//   - the recovery sheet on the restore page comes with one line saying what it is, and the printed
//     sheet says where the button now is ("Other ways");
//   - the sheet doesn't open by itself inside a flow that seals records (one prompt after a seal).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { appEn } from '../../i18n/app/en';
import { appDe } from '../../i18n/app/de';
import { appEs } from '../../i18n/app/es';
import { appFr } from '../../i18n/app/fr';
import { appJa } from '../../i18n/app/ja';
import { en } from '../../i18n/en';
import { de } from '../../i18n/de';
import { es } from '../../i18n/es';
import { fr } from '../../i18n/fr';
import { ja } from '../../i18n/ja';
import { QUIET, accountLine, deviceLockHintFor, unlockWordFor } from './KeepSafe';
import { makeTranslator } from '../../i18n/translate';
import type { AccountState } from '../../veilcore/account-copy';

const APP = { en: appEn, de: appDe, es: appEs, fr: appFr, ja: appJa } as Record<string, Record<string, string>>;
const SITE = { en, de, es, fr, ja } as unknown as Record<string, Record<string, string>>;
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X)';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9)';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

describe('the passkey button', () => {
  it('is "this device’s lock" on every device that unlocks a passkey itself, and "a passkey" where it can’t', () => {
    for (const ua of [IPHONE, ANDROID, MAC, WINDOWS]) {
      expect(unlockWordFor(ua, true)).toBe('deviceLock');
      expect(unlockWordFor(ua, false)).toBe('passkey');
    }
  });

  it('has one line under it: a phone’s words on a phone or tablet, a computer’s on a computer', () => {
    expect(deviceLockHintFor(IPHONE)).toBe('app.account.deviceLock.hint');
    expect(deviceLockHintFor(ANDROID)).toBe('app.account.deviceLock.hint');
    expect(deviceLockHintFor(MAC)).toBe('app.account.deviceLock.hintComputer');
    expect(deviceLockHintFor(WINDOWS)).toBe('app.account.deviceLock.hintComputer');
    expect(appEn['app.account.use.deviceLock']).toBe('This device’s lock');
    expect(appEn['app.account.deviceLock.hint']).toBe('The passcode, face or finger you unlock your phone with.');
  });

  it('never names Face ID, Touch ID or Windows Hello on a button or in its words, in any language', () => {
    for (const [lang, d] of Object.entries(APP)) {
      for (const [k, v] of Object.entries(d)) {
        if (!/^app\.(account|backup|recovery|settings|install)\./.test(k)) continue;
        expect(`${lang} ${k}: ${v}`).not.toMatch(/Face ID|Touch ID|Windows Hello/);
      }
      for (const word of ['faceId', 'touchId', 'screenLock', 'windowsHello'])
        expect(d[`app.account.use.${word}`], `${lang} ${word}`).toBeUndefined();
      for (const k of [
        'app.account.use.deviceLock',
        'app.account.how.deviceLock',
        'app.account.deviceLock.hint',
        'app.account.deviceLock.hintComputer',
      ])
        expect(d[k], `${lang} ${k}`).toBeTruthy();
    }
  });
});

describe('the backup file is one way back, not the only one', () => {
  const ONLY = /only way|einzige Weg|única forma|seul moyen|唯一の手段/;
  it('the backup step and the help page say so in all five languages', () => {
    for (const [lang, d] of Object.entries(APP)) {
      expect(d['app.backup.onlyWay'], lang).toBeUndefined();
      expect(d['app.backup.oneWay'], lang).toBeTruthy();
      expect(d['app.backup.oneWay'], lang).not.toMatch(ONLY);
      for (const k of [
        'app.backup.lock.text',
        'app.backup.lock.orFile',
        'app.backup.lock.savedTitle',
        'app.backup.lock.savedText',
        'app.backup.lock.saving',
      ])
        expect(d[k], `${lang} ${k}`).toBeTruthy();
    }
    for (const [lang, d] of Object.entries(SITE)) expect(d['m.help.backup.1a'], lang).not.toMatch(ONLY);
    expect(appEn['app.backup.oneWay']).toContain('One of the ways to get your records back');
  });
});

describe('the recovery sheet', () => {
  it('is explained in one line where it is offered on the restore page, in all five languages', () => {
    for (const [lang, d] of Object.entries(APP)) {
      expect(d['app.recovery.restore.what'], lang).toBeTruthy();
      // The printed sheet says where the button is: under "Other ways".
      expect(d['app.recovery.sheet.how'], lang).toContain(d['app.account.restore.otherWays']);
    }
  });

  it('is asked for on Home once, after the third record, never per day', () => {
    const tr = makeTranslator('en', appEn);
    const saved = (more: Partial<Extract<AccountState, { kind: 'saved' }>>): AccountState => ({
      kind: 'saved',
      savedAt: new Date().toISOString(),
      counted: true,
      locked: false,
      slots: [],
      unknownSlots: [],
      deletedHere: [],
      staleDevices: [],
      devices: [],
      faceIdHere: true,
      reverify: false,
      ...more,
    });
    const acts = {
      fix: () => undefined,
      file: () => undefined,
      settings: () => undefined,
      retry: () => undefined,
      gone: () => undefined,
      ok: () => undefined,
      keep: () => undefined,
      sheet: () => undefined,
      later: () => undefined,
      reverify: () => undefined,
    };
    const facts = { unbacked: false, deviceOnly: 0 };
    expect(accountLine(saved({}), facts, tr, acts)).toBeUndefined();
    expect(accountLine(saved({ sheetReminder: true }), facts, tr, acts)?.mark).toBe('sheet-reminder');
  });
});

describe('one prompt after a seal', () => {
  it('the "Keep your records safe" sheet never opens by itself inside a flow that seals records', () => {
    for (const p of ['/new', '/documents/new', '/records/import', '/backup', '/restore', '/settings'])
      expect(QUIET.test(p), p).toBe(true);
    for (const p of ['/records', '/record/VEIL-1', '/']) expect(QUIET.test(p), p).toBe(false);
  });
});
