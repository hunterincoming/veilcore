// <veilcore-record-check>'s own logic (record-check/src/element.ts) on a minimal DOM stand-in:
// an answer counts only for the link it was made for (a slow answer for an earlier link
// never validates the link in the box), the test network and proof rules, and the
// when-unreachable="allow" opt-in. The real browser runs are in e2e/element.spec.ts.
// All records are test data.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- a DOM stand-in */
import { createHash } from 'node:crypto';
import { buildBatch } from 'veilcore-records';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

class StubNode {
  children: any[] = [];
  listeners: Record<string, ((e: any) => void)[]> = {};
  attrs: Record<string, string> = {};
  textContent = '';
  className = '';
  dataset: Record<string, string> = {};
  setAttribute(k: string, v: string) {
    this.attrs[k] = v;
  }
  getAttribute(k: string) {
    return k in this.attrs ? this.attrs[k] : null;
  }
  removeAttribute(k: string) {
    delete this.attrs[k];
  }
  hasAttribute(k: string) {
    return k in this.attrs;
  }
  append(...c: any[]) {
    this.children.push(...c);
  }
  replaceChildren(...c: any[]) {
    this.children = c;
  }
  addEventListener(t: string, f: (e: any) => void) {
    (this.listeners[t] ??= []).push(f);
  }
  fire(t: string) {
    for (const f of this.listeners[t] ?? []) f({ preventDefault() {}, key: '' });
  }
  after() {}
  remove() {}
}

/** One ElementInternals stand-in per element. */
class Internals {
  formValue: unknown = '';
  invalid = false;
  message = '';
  form = null;
  setFormValue(v: unknown) {
    this.formValue = v;
  }
  setValidity(flags: { customError?: boolean }, message = '') {
    this.invalid = !!flags.customError;
    this.message = message;
  }
  checkValidity() {
    return !this.invalid;
  }
  reportValidity() {
    return !this.invalid;
  }
}

const events: { type: string; detail: any }[] = [];
let Field: any;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const FP = sha256('a test record');
const FP2 = sha256('another test record');
const LINK = `https://veilcore.org/verify/VEIL-GOOD?fp=${FP}`;
const FORGED = `https://veilcore.org/verify/VEIL-FORGED?fp=${FP2}`;

/** The stand-in registry's behaviour, set per test. */
let gate: Record<string, Promise<void>> = {};
let proofFor: Record<string, unknown> = {};
let down = false;

beforeAll(async () => {
  const g = globalThis as any;
  g.document = {
    // Only the created nodes get a plain `value`: on the element it would hide its accessor.
    createElement: (tag: string) => Object.assign(new StubNode(), { tagName: tag.toUpperCase(), value: '' }),
    createTextNode: (t: string) => ({ t }),
  };
  g.HTMLElement = class extends StubNode {
    __root?: StubNode;
    __internals?: Internals;
    attachShadow() {
      this.__root = new StubNode();
      return this.__root;
    }
    attachInternals() {
      this.__internals = new Internals();
      return this.__internals;
    }
    dispatchEvent(e: { type: string; init: { detail: unknown } }) {
      events.push({ type: e.type, detail: e.init.detail });
      return true;
    }
  };
  g.CustomEvent = class {
    constructor(
      public type: string,
      public init: unknown,
    ) {}
  };
  g.customElements = { get: () => undefined, define: () => {} };
  const batch = await buildBatch([FP, FP2, sha256('x')], 'B-TEST');
  proofFor = {
    [FP]: { ...batch.proofs[FP], anchor: { network: 'preprod', txHash: 'd'.repeat(64), anchoredAt: '2026-10-11' } },
    [FP2]: { ...batch.proofs[FP2], anchor: { network: 'mainnet', txHash: 'e'.repeat(64), anchoredAt: '2026-10-11' } },
  };
  g.fetch = async (url: string) => {
    if (down) throw new TypeError('fetch failed');
    const u = new URL(url);
    const reply = (status: number, body: unknown) => ({ status, json: async () => body });
    const m = /^\/verify\/(.+)$/.exec(u.pathname);
    if (m) {
      await gate[m[1]];
      if (m[1] === 'VEIL-GOOD') return reply(200, { found: true, recordFingerprint: FP });
      if (m[1] === 'VEIL-MAIN') return reply(200, { found: true, recordFingerprint: FP2 });
      return reply(404, { found: false });
    }
    const p = /^\/proof\/(.+)$/.exec(u.pathname);
    if (p) return proofFor[p[1]] ? reply(200, proofFor[p[1]]) : reply(404, {});
    return reply(200, { attestations: [], total: 0 });
  };
  ({ VeilcoreRecordCheck: Field } = await import('../src/element'));
});

beforeEach(() => {
  events.length = 0;
  gate = {};
  down = false;
});

/** A gate the stand-in registry waits on before answering for a record id. */
const hold = (id: string) => {
  let open!: () => void;
  gate[id] = new Promise<void>((r) => (open = r));
  return open;
};

