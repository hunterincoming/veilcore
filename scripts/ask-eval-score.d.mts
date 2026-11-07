// Types for ask-eval-score.mjs.
// SPDX-License-Identifier: Apache-2.0
export type EvalSummary = {
  total: number;
  byLang: Record<string, { total: number; shortcuts: number; model: number }>;
  shortcuts: number;
  model: number;
  modelOnly: number;
  wins: string[];
  losses: string[];
};
export declare const matches: (result: unknown, expect: unknown, records: { id: string; name: string }[]) => boolean;
export declare const summarise: (
  cases: { id: string; lang: string }[],
  answers: Record<string, { shortcuts?: boolean; model?: boolean; modelOnly?: boolean }>,
) => EvalSummary;
export declare const clearlyWins: (s: EvalSummary, requestsWhileAsking: number) => { wins: boolean; reasons: string[] };
