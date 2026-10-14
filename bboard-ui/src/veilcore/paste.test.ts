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
  it('a prove link, or its id alone, opens our own /prove page, whatever host it names', () => {
    const id = `PR-${'0A'.repeat(16)}`;
    const want = { kind: 'prove-link', path: `/prove/${id}` };
    expect(recognise(`https://evil.example/prove/${id.toLowerCase()}?x=1`)).toEqual(want);
    expect(recognise(`veilcore.org/prove/${id}`)).toEqual(want);
    expect(recognise(` ${id} `)).toEqual(want);
    expect(recognise('https://veilcore.org/prove/PR-123').kind).toBe('unknown');
  });
  it('a prove link keeps its answer token (#t=, 22 characters, case kept) and nothing else after the id', () => {
    const id = `PR-${'0A'.repeat(16)}`;
    const token = 'Abcdefghijklmnopqrstu_';
    expect(token).toHaveLength(22);
    expect(recognise(`https://veilcore.org/prove/${id.toLowerCase()}#t=${token}`)).toEqual({
      kind: 'prove-link',
      path: `/prove/${id}#t=${token}`,
    });
    // Wrapped across lines by an email client: still one link with its token.
    expect(recognise(`veilcore.org/prove/${id}#t=${token.slice(0, 10)}\n${token.slice(10)}`)).toEqual({
      kind: 'prove-link',
      path: `/prove/${id}#t=${token}`,
    });
    // A token of the wrong length, or anything else in the fragment, is dropped, not passed on.
    expect(recognise(`https://veilcore.org/prove/${id}#t=${token.slice(1)}`)).toEqual({
      kind: 'prove-link',
      path: `/prove/${id}`,
    });
    expect(recognise(`https://veilcore.org/prove/${id}#t=${token}&x=<script>`)).toEqual({
      kind: 'prove-link',
      path: `/prove/${id}`,
    });
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
      'VEIL-',
      'VEIL-1',
    ]) {
      expect(recognise(v).kind).toBe('unknown');
    }
  });
  it('a cut-off or garbled delivery code is told apart, not opened', () => {
    for (const v of ['TR-123', 'TR-0A1B2C3D.', 'tr-0a1b2c3d.9f8e.age1short', 'TR-0A1B2C3Dx']) {
      expect(recognise(v)).toEqual({ kind: 'delivery-cut-off' });
    }
  });
  it('codes and links wrapped across lines by email still work', () => {
    const lock = `age1${'q'.repeat(58)}`;
    const code = `TR-0A1B2C3D.9f8e7d6c.${lock}`;
    expect(recognise(`TR-0A1B2C3D.9f8e7d6c.age1${'q'.repeat(30)}\n${'q'.repeat(28)}`)).toEqual({
      kind: 'delivery',
      code,
    });
    expect(recognise(`  TR-0A1B2C3D .\t9f8e7d6c `)).toEqual({ kind: 'delivery', code: 'TR-0A1B2C3D.9f8e7d6c' });
    const fp = 'ab'.repeat(32);
    expect(recognise(`https://veilcore.org/verify/VEIL-1?fp=${fp.slice(0, 40)}\r\n${fp.slice(40)}`)).toEqual({
      kind: 'record-link',
      path: `/verify/VEIL-1?fp=${fp}`,
    });
    expect(recognise(`PR-${'0A'.repeat(8)}\n${'0A'.repeat(8)}`)).toEqual({
      kind: 'prove-link',
      path: `/prove/PR-${'0A'.repeat(16)}`,
    });
  });
  it('a record ID on its own opens its check page, in capitals', () => {
    const id = `VEIL-${'c7'.repeat(16)}`;
    expect(recognise(id)).toEqual({ kind: 'record-link', path: `/verify/${id.toUpperCase()}` });
    expect(recognise(` ${id.toUpperCase()}\n`)).toEqual({ kind: 'record-link', path: `/verify/${id.toUpperCase()}` });
    expect(recognise('veil-a1b2c3')).toEqual({ kind: 'record-link', path: '/verify/VEIL-A1B2C3' });
    // Nothing but the ID: no path, query or other host can ride along.
    expect(recognise('VEIL-ABCD/../../x').kind).toBe('unknown');
  });
});
