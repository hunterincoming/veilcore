// The disclosure receipt follows the contracts. This reads contract/src/*.compact, finds every
// disclose() each exported circuit reaches (through the helper circuits it calls, and the
// Schnorr module), and fails when that set differs from onchain-receipt.ts. Change a circuit's
// disclosures and the receipt must change with it.
//
// It also checks that every circuit a screen can call has a receipt, that every fact has its
// words in every language, and that each screen that sends a step shows the receipt for it.
// Run: npx vitest run src/veilcore/onchain-receipt.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEDGER_FACTS, RECEIPTS, STAYS, receiptFacts, type ReceiptCircuit } from './onchain-receipt';
import { BROWSER_CIRCUITS, CLAIMS_BROWSER_CIRCUITS } from './chain/config';
import { appEn } from '../i18n/app/en';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = path.resolve(HERE, '../../../contract/src');
const SRC = path.resolve(HERE, '..');

// ---- a small reader for Compact: enough to find circuits, their bodies and disclose() calls ----

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

/** The index of the bracket that closes the one at `i`. */
const closing = (s: string, i: number): number => {
  const open = s[i];
  const close = open === '(' ? ')' : '}';
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === open) depth++;
    else if (s[j] === close && --depth === 0) return j;
  }
  throw new Error(`unbalanced ${open} at ${i}`);
};

type Circuit = { exported: boolean; body: string };

export const circuitsOf = (src: string, prefix = ''): Record<string, Circuit> => {
  const s = stripComments(src);
  const out: Record<string, Circuit> = {};
  const re = /(export\s+)?(?:pure\s+)?circuit\s+(\w+)\s*(?:<[^>]*>)?\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const params = closing(s, m.index + m[0].length - 1);
    const brace = s.indexOf('{', params);
    const semi = s.indexOf(';', params);
    if (brace === -1 || (semi !== -1 && semi < brace)) continue; // a declaration without a body
    const end = closing(s, brace);
    out[prefix + m[2]] = { exported: !!m[1], body: s.slice(brace + 1, end) };
    re.lastIndex = end;
  }
  return out;
};

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** The argument of every disclose() in a body, whitespace collapsed. */
export const disclosesIn = (body: string): string[] => {
  const out: string[] = [];
  const re = /\bdisclose\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const open = m.index + m[0].length - 1;
    out.push(norm(body.slice(open + 1, closing(body, open))));
  }
  return out;
};

/** Every disclose() a circuit reaches, its own and those of the circuits it calls. */
const reach = (all: Record<string, Circuit>, name: string, seen = new Set<string>()): string[] => {
  if (seen.has(name)) return [];
  seen.add(name);
  const c = all[name];
  const out = disclosesIn(c.body);
  for (const other of Object.keys(all))
    if (other !== name && new RegExp(`\\b${other}\\s*(<[^>]*>)?\\s*\\(`).test(c.body))
      out.push(...reach(all, other, seen));
  return out;
};

const read = (f: string) => fs.readFileSync(path.join(CONTRACT, f), 'utf8');
const SCHNORR = circuitsOf(read('schnorr.compact'), 'Schnorr_');
const CONTRACTS = {
  veilcore: { ...SCHNORR, ...circuitsOf(read('veilcore.compact')) },
  claims: { ...SCHNORR, ...circuitsOf(read('veilcore-claims.compact')) },
};

/** circuit -> its disclosed expressions, sorted, for every exported circuit that discloses anything. */
const fromSources = (): Record<string, { contract: string; disclosed: string[] }> => {
  const out: Record<string, { contract: string; disclosed: string[] }> = {};
  for (const [contract, all] of Object.entries(CONTRACTS))
    for (const [name, c] of Object.entries(all)) {
      if (!c.exported || name.startsWith('Schnorr_')) continue;
      const d = [...new Set(reach(all, name))].sort();
      if (d.length) out[name] = { contract, disclosed: d };
    }
  return out;
};

// ---- ledger writes: what a step reveals beyond its disclose() calls ----

/** The ledger fields a contract declares. */
const ledgerFields = (src: string): string[] =>
  [...stripComments(src).matchAll(/^export\s+(?:sealed\s+)?ledger\s+(\w+)/gm)].map((m) => m[1]);

