// What Ask's engines share: what they are given, what they answer, and the one interface a
// future on-device model plugs into (docs/ask-veilcore.md, the v2.1 plan). Today there is one
// engine, Shortcuts (shortcuts.ts): no model, built into the page, works offline.
//
// An engine only interprets. It never saves, signs, sends or fetches: its answer is a draft for
// a screen the person checks and saves themselves, or something to show (what's due, a word
// explained, a search of their own records). A model plugged in later answers in this same
// shape, checked the same way (handoff.ts), so it can do nothing Shortcuts can't.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from '../veilcore/records';
import type { AskDraft, DraftKind } from './handoff';

/** Things Ask can do, as chips and as the closest matches on a miss. */
export const ASK_ACTIONS = [
  'record',
  'clones',
  'offspring',
  'cross',
  'due',
  'explain',
  'search',
  'backup',
  'agreements',
  'import',
] as const;
export type AskAction = (typeof ASK_ACTIONS)[number];

/** Words Explain knows (glossary, app.ask.term.* and app.ask.def.*). */
export const TOPICS = ['priorPossession', 'proofCode', 'proof', 'dating', 'license', 'royaltyReport'] as const;
export type Topic = (typeof TOPICS)[number];

/** Pages Ask can open as they are, with nothing filled in. */
export const GO: Record<'backup' | 'agreements' | 'import', string> = {
  backup: '/backup',
  agreements: '/licenses',
  import: '/records/import',
};

export type AskContext = {
  /** The person's own records in this browser: the only records a draft may name. */
  readonly records: readonly StrainRecord[];
  /** The kinds this site offers (config/network.ts). */
  readonly kinds: readonly DraftKind[];
};

export type AskResult =
  | { readonly type: 'draft'; readonly draft: AskDraft; readonly unmatched: readonly string[] }
  | { readonly type: 'due' }
  | { readonly type: 'explain'; readonly topic?: Topic }
  | { readonly type: 'search'; readonly query: string }
  | { readonly type: 'go'; readonly action: keyof typeof GO }
  | { readonly type: 'miss'; readonly closest: readonly AskAction[] };

export interface AskEngine {
  /** 'shortcuts' today; an on-device model would be its own id (docs/ask-veilcore.md). */
  readonly id: string;
  /** Read what was typed. Never sends anything anywhere. */
  interpret(text: string, ctx: AskContext): Promise<AskResult>;
}

/** The most Ask reads of what is typed. */
export const ASK_MAX_CHARS = 300;
