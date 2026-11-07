// Ask's on-device model engine (docs/ask-veilcore.md, "v2.1"). WebLLM 0.2.86 runs here, in its
// own worker, and nowhere else: the page never loads it. Its Content-Security-Policy
// (scripts/ask-model-csp.mjs) lets it fetch only this site (the model library), so the model
// can reach no other host, whatever it is asked.
//
// Before every start: the policy is checked to be in force, and every stored model file is
// checked against its SHA-256 in the bundle (integrity.ts). Only then is WebLLM loaded and
// started, from the stored files; the model library is checked by WebLLM against its SHA-256
// too. Any mismatch stops it, and Ask answers with Shortcuts.
//
// An answer is JSON in the one shape Ask reads (ask/model-output.ts), constrained by WebLLM's
// JSON schema grammar, with Qwen3's "thinking" off. The page checks it like a typed answer.
// SPDX-License-Identifier: Apache-2.0

import { checkAllStored, sri } from './integrity';
import { MANIFEST, modelById, modelFolder } from './manifest';
import { ownPolicyInForce } from './worker-csp';

export type EngineFailure = 'policy' | 'unknown-model' | 'not-stored' | 'mismatch' | 'no-gpu' | 'no-f16' | 'failed';
export type EngineIn =
  | { readonly type: 'load'; readonly modelId: string }
  | {
      readonly type: 'ask';
      readonly id: number;
      readonly messages: readonly { role: 'system' | 'user'; content: string }[];
      readonly schema: string;
    };
export type EngineOut =
  | { readonly type: 'progress'; readonly stage: 'checking' | 'loading'; readonly progress: number }
  | { readonly type: 'ready' }
  | { readonly type: 'failed'; readonly reason: EngineFailure; readonly detail?: string }
  | { readonly type: 'answer'; readonly id: number; readonly text?: string; readonly error?: boolean };

const post = (m: EngineOut) => (globalThis as unknown as { postMessage: (m: EngineOut) => void }).postMessage(m);

type Engine = {
  reload: (id: string) => Promise<void>;
  chat: {
    completions: {
      create: (r: object) => Promise<{ choices: { message: { content: string | null } }[] }>;
    };
  };
};
let engine: Engine | undefined;
let loading = false;

/** WebLLM's own error names (it sets each class's name), and the one fixed message below. */
const failureOf = (e: unknown): EngineFailure => {
  const name = (e as { name?: string } | undefined)?.name ?? '';
  if (name === 'WebGPUNotAvailableError') return 'no-gpu';
  // The TVM runtime's own wording when WebGPU is there but offers no adapter (detectGPUDevice).
  if (String((e as Error | undefined)?.message ?? '').startsWith('Unable to find a compatible GPU.')) return 'no-gpu';
  if (name === 'ShaderF16SupportError') return 'no-f16';
  if (name === 'IntegrityError') return 'mismatch';
  return 'failed';
};

const load = async (modelId: string): Promise<EngineOut> => {
  if (!(await ownPolicyInForce('engine'))) return { type: 'failed', reason: 'policy' };
  const m = modelById(modelId);
  if (!m) return { type: 'failed', reason: 'unknown-model' };
  const stored = await checkAllStored(m, (done, total) =>
    post({ type: 'progress', stage: 'checking', progress: done / total }),
  );
  if (stored.mismatch.length) return { type: 'failed', reason: 'mismatch' };
  if (!stored.ok) return { type: 'failed', reason: 'not-stored' };
  const byPath = new Map(m.files.map((f) => [f.path, f.sha256]));
  try {
    const webllm = await import('@mlc-ai/web-llm');
    const e = new webllm.MLCEngine({
      appConfig: {
        cacheBackend: 'cache',
        model_list: [
          {
            model: modelFolder(m),
            model_id: m.id,
            // This site's copy (relative: WebLLM fetches it from this origin, never GitHub).
            model_lib: `${MANIFEST.libs.servedFrom}${m.lib.file}`,
            required_features: [...m.requiredFeatures],
            vram_required_MB: m.vramMB,
            low_resource_required: true,
            overrides: { context_window_size: m.contextWindow },
            integrity: {
              model_lib: sri(m.lib.sha256),
              config: sri(byPath.get('mlc-chat-config.json') as string),
              tokenizer: { 'tokenizer.json': sri(byPath.get('tokenizer.json') as string) },
              onFailure: 'error',
            },
          },
        ],
      },
      initProgressCallback: (r: { progress: number }) =>
        post({ type: 'progress', stage: 'loading', progress: r.progress }),
    }) as unknown as Engine;
    await e.reload(m.id);
    engine = e;
    return { type: 'ready' };
  } catch (err) {
    // For whoever looks at the console: which error, never anything typed.
    console.warn(
      'Ask: the on-device model did not start:',
      (err as Error)?.name,
      String((err as Error)?.message ?? err).slice(0, 300),
    );
    return {
      type: 'failed',
      reason: failureOf(err),
      detail: `${String((err as Error)?.name ?? '')}: ${String((err as Error)?.message ?? err).slice(0, 200)}`,
    };
  }
};

const ask = async (m: Extract<EngineIn, { type: 'ask' }>): Promise<EngineOut> => {
  if (!engine) return { type: 'answer', id: m.id, error: true };
  try {
    const r = await engine.chat.completions.create({
      messages: m.messages,
      response_format: { type: 'json_object', schema: m.schema },
      temperature: 0,
      max_tokens: 160,
      // Qwen3's step-by-step "thinking" off: one short JSON answer.
      extra_body: { enable_thinking: false },
    });
    return { type: 'answer', id: m.id, text: r.choices[0]?.message.content ?? '' };
  } catch {
    return { type: 'answer', id: m.id, error: true };
  }
};

(globalThis as unknown as { onmessage: (e: MessageEvent<EngineIn>) => void }).onmessage = (e) => {
  const m = e.data;
  if (m.type === 'load') {
    if (loading || engine) return;
    loading = true;
    void load(m.modelId).then((out) => {
      loading = false;
      post(out);
    });
  } else if (m.type === 'ask') void ask(m).then(post);
};