/** The ledger fields a body writes: assigned, or changed by insert/remove/increment/decrement/resetHistory. */
export const writesIn = (body: string, fields: readonly string[]): string[] =>
  fields.filter(
    (f) =>
      new RegExp(`(?<![\\w.])${f}\\s*=(?!=)`).test(body) ||
      new RegExp(`(?<![\\w.])${f}\\s*\\.\\s*(insert\\w*|remove|increment|decrement|resetHistory)\\s*\\(`).test(body) ||
      new RegExp(
        `(?<![\\w.])${f}\\s*\\.\\s*lookup\\((?:[^()]|\\([^()]*\\))*\\)\\s*\\.\\s*(insert\\w*|remove|increment|decrement)\\s*\\(`,
      ).test(body),
  );

const writesReached = (
  all: Record<string, Circuit>,
  fields: readonly string[],
  name: string,
  seen = new Set<string>(),
): string[] => {
  if (seen.has(name)) return [];
  seen.add(name);
  const out = writesIn(all[name].body, fields);
  for (const other of Object.keys(all))
    if (other !== name && new RegExp(`\\b${other}\\s*(<[^>]*>)?\\s*\\(`).test(all[name].body))
      out.push(...writesReached(all, fields, other, seen));
  return out;
};

const LEDGERS = {
  veilcore: ledgerFields(read('veilcore.compact')),
  claims: ledgerFields(read('veilcore-claims.compact')),
};

/** circuit -> the ledger fields it writes, sorted, for every exported circuit that writes any. */
const writesFromSources = (): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const [contract, all] of Object.entries(CONTRACTS))
    for (const [name, c] of Object.entries(all)) {
      if (!c.exported || name.startsWith('Schnorr_')) continue;
      const w = [...new Set(writesReached(all, LEDGERS[contract as keyof typeof LEDGERS], name))].sort();
      if (w.length) out[name] = w;
    }
  return out;
};

describe('the receipt names what the ledger writes reveal', () => {
  const writes = writesFromSources();

  it('reads the ledger and its writes (a sanity check on the reader itself)', () => {
    expect(LEDGERS.veilcore).toContain('parentsOf');
    expect(writes.confirmParent).toEqual(expect.arrayContaining(['parentsOf', 'hasOffspring', 'pendingParentOf']));
    // Through a helper (addObligation) and through a map's own counter (lookup(..).increment).
    expect(writes.acceptObligation).toEqual(expect.arrayContaining(['obligationCountOf', 'openObligations']));
    expect(writes.issueLicense).toContain('pendingLicensesBy');
    // Reading is not writing.
    expect(
      writesIn('assert(parentsOf.member(c)); const x = rotationsOf.lookup(o).lessThan(3);', [
        'parentsOf',
        'rotationsOf',
      ]),
    ).toEqual([]);
    expect(writesIn('x == parentsOf', ['parentsOf'])).toEqual([]);
  });

  it('says what writing each ledger field reveals, for every field and no other', () => {
    expect(Object.keys(LEDGER_FACTS).sort()).toEqual([...new Set([...LEDGERS.veilcore, ...LEDGERS.claims])].sort());
  });

  it('every circuit that writes the ledger has a receipt', () => {
    for (const n of Object.keys(writes)) expect(RECEIPTS, n).toHaveProperty(n);
  });

  for (const [name, r] of Object.entries(RECEIPTS))
    it(`${name}: the receipt lists exactly the ledger fields it writes`, () => {
      expect([...r.writes].sort(), `${name}: update onchain-receipt.ts with the contract`).toEqual(writes[name] ?? []);
    });

  it('names the ties and the counts on the steps that make them, and the step on every one', () => {
    expect(receiptFacts(['proposeParent'])).toContain('parentLink');
    expect(receiptFacts(['confirmParent'])).toContain('parentLink');
    expect(receiptFacts(['issueLicense'])).toEqual(expect.arrayContaining(['licenseLink', 'licenseCount']));
    expect(receiptFacts(['countersignLicense'])).toEqual(expect.arrayContaining(['licenseList', 'licenseCount']));
    expect(receiptFacts(['acceptObligation'])).toEqual(expect.arrayContaining(['obligationLink', 'obligationCount']));
    expect(receiptFacts(['anchor'])).toEqual(
      expect.arrayContaining(['keyLink', 'moveCount', 'licenseCount', 'obligationCount']),
    );
    for (const c of Object.keys(RECEIPTS) as ReceiptCircuit[]) expect(receiptFacts([c]).at(-1), c).toBe('step');
  });

  it('a changed write is caught (the check is not vacuous)', () => {
    const changed = circuitsOf(
      read('veilcore.compact').replace('proofSeq.increment(1);', 'proofSeq.increment(1); hasOffspring.insert(c);'),
    );
    const w = [...new Set(writesReached({ ...SCHNORR, ...changed }, LEDGERS.veilcore, 'proveOwnership'))].sort();
    expect(w).not.toEqual([...RECEIPTS.proveOwnership.writes].sort());
  });
});

