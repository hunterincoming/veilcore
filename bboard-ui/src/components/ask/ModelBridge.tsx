// Ask's on-device model, as the sheet sees it: which engine answers (useAskEngine.ts). Its own
// file, loaded by AskSheet only in a build with the model (VITE_ASK_MODEL), so a build without
// it has none of the model's code: no workers, no WebLLM.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from 'react';
import { MODEL_BUILT } from '../../ask-local/manifest';
import { useAskEngine, type EngineState } from './useAskEngine';

export default function ModelBridge({ again, onState }: { again: number; onState: (s: EngineState) => void }) {
  const state = useAskEngine(MODEL_BUILT ? again : -1);
  useEffect(() => onState(state), [state, onState]);
  return null;
}
