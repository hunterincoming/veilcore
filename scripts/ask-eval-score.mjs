// Scoring for Ask's evaluation (scripts/eval-ask.mjs, scripts/fixtures/ask-eval.json): one
// answer against the answer a careful reader gives, and the rule for when the on-device model
// may be offered by default.
// SPDX-License-Identifier: Apache-2.0

const norm = (s) =>
  String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Whether an AskResult matches the expected answer. Only the fields the case names are compared;
 * parents are compared as names (ids resolved through `records`), in any order.
 */
export const matches = (result, expect, records) => {
  if (!result || result.type !== expect.type) return false;
  if (expect.type === 'draft') {
    const d = result.draft ?? {};
    if (d.kind !== expect.kind || d.preset !== expect.preset) return false;
    if ('count' in expect && (d.count ?? undefined) !== expect.count) return false;
    if ('name' in expect && norm(d.name) !== norm(expect.name)) return false;
    if ('parents' in expect) {
      const got = (d.parents ?? [])
        .map((id) => records.find((r) => r.id === id)?.name ?? id)
        .map(norm)
        .sort();
      if (JSON.stringify(got) !== JSON.stringify(expect.parents.map(norm).sort())) return false;
    }
    if ('unmatched' in expect) {
      const got = (result.unmatched ?? []).map(norm).sort();
      if (JSON.stringify(got) !== JSON.stringify(expect.unmatched.map(norm).sort())) return false;
    }
    return true;
  }
  if (expect.type === 'explain') return (result.topic ?? null) === (expect.topic ?? null);
  if (expect.type === 'search') {
    const got = norm(result.query).split(' ');
    return norm(expect.query)
      .split(' ')
      .filter(Boolean)
      .every((w) => got.some((g) => g === w || g.includes(w)));
  }
  if (expect.type === 'go') return result.action === expect.action;
  return true;
};

/** Correct counts per engine, per language, and where one is right and the other wrong. */
export const summarise = (cases, answers) => {
  const out = {
    total: cases.length,
    byLang: {},
    shortcuts: 0,
    model: 0,
    modelOnly: 0,
    wins: [],
    losses: [],
  };
  for (const c of cases) {
    const a = answers[c.id];
    const s = !!a?.shortcuts;
    const m = !!a?.model;
    out.byLang[c.lang] ??= { total: 0, shortcuts: 0, model: 0 };
    out.byLang[c.lang].total++;
    if (s) (out.shortcuts++, out.byLang[c.lang].shortcuts++);
    if (m) (out.model++, out.byLang[c.lang].model++);
    if (a?.modelOnly) out.modelOnly++;
    if (m && !s) out.wins.push(c.id);
    if (s && !m) out.losses.push(c.id);
  }
  return out;
};

/**
 * The model is offered by default only if it clearly wins: at least 10 points more of the set
 * right than Shortcuts, no language where it does worse, at most 2% of the set that Shortcuts
 * gets right and it gets wrong, and no request made while it answered.
 */
export const clearlyWins = (s, requestsWhileAsking) => {
  const reasons = [];
  if (requestsWhileAsking > 0) reasons.push(`${requestsWhileAsking} request(s) while answering`);
  if (s.model - s.shortcuts < 0.1 * s.total)
    reasons.push(`only ${s.model - s.shortcuts} more right than Shortcuts (needs ${Math.ceil(0.1 * s.total)})`);
  for (const [lang, l] of Object.entries(s.byLang))
    if (l.model < l.shortcuts) reasons.push(`worse than Shortcuts in ${lang}`);
  if (s.losses.length > 0.02 * s.total)
    reasons.push(`${s.losses.length} answers Shortcuts gets right and the model gets wrong`);
  return { wins: reasons.length === 0, reasons };
};