describe('the receipt follows the contracts', () => {
  const found = fromSources();

  it('reads the sources (a sanity check on the reader itself)', () => {
    expect(Object.keys(found).length).toBeGreaterThanOrEqual(29);
    expect(found.anchor.disclosed).toEqual(['commit(localGeneticSecret())', 'recoveryCommitment']);
    // Through a helper (liveSelf) and through the Schnorr module.
    expect(found.withdrawParent.disclosed).toEqual(['commit(localGeneticSecret())']);
    expect(found.proveAttested.disclosed).toContain('q');
    // A pure helper with no disclose() adds nothing.
    expect(disclosesIn('return x;')).toEqual([]);
  });

  it('lists every circuit that discloses anything, and no other', () => {
    expect(Object.keys(RECEIPTS).sort()).toEqual(Object.keys(found).sort());
  });

  for (const [name, r] of Object.entries(RECEIPTS)) {
    it(`${name}: the receipt names exactly what its disclose() calls reveal`, () => {
      expect(found[name], `${name} is not an exported circuit that discloses anything`).toBeDefined();
      expect(r.contract).toBe(found[name].contract);
      expect(Object.keys(r.disclosed).sort(), `${name}: update onchain-receipt.ts with the contract`).toEqual(
        found[name].disclosed,
      );
    });
  }

  it('a changed disclose() is caught (the check is not vacuous)', () => {
    const changed = circuitsOf(
      read('veilcore.compact').replace(
        'const ch = disclose(challenge);',
        'const ch = disclose(challenge); disclose(extra);',
      ),
    );
    const d = [...new Set(reach({ ...SCHNORR, ...changed }, 'proveOwnership'))].sort();
    expect(d).not.toEqual(Object.keys(RECEIPTS.proveOwnership.disclosed).sort());
  });
});

