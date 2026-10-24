// Handing a license on (hand-on.ts): the licensor's record after approval, the steps each
// side sees, and which signed messages count.
import { describe, expect, it } from 'vitest';
import { afterHandOn, handOnAsked, handOnOffered, issuerHandOnSteps, newHolderSteps } from './hand-on';
import { wellFormed } from './deal';
import { handOnPath, handOnRecordFromHash } from './license-invites';
import type { OnChainLicense } from './licenses';

const H = (c: string) => c.repeat(64);
const live: OnChainLicense = {
  inviteId: 'LI-OLD',
  acceptToken: 'a',
  issuerToken: 'i',
  identity: H('1'),
  label: 'First Grower',
  invitedAt: 1,
  issuerNonce: H('2'),
  partySecret: H('3'),
  termsSentAt: 5,
  commitment: H('4'),
  issuerRecord: H('5'),
  licenseeNonce: H('6'),
  issueTx: H('7'),
  issuedAt: 2,
  activateTx: H('8'),
  activatedAt: 3,
  handOn: {
    inviteId: 'LI-NEW',
    acceptToken: 'na',
    issuerToken: 'ni',
    label: 'Second Grower',
    invitedAt: 10,
    commitHash: H('9'),
    issuerNonce: H('a'),
    partySecret: H('b'),
    commitment: H('c'),
    licenseeNonce: H('d'),
    termsSentAt: 11,
    askedAt: 12,
  },
};

describe('afterHandOn', () => {
  it('makes the new holder’s deal the license’s, and keeps the old one', () => {
    const next = afterHandOn(live, H('e'), 20);
    expect(next.commitment).toBe(H('c'));
    expect(next.issuerRecord).toBe(H('5')); // a moved license keeps its key
    expect(next.licenseeNonce).toBe(H('d'));
    expect(next.partySecret).toBe(H('b'));
    expect(next.inviteId).toBe('LI-NEW');
    expect(next.issuerToken).toBe('ni');
    expect(next.label).toBe('Second Grower');
    expect(next.activateTx).toBe(H('e'));
    expect(next.activeSeenAt).toBe(20);
    expect(next.handOn).toBeUndefined();
    expect(next.previous).toHaveLength(1);
    expect(next.previous![0].commitment).toBe(H('4'));
    expect(next.previous![0].partySecret).toBe(H('3'));
    expect(next.previous![0]).not.toHaveProperty('handOn');
  });

  it('chains: a second hand-on keeps both earlier holders, oldest first', () => {
    const once = afterHandOn(live, H('e'), 20);
    const twice = afterHandOn(
      { ...once, handOn: { ...live.handOn!, inviteId: 'LI-3', commitment: H('f'), label: 'Third' } },
      undefined,
      30,
    );
    expect(twice.previous!.map((p) => p.label)).toEqual(['First Grower', 'Second Grower']);
    expect(twice.activateTx).toBeUndefined();
    expect(twice.activeSeenAt).toBe(30);
  });

  it('refuses before the new holder has answered', () => {
    expect(() => afterHandOn({ ...live, handOn: { ...live.handOn!, commitment: undefined } }, H('e'), 1)).toThrow();
    expect(() => afterHandOn({ ...live, handOn: undefined }, H('e'), 1)).toThrow();
  });
});

describe('steps', () => {
  it('licensor: link, code, they agree, holder, approve', () => {
    const now = (s: ReturnType<typeof issuerHandOnSteps>) => s.findIndex((x) => x.state === 'now');
    const no = { proposed: false, agreed: false };
    expect(now(issuerHandOnSteps(undefined, no))).toBe(0);
    expect(now(issuerHandOnSteps({ ...live.handOn!, commitment: undefined, askedAt: undefined }, no))).toBe(1);
    expect(now(issuerHandOnSteps(live.handOn, no))).toBe(2);
    // Proposed by the holder but not yet agreed by the new one: still waiting on the agreement.
    expect(now(issuerHandOnSteps(live.handOn, { proposed: true, agreed: false }))).toBe(2);
    expect(now(issuerHandOnSteps(live.handOn, { proposed: false, agreed: true }))).toBe(3);
    expect(now(issuerHandOnSteps(live.handOn, { proposed: true, agreed: true }))).toBe(4);
  });
  it('new holder: accept, backup, code, agree, wait', () => {
    const now = (s: ReturnType<typeof newHolderSteps>) => s.findIndex((x) => x.state === 'now');
    expect(now(newHolderSteps({ accepted: false, backedUp: false, agreed: false, live: false }))).toBe(0);
    expect(now(newHolderSteps({ accepted: true, backedUp: false, agreed: false, live: false }))).toBe(1);
    expect(now(newHolderSteps({ accepted: true, backedUp: true, agreed: false, live: false }))).toBe(2);
    expect(now(newHolderSteps({ accepted: true, backedUp: true, agreed: true, live: false }))).toBe(4);
    expect(now(newHolderSteps({ accepted: true, backedUp: true, agreed: true, live: true }))).toBe(-1);
  });
});

