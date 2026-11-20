// Scan, don't type (docs/scan-and-labels.md): what a scan or a stick reader puts in a box, the
// links a scan may open, NFC records, camera errors, and that the bundled reader is pinned, served
// from this site and fetched only when needed.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkPathOf,
  cleanReading,
  isRecordId,
  readerKeyDown,
  BUNDLED_FORMATS,
  NATIVE_FORMATS,
  SCAN_MAX,
} from './scan-text';
import { textOfRecords } from './nfc';
import { cameraProblem } from './ScanDialog';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.join(HERE, rel), 'utf8');

describe('a stick reader typing into a box', () => {
  it('drops what readers add around a number: CR, LF, Tab, STX/ETX, spaces at the ends', () => {
    expect(cleanReading('982000123456789\r\n')).toBe('982000123456789');
    expect(cleanReading('\u0002 982000123456789\u0003\t')).toBe('982000123456789');
    expect(cleanReading('  840 003 123 456 789 ')).toBe('840 003 123 456 789');
    expect(cleanReading('LOT\u001d123')).toBe('LOT 123');
    expect(cleanReading('x'.repeat(SCAN_MAX + 50))).toHaveLength(SCAN_MAX);
  });

  it('Enter after a burst is trimmed and never submits; Tab is trimmed and moves on; other keys are left alone', () => {
    const run = (key: string, value: string) => {
      let prevented = false;
      let set: string | undefined;
      const handled = readerKeyDown({ key, preventDefault: () => (prevented = true) }, value, (v) => (set = v));
      return { handled, prevented, set };
    };
    expect(run('Enter', '982000123456789 ')).toEqual({ handled: true, prevented: true, set: '982000123456789' });
    expect(run('Enter', '982000123456789')).toEqual({ handled: true, prevented: true, set: undefined });
    expect(run('Tab', ' 123 ')).toEqual({ handled: true, prevented: false, set: '123' });
    expect(run('9', '98')).toEqual({ handled: false, prevented: false, set: undefined });
  });
});

describe('a scanned check link', () => {
  const fp = 'ab'.repeat(32);
  it('opens only its path on this site, whatever host the code names', () => {
    expect(checkPathOf(`https://veilcore.org/verify/VEIL-0001?fp=${fp}`)).toBe(`/verify/VEIL-0001?fp=${fp}`);
    expect(checkPathOf(`https://evil.example/verify/VEIL-0001?fp=${fp}#n=QQ`)).toBe(`/verify/VEIL-0001?fp=${fp}#n=QQ`);
    expect(checkPathOf(`veilcore.org/verify/VEIL-0001`)).toBe('/verify/VEIL-0001');
  });
  it('is nothing for anything else: an ID, a lot number, another page, the example', () => {
    for (const v of [
      'VEIL-0001',
      '982000123456789',
      'https://veilcore.org/records',
      'https://x.org/verify/example',
      'javascript:alert(1)',
    ])
      expect(checkPathOf(v), v).toBeUndefined();
  });
});

describe('/verify takes VeilCore labels only (never a look-up by tag number)', () => {
  it('a check link or a record ID, and nothing else', () => {
    const takes = (v: string) => !!checkPathOf(v) || isRecordId(v);
    expect(takes(`https://veilcore.org/verify/VEIL-0001?fp=${'ab'.repeat(32)}`)).toBe(true);
    expect(takes('VEIL-3F9A0000')).toBe(true);
    for (const v of ['982000123456789', '840003123456789', 'LOT 123', 'https://veilcore.org/records'])
      expect(takes(v), v).toBe(false);
  });
  it('the page passes only that to the window', () => {
    expect(read('SiteScan.tsx')).toMatch(/accept=\{\(text\) => !!checkPathOf\(text\) \|\| isRecordId\(text\)\}/);
  });
});

describe('an NFC tag', () => {
  const enc = (s: string) => new DataView(new TextEncoder().encode(s).buffer);
  it('gives its first text or link record, cleaned', () => {
    expect(
      textOfRecords([
        { recordType: 'mime' },
        { recordType: 'text', encoding: 'utf-8', data: enc(' 982000123456789\n') },
      ]),
    ).toBe('982000123456789');
    expect(textOfRecords([{ recordType: 'url', data: enc('https://veilcore.org/verify/VEIL-0001') }])).toBe(
      'https://veilcore.org/verify/VEIL-0001',
    );
  });
  it('gives nothing for a tag with neither', () => {
    expect(textOfRecords([{ recordType: 'empty' }, { recordType: 'mime', data: enc('x') }])).toBeUndefined();
    expect(textOfRecords([{ recordType: 'text', data: enc('   ') }])).toBeUndefined();
  });
});

describe('the camera', () => {
  it('says why it could not open, and every message offers typing instead', () => {
    expect(cameraProblem({ name: 'NotAllowedError' })).toBe('denied');
    expect(cameraProblem({ name: 'NotFoundError' })).toBe('noCamera');
    expect(cameraProblem({ name: 'NotReadableError' })).toBe('noCamera');
    expect(cameraProblem(new Error('x'))).toBe('failed');
  });
});

describe('the code reader', () => {
  it('reads the same formats either way', () => {
    expect(NATIVE_FORMATS).toHaveLength(BUNDLED_FORMATS.length);
    expect(NATIVE_FORMATS).toContain('qr_code');
    expect(BUNDLED_FORMATS).toContain('QRCode');
  });

  it('is pinned exactly, and its WebAssembly is this site’s own file, never the package’s CDN', () => {
    const pkg = JSON.parse(read('../../package.json')) as { dependencies: Record<string, string> };
    expect(pkg.dependencies['zxing-wasm']).toMatch(/^\d+\.\d+\.\d+$/);
    const src = read('decoder.ts');
    expect(src).toMatch(/import\('zxing-wasm\/reader\/zxing_reader\.wasm\?url'\)/);
    expect(src).toMatch(/locateFile: \(path: string, prefix: string\) => \(path\.endsWith\('\.wasm'\) \? wasmUrl/);
    expect(src).not.toMatch(/jsdelivr|unpkg|https?:\/\//);
  });

  it('is fetched only when someone presses Scan: no page imports it, or the window, directly', () => {
    const files = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
        const p = path.join(dir, d.name);
        return d.isDirectory() ? files(p) : /\.tsx?$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
      });
    const offenders = files(path.join(HERE, '..')).filter((f) => {
      const src = fs.readFileSync(f, 'utf8');
      return (
        /^import [^;]*from ['"][^'"]*(zxing-wasm|scan\/decoder|scan\/ScanDialog|\.\/decoder|\.\/ScanDialog)['"]/m.test(
          src,
        ) && !/scan[/\\](ScanDialog|SiteScan)\.tsx$/.test(f)
      );
    });
    expect(offenders.map((f) => path.relative(HERE, f))).toEqual([]);
    expect(read('ScanButton.tsx')).toMatch(/lazy\(\(\) => import\('\.\/ScanDialog'\)\)/);
    expect(read('../components/site/Founders.tsx')).toMatch(
      /React\.lazy\(\(\) => import\('\.\.\/\.\.\/scan\/SiteScan'\)\)/,
    );
  });
});