describe('every step a screen can send has a receipt', () => {
  it('the browser’s circuits are the ones marked as on a screen', () => {
    const onScreen = Object.entries(RECEIPTS)
      .filter(([, r]) => r.screen)
      .map(([n]) => n)
      .sort();
    expect(onScreen).toEqual([...BROWSER_CIRCUITS, ...CLAIMS_BROWSER_CIRCUITS].sort());
  });

  it('dedupes facts and keeps table order', () => {
    expect(receiptFacts(['proveLicense'])).toEqual(['checkPassed', 'listVersion', 'presentation', 'step']);
    expect(receiptFacts(['proposeParent', 'confirmParent'])).toEqual([
      'yourRecord',
      'otherRecord',
      'parentLink',
      'step',
    ]);
  });

  it('has words for every fact in every language', () => {
    const facts = new Set([
      ...Object.values(RECEIPTS).flatMap((r) => Object.values(r.disclosed) as string[]),
      ...(Object.values(LEDGER_FACTS) as string[]),
    ]);
    for (const dict of [appEn, appDe, appEs, appFr, appJa] as Record<string, string>[]) {
      for (const f of facts) expect(dict[`app.receipt.fact.${f}`], f).toBeTruthy();
      for (const s of STAYS) expect(dict[`app.receipt.stay.${s}`], s).toBeTruthy();
    }
  });

  it('says what stays private in the approved words', () => {
    expect(appEn['app.receipt.stay.genetics']).toBe('Genetics and DNA files never leave this device.');
  });

  it('names everything the registry holds in the clear (api-store.ts PUBLIC_FIELDS and the wire row)', () => {
    const store = fs.readFileSync(path.join(SRC, 'veilcore/api-store.ts'), 'utf8');
    const publicFields = [
      ...(/const PUBLIC_FIELDS = \[([\s\S]*?)\] as const;/.exec(store)?.[1] ?? '').matchAll(/'(\w+)'/g),
    ].map((m) => m[1]);
    // Each field the registry can read, and the words of the sentence that say it.
    const COVERED: Record<string, string> = {
      id: 'the kind of record',
      profile: 'the kind of record',
      recordFingerprint: 'its proof code',
      keyBinding: 'the codes tied to it',
      supersededBy: 'what replaced it',
      receivedFrom: 'where one came from',
      receivedFromCommitment: 'where one came from',
      receivedAt: 'where one came from',
      transferId: 'where one came from',
    };
    expect(publicFields.length).toBeGreaterThan(5);
    const kind = appEn['app.receipt.stay.kind'];
    for (const f of publicFields) {
      expect(COVERED[f], `${f} is public: say so in app.receipt.stay.kind`).toBeDefined();
      expect(kind).toContain(COVERED[f]);
    }
    // Sent beside the sealed box on every row: the name's salted code, the rev, the correction pointer.
    expect(store).toMatch(/\.\.\.publicPart\(item\), \.\.\.nameCodeField\(item\), rev, sealed/);
    expect(kind).toContain('the codes tied to it');
    expect(kind).toContain('links between records');
    // The name is sealed; the kind (`profile`) is not.
    expect(publicFields).toContain('profile');
    expect(publicFields).not.toContain('strainName');
  });

  // Each screen that sends a step, and the circuits its receipt must name.
  const SCREENS: Record<string, ReceiptCircuit[]> = {
    'components/flow/LogFlow.tsx': ['anchor'],
    'components/flow/ProvePage.tsx': ['proveOwnership'],
    'components/chain/ProveOwnershipPanel.tsx': ['proveOwnership'],
    'components/chain/PairDnaOnChainPanel.tsx': ['pairDna'],
    'components/chain/FamilyOnChain.tsx': ['proposeParent', 'confirmParent', 'withdrawParent'],
    'components/lab-import/BulkImportPage.tsx': ['anchor'],
    'components/document/ProveNumber.tsx': ['proveValue', 'proveRange'],
    'components/document/LabSignaturePanel.tsx': ['proveAttested'],
    'components/licensing/RealLicensePanel.tsx': ['issueLicense', 'revokeLicense'],
    'components/licensing/LicenseInvitePage.tsx': ['countersignLicense'],
    'components/licensing/LicenseProof.tsx': ['proveLicense'],
    'components/licensing/HandOnIssuer.tsx': ['approveTransfer'],
    'components/licensing/HandOnHolder.tsx': ['proposeTransfer', 'withdrawTransfer'],
    'components/licensing/OffspringRoyalty.tsx': [
      'proposeObligation',
      'withdrawObligation',
      'discharge',
      'acceptObligation',
      'rejectObligation',
    ],
    'components/licensing/LenderPage.tsx': ['anchor', 'proposeObligation', 'withdrawObligation', 'discharge'],
  };
  for (const [file, circuits] of Object.entries(SCREENS))
    it(`${file} shows the receipt for ${circuits.join(', ')}`, () => {
      const src = fs.readFileSync(path.join(SRC, file), 'utf8');
      // The circuits named in the file's receipts: <DisclosureReceipt circuits={[...]} />, or
      // a RECEIPT_FOR table the file passes to it.
      const named = [...src.matchAll(/<DisclosureReceipt[^>]*?circuits=\{\[([^\]]*)\]\}/g)]
        .flatMap((m) => [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]))
        .concat(
          [...src.matchAll(/RECEIPT_FOR[^=]*=\s*\{([\s\S]*?)\};/g)].flatMap((m) =>
            [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]),
          ),
        );
      expect(src).toMatch(/<DisclosureReceipt\b/);
      for (const c of circuits) expect(named, `${file} names ${c} in a receipt`).toContain(c);
    });

  it('every screen circuit is shown by some screen', () => {
    const shown = new Set(Object.values(SCREENS).flat());
    for (const c of [...BROWSER_CIRCUITS, ...CLAIMS_BROWSER_CIRCUITS]) expect(shown.has(c), c).toBe(true);
  });
});
