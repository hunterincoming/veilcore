// Which engine answers in the Ask sheet: Shortcuts, or the on-device model when it is built in
// (VITE_ASK_MODEL=on and pinned), this device can run it, it is downloaded, every file checks
// out, and it got the test answer right here (model-engine.ts selfTest). Anything short of that
// is Shortcuts, with the reason shown. Nothing here fetches.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import type { AskEngine } from '../../ask/engine';
import { modelEngine, selfTest } from '../../ask/model-engine';
import { shortcutsEngine } from '../../ask/shortcuts';
import { EngineFailed, MODEL_BUILT, checkDevice, startEngine, stopEngine, storedModel } from '../../ask-local/client';

export type EngineWhy = 'policy' | 'mismatch' | 'notStored' | 'noGpu' | 'noF16' | 'selfTest' | 'failed';
export type EngineState =
  | { readonly status: 'shortcuts'; readonly engine: AskEngine }
  | { readonly status: 'starting'; readonly engine: AskEngine; readonly model: string }
  | { readonly status: 'model'; readonly engine: AskEngine; readonly model: string }
  | { readonly status: 'failed'; readonly engine: AskEngine; readonly why: EngineWhy };

/** "Qwen3-1.7B-q4f16_1-MLC" -> "Qwen3 1.7B". */
export const modelName = (id: string): string => id.replace(/^(Qwen3)-([\d.]+B).*$/, '$1 $2');

const WHY: Record<string, EngineWhy> = {
  policy: 'policy',
  mismatch: 'mismatch',
  'not-stored': 'notStored',
  'unknown-model': 'notStored',
  'no-gpu': 'noGpu',
  'no-f16': 'noF16',
  selfTest: 'selfTest',
};

// Once per page: a model that started and passed stays; one that failed is not retried until
// something changes (a download, a delete: `again`).
let kept: EngineState | undefined;

export const useAskEngine = (again: number): EngineState => {
  const [state, setState] = useState<EngineState>(kept ?? { status: 'shortcuts', engine: shortcutsEngine });
  useEffect(() => {
    if (!MODEL_BUILT) return;
    let live = true;
    const set = (s: EngineState) => {
      kept = s;
      if (live) setState(s);
    };
    if (again === 0 && kept && kept.status !== 'starting') return;
    void (async () => {
      const device = await checkDevice();
      const m = device.ok ? await storedModel() : undefined;
      if (!m) {
        stopEngine();
        set({ status: 'shortcuts', engine: shortcutsEngine });
        return;
      }
      set({ status: 'starting', engine: shortcutsEngine, model: modelName(m.id) });
      try {
        const session = await startEngine(m);
        if (!(await selfTest(session))) throw new EngineFailed('selfTest' as never);
        set({ status: 'model', engine: modelEngine(session), model: modelName(m.id) });
      } catch (e) {
        stopEngine();
        set({ status: 'failed', engine: shortcutsEngine, why: WHY[(e as EngineFailed).reason] ?? 'failed' });
      }
    })();
    return () => {
      live = false;
    };
  }, [again]);
  return state;
};
