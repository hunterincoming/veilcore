// The paste box tells apart the four things people get sent, and never leaves the site.
import { describe, expect, it } from 'vitest';
import { recognise } from './paste';

describe('recognise', () => {
  it('delivery codes, with or without the claim part', () => {
    expect(recognise(' TR-0A1B2C3D.9f8e7d6c ')).toEqual({ kind: 'delivery', code: 'TR-0A1B2C3D.9f8e7d6c' });
    expect(recognise('tr-0a1b2c3d').kind).toBe('delivery');
  });
  it('a proof request is the 64-character challenge', () => {
    expect(recognise(`0x${'AB'.repeat(32)}`)).toEqual({ kind: 'prove-request', challenge: 'ab'.repeat(32) });
  });
  it('record links and agreement links keep only their path, whatever host they were written with', () => {
    expect(recognise('https://evil.example/verify/VEIL-1?chain=preprod&anchorTx=ab#x')).toEqual({
      kind: 'record-link',
      path: '/verify/VEIL-1?chain=preprod&anchorTx=ab#x',
    });
    expect(recognise('veilcore.org/license/LIC-9/sign').kind).toBe('agreement-to-sign'); // copied without https://
    expect(recognise('https://veilcore.org/license/LIC-9/sign')).toEqual({
      kind: 'agreement-to-sign',
      path: '/license/LIC-9/sign',
    });
  });
  it('anything else is unknown, including the example record and empty input', () => {
    for (const v of [
      '',
      '   ',
      'hello',
      'https://veilcore.org/verify/example',
      'https://veilcore.org/records',
      'TR-123',
    ]) {
      expect(recognise(v).kind).toBe('unknown');
    }
  });
});
