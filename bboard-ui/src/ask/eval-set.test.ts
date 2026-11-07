// The evaluation set (scripts/fixtures/ask-eval.json) and its scoring (scripts/ask-eval-score.mjs):
// 200 requests, 40 in each language, each expected answer one Ask can give under the provenance
// rule. Shortcuts is scored here too: the bar the on-device model has to clear on a real GPU
// (scripts/eval-ask.mjs).
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { clearlyWins, matches, summarise } from '../../../scripts/ask-eval-score.mjs';
import type { StrainRecord } from '../veilcore/records';
import { ANIMAL_PROFILE } from '../veilcore/animal-profile';
import { STRAIN_PROFILE } from '../veilcore/strain-profile';
import type { DraftKind } from './handoff';
import { interpret } from './shortcuts';

type Case = { id: string; lang: string; text: string; expect: Record<string, unknown> & { type: string } };
const HERE = path.dirname(fileURLToPath(import.meta.url));
const set = JSON.parse(fs.readFileSync(path.resolve(HERE, '../../../scripts/fixtures/ask-eval.json'), 'utf8')) as {
  records: { id: string; name: string; kind: DraftKind }[];
  kinds: DraftKind[];
  cases: Case[];
};
const ctx = {
  records: set.records.map(
    (r) =>
      ({
        id: r.id,
        strainName: r.name,
        ...(r.kind === 'animal' ? { profile: ANIMAL_PROFILE } : r.kind === 'strain' ? { profile: STRAIN_PROFILE } : {}),
      }) as unknown as StrainRecord,
  ),
  kinds: set.kinds,
};

describe('the evaluation set', () => {
  it('200 requests, 40 per language, unique ids, every parent one of the records', () => {
    expect(set.cases).toHaveLength(200);
    for (const lang of ['en', 'de', 'es', 'fr', 'ja'])
      expect(set.cases.filter((c) => c.lang === lang)).toHaveLength(40);
    expect(new Set(set.cases.map((c) => c.id)).size).toBe(200);
    const names = new Set(set.records.map((r) => r.name));
    for (const c of set.cases)
      for (const p of (c.expect.parents as string[] | undefined) ?? []) expect(names.has(p), c.id).toBe(true);
  });

  it('every expected name and parent is in the request as typed (the provenance rule)', () => {
    const norm = (s: string) => s.normalize('NFKC').toLowerCase();
    for (const c of set.cases) {
      for (const v of [
        c.expect.name,
        ...((c.expect.parents as string[] | undefined) ?? []),
        ...((c.expect.unmatched as string[] | undefined) ?? []),
      ])
        if (typeof v === 'string') expect(norm(c.text), `${c.id}: ${v}`).toContain(norm(v));
      if (typeof c.expect.count === 'number' && c.expect.count > 1)
        expect(norm(c.text), c.id).toContain(String(c.expect.count));
    }
  });

  it('Shortcuts’ score is the bar (printed); the rule needs a clear win and no request', () => {
    const answers: Record<string, { shortcuts: boolean; model: boolean }> = {};
    for (const c of set.cases) {
      const r = interpret(c.text, ctx);
      answers[c.id] = { shortcuts: matches(r, c.expect, set.records), model: false };
    }
    const s = summarise(set.cases, answers);
    console.log(`Shortcuts on the evaluation set: ${s.shortcuts}/${s.total}`, JSON.stringify(s.byLang));
    expect(s.shortcuts).toBeGreaterThan(100);
    // A model no better than Shortcuts does not win; nor does one that made a request.
    expect(clearlyWins(s, 0).wins).toBe(false);
    const perfect = summarise(
      set.cases,
      Object.fromEntries(set.cases.map((c) => [c.id, { shortcuts: answers[c.id].shortcuts, model: true }])),
    );
    expect(clearlyWins(perfect, 0).wins).toBe(perfect.model - perfect.shortcuts >= 20);
    expect(clearlyWins(perfect, 1).wins).toBe(false);
  });
});
