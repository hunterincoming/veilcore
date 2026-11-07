// Ask's on-device model engine (docs/ask-veilcore.md, "v2.1"). WebLLM 0.2.86 runs here, in its
// own worker, and nowhere else: the page never loads it. Its Content-Security-Policy
// (scripts/ask-model-csp.mjs) lets it fetch nothing at all (connect-src 'none'): the weights and
// the model library are read from the browser's cache, where the download put them. Starting it
// loads only its own code (this worker and WebLLM) from this site, as scripts.
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
import { libUrl, modelById, modelFolder, neededFiles } from './manifest';
import { ownPolicyInForce } from './worker-csp';

export type EngineFailure = 'policy' | 'unknown-model' | 'not-stored' | 'mismatch' | 'no-gpu' | 'no-f16' | 'failed';
export type EngineIn =
  | {
      readonly type: 'load';
      readonly modelId: string;
      /** Test builds only (VITE_ASK_MODEL=test): answer with stand-in below, after every real check. */
      readonly standIn?: boolean;
    }
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

/**
 * Test builds only: a stand-in for WebLLM, for the browser test of the model's own answer path
 * (e2e/ask-model.spec.ts), since headless Chromium has no GPU. It answers a request with a
 * number and a cutting word as that batch, from the shown records, and anything else with
 * "none". In every other build this is left out (VITE_ASK_MODEL is a constant there).
 */
const standInEngine = (): Engine => ({
  reload: () => Promise.resolve(),
  chat: {
    completions: {
      create: (r: object) => {
        const messages = (r as { messages: { role: string; content: string }[] }).messages;
        const user = messages.find((x) => x.role === 'user')?.content ?? '';
        const system = messages.find((x) => x.role === 'system')?.content ?? '';
        const data = system.slice(system.lastIndexOf('RECORDS (data):'));
        const ids = [...data.matchAll(/"id":"(VEIL-[0-9A-F]+)"/g)].map((x) => x[1]);
        const n = /\d+/.exec(user)?.[0];
        const content =
          n && /clone|took|cut/i.test(user)
            ? JSON.stringify({ action: 'clones', count: Number(n), parents: ids.slice(0, 1) })
            : '{"action":"none"}';
        return Promise.resolve({ choices: [{ message: { content } }] });
      },
    },
  },
});

const load = async (modelId: string, standIn = false): Promise<EngineOut> => {
  if (!(await ownPolicyInForce('engine'))) return { type: 'failed', reason: 'policy' };
  const m = modelById(modelId);
  if (!m) return { type: 'failed', reason: 'unknown-model' };
  const origin = globalThis.location.origin;
  const stored = await checkAllStored(neededFiles(m, origin), (done, total) =>
    post({ type: 'progress', stage: 'checking', progress: done / total }),
  );
  if (stored.mismatch.length) return { type: 'failed', reason: 'mismatch' };
  if (!stored.ok) return { type: 'failed', reason: 'not-stored' };
  if (import.meta.env.VITE_ASK_MODEL === 'test' && standIn) {
    engine = standInEngine();
    return { type: 'ready' };
  }
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
            // This site's copy, absolute so WebLLM reads it from its cache (webllm/wasm), where
            // the download stored it checked; never fetched from GitHub, or at all from here.
            model_lib: libUrl(m, origin),
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
    void load(m.modelId, m.standIn === true).then((out) => {
      loading = false;
      post(out);
    });
  } else if (m.type === 'ask') void ask(m).then(post);
};
