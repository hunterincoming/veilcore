// Only in the evaluation build (VITE_ASK_MODEL=eval, scripts/eval-ask.mjs on the maintainer's
// Mac; scripts/vercel-config.mjs refuses to deploy it): lets that script ask both engines the
// same questions in a real browser with a real GPU. Never in a site build.
// SPDX-License-Identifier: Apache-2.0

import type { AskContext, AskEngine, AskResult } from '../ask/engine';
import { modelEngine, selfTest } from '../ask/model-engine';
import { shortcutsEngine } from '../ask/shortcuts';
import type { DraftKind } from '../ask/handoff';
import { ANIMAL_PROFILE } from '../veilcore/animal-profile';
import { STRAIN_PROFILE } from '../veilcore/strain-profile';
import type { StrainRecord } from '../veilcore/records';
import { startDownload, startEngine, type ModelSession } from './client';
import { MODEL_FLAG, modelById } from './manifest';

type EvalRecord = { id: string; name: string; kind: DraftKind };
const ctxOf = (records: EvalRecord[], kinds: DraftKind[]): AskContext => ({
  records: records.map(
    (r) =>
      ({
        id: r.id,
        strainName: r.name,
        ...(r.kind === 'animal' ? { profile: ANIMAL_PROFILE } : r.kind === 'strain' ? { profile: STRAIN_PROFILE } : {}),
      }) as unknown as StrainRecord,
  ),
  kinds,
});

let session: ModelSession | undefined;
const none: AskEngine = { id: 'none', interpret: () => Promise.resolve({ type: 'miss', closest: [] }) };

export const installEvalHook = (): void => {
  if (MODEL_FLAG !== 'eval') return;
  (globalThis as unknown as { __askEval: unknown }).__askEval = {
    shortcuts: (text: string, records: EvalRecord[], kinds: DraftKind[]): Promise<AskResult> =>
      shortcutsEngine.interpret(text, ctxOf(records, kinds)),
    download: (modelId: string): Promise<string> =>
      new Promise((resolve) => {
        const m = modelById(modelId);
        if (!m) return resolve('unknown-model');
        startDownload(m, {
          progress: () => undefined,
          end: (out) => resolve(out.type === 'failed' ? out.reason : out.type),
        });
      }),
    start: async (modelId: string): Promise<{ ok: boolean; selfTest?: boolean; why?: string }> => {
      const m = modelById(modelId);
      if (!m) return { ok: false, why: 'unknown-model' };
      try {
        session = await startEngine(m);
        return { ok: true, selfTest: await selfTest(session) };
      } catch (e) {
        return { ok: false, why: String((e as { reason?: string }).reason ?? e) };
      }
    },
    /** The model as Ask uses it (Shortcuts when it has nothing usable), or alone (`alone`). */
    model: (text: string, records: EvalRecord[], kinds: DraftKind[], alone = false): Promise<AskResult> => {
      if (!session) return Promise.reject(new Error('start the model first'));
      return modelEngine(session, alone ? none : shortcutsEngine, 60_000).interpret(text, ctxOf(records, kinds));
    },
  };
};
