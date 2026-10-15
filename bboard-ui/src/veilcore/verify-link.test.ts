// The check page's heading and footer say plainly what was and wasn't checked (round 3).
import { describe, expect, it } from 'vitest';
import { checkedSummary, verifyHeading } from './verify-link';

describe('the check page footer', () => {
  it('never says nothing was checked when a signature or the batch path was', () => {
    expect(checkedSummary({ bound: false, proofChecked: false, signaturesChecked: 1 })).toBe(
      'Checked in this browser: one signature about it. Everything else is the VeilCore registry’s report. This link names no fingerprint, so those checks used the registry’s own and nothing is ticked.',
    );
    expect(checkedSummary({ bound: true, proofChecked: true, signaturesChecked: 2 })).toBe(
      'Checked in this browser: the link’s fingerprint matches the one the registry reports, the record is in its batch and 2 signatures about it. Everything else is the VeilCore registry’s report.',
    );
    for (const c of [
      { bound: true, proofChecked: false, signaturesChecked: 0 },
      { bound: false, proofChecked: true, signaturesChecked: 0 },
      { bound: false, proofChecked: false, signaturesChecked: 3 },
    ]) {
      expect(checkedSummary(c)).not.toMatch(/Nothing on this page/);
    }
  });

  it('says nothing was checked only when nothing was', () => {
    expect(checkedSummary({ bound: false, proofChecked: false, signaturesChecked: 0 })).toBe(
      'Nothing on this page could be checked in this browser: it is all the VeilCore registry’s report.',
    );
  });
});

describe('the check page heading', () => {
  it('is a plain sentence, not capitals and jargon', () => {
    const all = [
      verifyHeading({ sealed: false, bound: false, proof: 'none' }),
      verifyHeading({ sealed: true, bound: false, proof: 'none' }),
      verifyHeading({ sealed: true, bound: true, proof: 'checking' }),
      verifyHeading({ sealed: true, bound: true, proof: 'anchor-reported' }),
      verifyHeading({ sealed: true, bound: true, proof: 'pending' }),
      verifyHeading({ sealed: true, bound: true, proof: 'none' }),
    ];
    expect(all[5]).toBe('No date stamp yet');
    expect(all[4]).toBe('In a batch, no date stamp yet');
    expect(all[3]).toBe('Date stamp reported by the registry, not checked here');
    for (const h of all) {
      expect(h).not.toMatch(/FINGERPRINT ON FILE|not in a batch this page could check|·/i);
      expect(h[0]).toBe(h[0].toUpperCase());
      expect(h.slice(1)).not.toMatch(/[A-Z]{3,}/);
    }
  });
});
