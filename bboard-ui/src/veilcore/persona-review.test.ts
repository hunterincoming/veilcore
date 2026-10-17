// The persona review (17 Oct): what a lab sends says what kind of report it is, a delivery
// says who sent it, and a lab's arrival date starts at today.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  lockReport,
  openReport,
  openReportWithKind,
  padReport,
  REPORT_KINDS,
  resultRecipientFor,
  unpadReport,
  unpadReportWithKind,
} from './lab-results';
import { offerPlaintext } from './transfers';
import { offerFieldsOf, type StrainRecord } from './records';
import { homeStatusLine } from '../components/flow/plant-status-words';
import { arrivalStart, todayLocal } from '../components/ClaimTransfer';

const SECRET = '3f'.repeat(32);
const report = new TextEncoder().encode('%PDF-1.7 a virus panel');

describe('a lab report says what kind it is, inside the locked file', () => {
  it('round-trips each kind, and the bytes and what the lab signs stay the report’s own', async () => {
    const lock = await resultRecipientFor(SECRET, 'TR-00000001');
    for (const kind of REPORT_KINDS) {
      const locked = await lockReport(report, lock, kind);
      const opened = await openReportWithKind(locked, SECRET, 'TR-00000001');
      expect(opened.kind).toBe(kind);
      expect([...opened.bytes]).toEqual([...report]);
      expect([...(await openReport(locked, SECRET, 'TR-00000001'))]).toEqual([...report]);
    }
  });
  it('a report sent before kinds has none, and opens as before', async () => {
    const locked = await lockReport(report, await resultRecipientFor(SECRET));
    const opened = await openReportWithKind(locked, SECRET);
    expect(opened.kind).toBeUndefined();
    expect([...opened.bytes]).toEqual([...report]);
  });
  it('pads to the same buckets, and a file that only looks padded is its own', () => {
    for (const n of [0, 100, 1006, 1007, 5000]) {
      const bytes = new Uint8Array(n).fill(7);
      expect(padReport(bytes, 'dna').length % 1024).toBe(0);
      expect([...unpadReport(padReport(bytes, 'pathogen'))]).toEqual([...bytes]);
    }
    const padded = padReport(report, 'other');
    const odd = padded.slice();
    odd[odd.length - 17] = 9; // a kind byte this app doesn't know
    expect(unpadReportWithKind(odd)).toEqual({ bytes: odd });
  });
});

describe('who a delivery is from', () => {
  const record = {
    id: 'VEIL-1',
    strainName: 'Harbour Mist',
    bredBy: 'Test Breeder',
    dateCreated: '2026-10-01',
  } as unknown as StrainRecord;
  it('goes sealed in the offer, as the sender typed it, and the receiver reads it back', () => {
    const offer = offerPlaintext(record, { from: 'Hilltop Seeds' });
    expect(offer.from).toBe('Hilltop Seeds');
    expect(offerFieldsOf(offer).from).toBe('Hilltop Seeds');
    expect(offerPlaintext(record, {}).from).toBeUndefined();
  });
  it('Home says the sender’s name, not the sender’s record id, when the offer gave one', () => {
    const r = { receivedFrom: 'VEIL-SOURCE', loggedAt: 0, senderName: 'Hilltop Seeds' };
    expect(homeStatusLine(r, undefined, { realChain: false }).text).toBe('From Hilltop Seeds');
    expect(homeStatusLine({ ...r, senderName: undefined }, undefined, { realChain: false }).text).toBe(
      'Received from VEIL-SOURCE',
    );
  });
});

describe('a lab’s receipt', () => {
  it('starts "Arrived on" at today, in the lab’s own time zone', () => {
    const now = new Date(2026, 9, 17, 23, 30);
    expect(todayLocal(now)).toBe('2026-10-17');
    expect(arrivalStart({}, {}, now).arrivedOn).toBe('2026-10-17');
    expect(arrivalStart({}, { arrivedOn: '2026-10-15' }, now).arrivedOn).toBe('2026-10-15');
    // Only where arrival details can be recorded (sealed sample details): otherwise empty.
    expect(arrivalStart({}, {}).arrivedOn).toBe('');
  });
});