const make = (attrs: Record<string, string> = {}) => {
  const f = new Field();
  for (const [k, v] of Object.entries({
    required: '',
    name: 'veilcore_link',
    registry: 'https://reg.example',
    ...attrs,
  }))
    f.setAttribute(k, v);
  f.connectedCallback();
  const find = (n: any, pred: (n: any) => boolean): any => {
    if (pred(n)) return n;
    for (const c of n.children ?? []) {
      const hit = find(c, pred);
      if (hit) return hit;
    }
    return undefined;
  };
  const input = find(f.__root, (n) => n.attrs?.type === 'url');
  const out = find(f.__root, (n) => n.className === 'out');
  const internals: Internals = f.__internals;
  /** The applicant types or pastes into the box (input events). */
  const type = (v: string) => {
    input.value = v;
    input.fire('input');
  };
  return { f, input, out, internals, type };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('an answer counts only for the link it was made for', () => {
  it('a slow answer for the old link does not validate a new link typed meanwhile', async () => {
    const { f, input, internals, type } = make();
    const release = hold('VEIL-GOOD');
    type(LINK);
    const first = f.check();
    await tick();
    // The applicant replaces the link before the answer comes back.
    type(FORGED);
    expect(internals.invalid).toBe(true);
    release();
    expect(await first).toBeNull();
    expect(f.result).toBeNull();
    expect(internals.invalid).toBe(true);
    expect(internals.formValue).toBe(FORGED);
    // Clicking submit blurs the box: change starts the check of the new link. Until it
    // answers, nothing from the old link stands.
    const releaseForged = hold('VEIL-FORGED');
    input.fire('change');
    expect(internals.invalid).toBe(true);
    expect(internals.message).toBe('Check the VeilCore record link first.');
    releaseForged();
    await f.check();
    expect(f.result?.recordExists).toBe(false);
    expect(internals.invalid).toBe(true);
    expect(events.every((e) => e.detail.recordId !== 'VEIL-GOOD')).toBe(true);
  });

  it('a check started for one link and answered after another check: the later link wins', async () => {
    const { f, internals, type } = make({ 'allow-test-network': '' });
    const release = hold('VEIL-GOOD');
    type(LINK);
    const a = f.check();
    await tick();
    type('https://veilcore.org/verify/VEIL-NONE?fp=' + 'c'.repeat(64));
    const b = await f.check();
    expect(b?.recordExists).toBe(false);
    release();
    expect(await a).toBeNull();
    expect(f.result?.recordId).toBe('VEIL-NONE');
    expect(internals.invalid).toBe(true);
  });

  it('re-checking clears the earlier answer first, and a matching link then validates', async () => {
    const { f, out, internals, type } = make({ 'allow-test-network': '' });
    type(LINK);
    await f.check();
    expect(internals.invalid).toBe(false);
    expect(out.dataset.state).toBe('matches');
    // Setting the value programmatically drops the answer too.
    f.value = FORGED;
    expect(f.result).toBeNull();
    expect(out.dataset.state).toBe('empty');
    expect(internals.invalid).toBe(true);
  });
});

describe('what the field accepts', () => {
  it('a test network date: refused unless allow-test-network', async () => {
    const strict = make();
    strict.type(LINK);
    await strict.f.check();
    expect(strict.f.result?.dated.testNetwork).toBe(true);
    expect(strict.internals.invalid).toBe(true);
    expect(strict.internals.message).toMatch(/test network/);
    const relaxed = make({ 'allow-test-network': '' });
    relaxed.type(LINK);
    await relaxed.f.check();
    expect(relaxed.internals.invalid).toBe(false);
  });

  it('an inclusion proof that does not check out: refused', async () => {
    proofFor[FP2] = { ...(proofFor[FP2] as object), root: FP };
    const { f, internals, type } = make({ 'allow-test-network': '' });
    type('https://veilcore.org/verify/VEIL-MAIN?fp=' + FP2);
    await f.check();
    expect(f.result?.dated.status).toBe('proof-fails');
    expect(internals.invalid).toBe(true);
    expect(internals.message).toMatch(/proof/);
  });

  it('a cut-off link: said once, in plain words', async () => {
    const { f, out, internals, type } = make();
    type(LINK.slice(0, -20));
    await f.check();
    expect(out.dataset.state).toBe('cut');
    expect(internals.message).toBe('This link looks cut off. Ask for the whole link.');
    const text = JSON.stringify(out.children);
    expect(text).toMatch(/This link looks cut off/);
    expect(text).toMatch(/Ask for the whole link/);
    expect(text).not.toMatch(/different proof code/);
  });
});

describe('the registry unreachable', () => {
  it('by default a required field blocks the form, and says why', async () => {
    down = true;
    const { f, out, internals, type } = make();
    type(LINK);
    expect(await f.check()).toBeNull();
    expect(out.dataset.state).toBe('unreachable');
    expect(internals.invalid).toBe(true);
    expect(internals.message).toMatch(/registry did not answer/);
    expect(f.unchecked).toBe(false);
    expect(events).toEqual([]);
  });

  it('with when-unreachable="allow" the form sends the link marked as not checked', async () => {
    down = true;
    const { f, internals, type } = make({ 'when-unreachable': 'allow' });
    type(LINK);
    await f.check();
    expect(internals.invalid).toBe(false);
    expect(f.unchecked).toBe(true);
    expect(f.result).toBeNull();
    const fd = internals.formValue as FormData;
    expect(fd.get('veilcore_link')).toBe(LINK);
    expect(fd.get('veilcore_link-unchecked')).toBe('registry-unreachable');
    expect(events[0].detail).toMatchObject({ checked: false, reason: 'registry-unreachable', link: LINK });
    // Typing drops it: a new link is not sent unchecked until it too has been tried.
    type(FORGED);
    expect(f.unchecked).toBe(false);
    expect(internals.invalid).toBe(true);
    expect(internals.formValue).toBe(FORGED);
  });
});
