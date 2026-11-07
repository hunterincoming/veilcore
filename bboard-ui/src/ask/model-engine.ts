// Ask's on-device model as an AskEngine (engine.ts): the same interface Shortcuts answers
// through. It sends what was typed to the model in this browser (a worker, ask-local/), reads
// the answer with model-output.ts, and falls back to Shortcuts when the model has nothing
// usable, is slow, or fails. Nothing here fetches: the model runs on this device.
// SPDX-License-Identifier: Apache-2.0

import type { AskContext, AskEngine, AskResult } from './engine';
import { modelMessages, modelSchema, readModelAnswer, recordsForModel } from './model-output';
import { shortcutsEngine } from './shortcuts';
import type { StrainRecord } from '../veilcore/records';

/** The model, as the engine needs it: messages and a schema in, its JSON text out. */
export type ModelAsk = {
  readonly modelId: string;
  ask: (messages: readonly { role: 'system' | 'user'; content: string }[], schema: string) => Promise<string>;
};

/** How long an answer may take before Shortcuts answers instead. */
export const MODEL_TIMEOUT_MS = 15_000;

const within = <T>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });

export const modelEngine = (
  model: ModelAsk,
  fallback: AskEngine = shortcutsEngine,
  timeoutMs = MODEL_TIMEOUT_MS,
): AskEngine => ({
  id: `model:${model.modelId}`,
  interpret: async (text: string, ctx: AskContext): Promise<AskResult> => {
    try {
      const ids = recordsForModel(text, ctx).map((r) => r.id);
      const raw = await within(model.ask(modelMessages(text, ctx), modelSchema(ids)), timeoutMs);
      const read = readModelAnswer(raw, text, ctx);
      if (read) return read;
    } catch {
      /* Shortcuts answers */
    }
    return fallback.interpret(text, ctx);
  },
});

/**
 * The test answer the model must get right on this device before Ask uses it: a batch with a
 * count and a parent, read through the same rules. Anything else and the model stays off.
 */
export const selfTest = async (model: ModelAsk): Promise<boolean> => {
  const plant = { id: 'VEIL-00000001', strainName: 'Test Plant' } as unknown as StrainRecord;
  const ctx: AskContext = { records: [plant], kinds: ['plant'] };
  const never: AskEngine = { id: 'none', interpret: () => Promise.resolve({ type: 'miss', closest: [] }) };
  const r = await modelEngine(model, never, 60_000).interpret('cut 3 clones from Test Plant', ctx);
  return (
    r.type === 'draft' &&
    r.draft.preset === 'clones' &&
    r.draft.count === 3 &&
    r.draft.parents?.length === 1 &&
    r.draft.parents[0] === plant.id
  );
};
