// The proof code QR text a lab scans (proof-code-qr.ts): made, read back, and every wrong reading
// refused rather than guessed.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { PROOF_QR_PREFIX, proofCheck, proofCodeQrText, readProofCode } from './proof-code-qr';
import { proofCodeOf } from './lab-result-draft';
import { labelLink } from '../components/labels/label-layouts';

const A = '99ae0c1f7b2d4e6a8c0e2f4a6b8d0f1e3a5c7e9b1d3f5a7c9e1b3d5f7a9c6f56';
const B = 'b2'.repeat(32);

describe('the QR text', () => {
  it('uses the standard CRC-16/CCITT-FALSE (its check value for "123456789" is 29B1)', () => {
    expect(proofCheck('123456789')).toBe('29B1');
  });

  it('is VCP, the code in upper case and 4 check characters: letters and digits only', () => {
    const q = proofCodeQrText(A);
    expect(q).toHaveLength(71);
    expect(q.startsWith(PROOF_QR_PREFIX)).toBe(true);
    expect(q.slice(3, 67)).toBe(A.toUpperCase());
    expect(q).toMatch(/^[0-9A-Z]+$/);
    expect(proofCodeQrText(A.toUpperCase())).toBe(q);
  });

  it('carries the proof code and its check, nothing else', () => {
    expect(proofCodeQrText(A)).toBe(`VCP${A.toUpperCase()}${proofCheck(A.toUpperCase())}`);
  });

  it('is refused for anything but a proof code', () => {
    for (const bad of ['', A.slice(1), `${A}0`, A.replace('a', 'g'), `https://veilcore.org/verify/VEIL-1?fp=${A}`])
      expect(() => proofCodeQrText(bad)).toThrow();
  });
});

describe('reading what was scanned, typed or pasted', () => {
  it('reads the QR text back to the plain code, in any case, with what a scanner adds around it', () => {
    const q = proofCodeQrText(A);
    expect(readProofCode(q)).toEqual({ ok: true, code: A, from: 'qr' });
    expect(readProofCode(q.toLowerCase())).toEqual({ ok: true, code: A, from: 'qr' });
    expect(readProofCode(`\u0002 ${q}\r\n`)).toEqual({ ok: true, code: A, from: 'qr' });
  });

  it('refuses QR text whose check fails: any one character changed, dropped or doubled', () => {
    const q = proofCodeQrText(A);
    for (let i = 3; i < q.length; i++) {
      const c = q[i] === '0' ? '1' : '0';
      expect(readProofCode(q.slice(0, i) + c + q.slice(i + 1))).toEqual({ ok: false, why: 'check' });
      expect(readProofCode(q.slice(0, i) + q.slice(i + 1))).toEqual({ ok: false, why: 'check' });
      expect(readProofCode(q.slice(0, i) + q[i] + q.slice(i))).toEqual({ ok: false, why: 'check' });
    }
  });

  it('refuses what a scanner on a French keyboard types (digits shifted, a and q swapped)', () => {
    const q = proofCodeQrText(A);
    const azerty = q.replace(/[0-9]/g, (d) => 'àé"\'(-è_çà'[Number(d)] ?? d).replace(/A/g, 'Q');
    expect(readProofCode(azerty)).toEqual({ ok: false, why: 'check' });
  });

  it('keeps reading a bare code and a check link, as before', () => {
    expect(readProofCode(A.toUpperCase())).toEqual({ ok: true, code: A, from: 'plain' });
    expect(readProofCode(`https://veilcore.org/verify/VEIL-1?fp=${A}`)).toEqual({ ok: true, code: A, from: 'link' });
    expect(readProofCode(`/verify/VEIL-1?fp=${A}`)).toEqual({ ok: true, code: A, from: 'link' });
  });

  it('reads a label printed with the name: the fp, not the name’s salt', () => {
    const link = labelLink(
      { id: 'VEIL-3F9A0000C21B', recordFingerprint: A, strainName: 'Blue Dream', nameSalt: B },
      true,
    );
    expect(link).toContain(B);
    expect(readProofCode(link)).toEqual({ ok: true, code: A, from: 'link' });
    expect(proofCodeOf(link)).toBe(A);
  });

  it('refuses anything else, and says so', () => {
    expect(readProofCode('')).toEqual({ ok: false, why: 'empty' });
    expect(readProofCode('  \n')).toEqual({ ok: false, why: 'empty' });
    for (const other of [
      'VEIL-3F9A0000C21B',
      '982 000123456789',
      `TR-0123ABCD.${A}`,
      `${A},${B}`,
      `code ${A}`,
      `https://x.example/${A}/${B}`,
      A.slice(0, 63),
    ])
      expect(readProofCode(other)).toEqual({ ok: false, why: 'notCode' });
  });

  it('is what the result form and the spreadsheet read (proofCodeOf)', () => {
    expect(proofCodeOf(proofCodeQrText(A))).toBe(A);
    const q = proofCodeQrText(A);
    expect(proofCodeOf(`${q.slice(0, -1)}${q.endsWith('0') ? '1' : '0'}`)).toBeUndefined();
  });
});