describe('which messages count', () => {
  type E = { type: string; mine: boolean; from?: string; at: number; newLicense?: string; to?: string };
  const e = (x: Record<string, unknown>) => ({ mine: false, at: 1, ...x }) as E;
  it('a hand-on offer only from the licensor, latest first', () => {
    const entries = [
      e({ type: 'handon', from: 'issuer', newLicense: H('1'), to: 'A', at: 1 }),
      e({ type: 'handon', from: 'issuer', newLicense: H('2'), to: 'B', at: 3 }),
      e({ type: 'handon', from: 'licensee', newLicense: H('3'), to: 'Mallory', at: 9 }),
      e({ type: 'handon', from: 'issuer', newLicense: H('4'), to: 'Mine', at: 10, mine: true }),
    ];
    expect(handOnOffered(entries)?.newLicense).toBe(H('2'));
    expect(handOnOffered([])).toBeUndefined();
  });
  it('a hand-on the licensor called off is no longer offered', () => {
    const on = e({ type: 'handon', from: 'issuer', newLicense: H('2'), to: 'B', at: 3 });
    const off = e({ type: 'handon-off', from: 'issuer', newLicense: H('2'), at: 4 });
    expect(handOnOffered([on, off])).toBeUndefined();
    // Called off by someone else: ignored.
    expect(handOnOffered([on, { ...off, from: 'licensee' }])?.newLicense).toBe(H('2'));
    // A new hand-on after the call-off is offered again.
    const again = e({ type: 'handon', from: 'issuer', newLicense: H('5'), to: 'C', at: 6 });
    expect(handOnOffered([on, off, again])?.newLicense).toBe(H('5'));
  });
  it('a request only from the holder, and only after the last hand-on began', () => {
    const entries = [
      e({ type: 'handon-ask', from: 'licensee', to: 'Second Grower', note: 'Selling the farm', at: 5 }),
      e({ type: 'handon-ask', from: 'issuer', to: 'Not from them', at: 9 }),
    ];
    expect(handOnAsked(entries)).toEqual({ to: 'Second Grower', note: 'Selling the farm', at: 5 });
    expect(handOnAsked(entries, 6)).toBeUndefined();
    expect(handOnAsked(entries, 4)?.to).toBe('Second Grower');
  });
  it('the signed shapes', () => {
    const at = Date.parse('2026-10-23');
    expect(wellFormed({ type: 'handon', from: 'issuer', at, newLicense: H('a'), to: 'Second Grower' }, at)).toBe(true);
    expect(wellFormed({ type: 'handon', from: 'issuer', at, newLicense: 'zz', to: 'X' }, at)).toBe(false);
    expect(wellFormed({ type: 'handon', from: 'issuer', at, newLicense: H('a'), to: '' }, at)).toBe(false);
    expect(wellFormed({ type: 'handon-ask', from: 'licensee', at, to: 'Second Grower' }, at)).toBe(true);
    expect(wellFormed({ type: 'handon-off', from: 'issuer', at, newLicense: H('a') }, at)).toBe(true);
    expect(wellFormed({ type: 'handon-off', from: 'issuer', at, newLicense: 'zz' }, at)).toBe(false);
    expect(wellFormed({ type: 'handon-ask', from: 'licensee', at, to: 'X', note: { not: 'text' } }, at)).toBe(false);
  });
});

describe('the hand-on link', () => {
  it('carries the issuing record in the fragment, and reads it back', () => {
    const p = handOnPath('LI-0123456789ABCDEF0123456789ABCDEF', 'tok', H('5'));
    expect(p).toBe(`/license-invite/LI-0123456789ABCDEF0123456789ABCDEF#t=tok&h=${H('5')}`);
    expect(handOnRecordFromHash(p.slice(p.indexOf('#')))).toBe(H('5'));
    expect(handOnRecordFromHash('#t=tok')).toBeUndefined();
    expect(handOnRecordFromHash('#t=tok&h=xyz')).toBeUndefined();
  });
});
