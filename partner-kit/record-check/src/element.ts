// <veilcore-record-check>: a "VeilCore record required" field for a partner's intake
// form. The applicant pastes the record's check link; the check runs in the visitor's
// browser against the public registry (check.ts) and the field shows the same plain
// answer the library and the CLI give.
//
//   <script type="module" src="/vendor/veilcore-record-check.js"></script>
//   <form>
//     <veilcore-record-check name="veilcore_link" required></veilcore-record-check>
//   </form>
//
// Attributes: name (form field name), required (the form won't submit until a record is
// found whose fingerprint matches the link), registry (default: VeilCore's public
// registry), check-page (where "Open the full check page" points; default
// https://veilcore.org), label, value.
// Properties: value (the link), result (the last answer, or null). Event: `veilcore-check`
// (bubbles, composed) with the answer in `detail`, so the page can keep it with the form.
//
// No key, no account, no cookies, no tracking: the only requests are the three public
// registry reads, with no credentials and no referrer. Nothing is written as HTML (no
// innerHTML), so it runs under Trusted Types; styles go in a constructed stylesheet, so in
// current browsers it needs no style-src exception. CSP: script-src for wherever the
// script is served from, connect-src for the registry.
// SPDX-License-Identifier: Apache-2.0

import { checkRecord, DEFAULT_REGISTRY, LinkError, RegistryError, type RecordCheck } from './check.js';

const CSS = `
:host{display:block;font:inherit;color:var(--vc-ink,#16201b);--_accent:var(--vc-accent,#00785a);--_muted:var(--vc-muted,#4a564f);--_line:var(--vc-line,#c7cec8);--_paper:var(--vc-paper,#ffffff);--_bad:var(--vc-bad,#a61b1b);--_warn:var(--vc-warn,#7a4700);max-width:40rem}
:host([hidden]){display:none}
.f{display:grid;gap:.5rem}
label{font-weight:600}
.hint{color:var(--_muted);font-size:.9em;margin:0}
.row{display:flex;gap:.5rem;flex-wrap:wrap}
input{flex:1 1 16rem;min-width:0;font:inherit;padding:.6rem .75rem;border:1px solid var(--_line);border-radius:8px;background:var(--_paper);color:inherit;min-height:44px;box-sizing:border-box}
input:focus-visible,button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid var(--_accent);outline-offset:2px}
input[aria-invalid=true]{border-color:var(--_bad)}
button{font:inherit;font-weight:600;padding:.6rem 1rem;border-radius:8px;border:1px solid var(--_accent);background:var(--_accent);color:#fff;cursor:pointer;min-height:44px}
button[aria-disabled=true]{opacity:.6;cursor:progress}
.out{border:1px solid var(--_line);border-radius:10px;padding:.75rem 1rem;background:var(--_paper);overflow-wrap:anywhere}
.out:empty{display:none}
.out h3{margin:0 0 .25rem;font-size:1em}
.out p{margin:.25rem 0}
.out ul{margin:.25rem 0;padding-left:1.1rem}
.out li{margin:.2rem 0}
.tag{font-weight:600}
.ok .tag{color:var(--_accent)}
.bad .tag,.bad h3{color:var(--_bad)}
.warn .tag{color:var(--_warn)}
.small{font-size:.9em;color:var(--_muted)}
details{margin-top:.5rem}
summary{cursor:pointer;color:var(--_muted);padding:.7rem 0}
a{color:var(--_accent)}
`;

/** The fields a form gets. Exported for tests. */
export const acceptable = (c: RecordCheck | null): boolean => !!c && c.recordExists && c.fingerprintMatches === true;

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { text?: string; className?: string; attrs?: Record<string, string> } = {},
  ...children: Node[]
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (props.text !== undefined) e.textContent = props.text;
  if (props.className) e.className = props.className;
  for (const [k, v] of Object.entries(props.attrs ?? {})) e.setAttribute(k, v);
  for (const c of children) e.append(c);
  return e;
};

/** A line with a word up front, so nothing depends on colour. */
const line = (kind: 'ok' | 'bad' | 'warn' | 'info', tag: string, text: string): HTMLLIElement =>
  el(
    'li',
    { className: kind, attrs: { 'data-kind': kind } },
    el('span', { className: 'tag', text: `${tag} ` }),
    document.createTextNode(text),
  );

let seq = 0;

export class VeilcoreRecordCheck extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes(): string[] {
    return ['label', 'required', 'value'];
  }

  #internals: ElementInternals | null = null;
  #fallback: HTMLInputElement | null = null;
  #input: HTMLInputElement;
  #button: HTMLButtonElement;
  #out: HTMLDivElement;
  #status: HTMLParagraphElement;
  #label: HTMLLabelElement;
  #result: RecordCheck | null = null;
  #run = 0;
  #pending: { link: string; p: Promise<RecordCheck | null> } | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    try {
      this.#internals = this.attachInternals();
    } catch {
      this.#internals = null;
    }
    if (typeof CSSStyleSheet !== 'undefined' && 'adoptedStyleSheets' in root) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
      root.adoptedStyleSheets = [sheet];
    } else {
      // Older browsers: an inline <style> (needs style-src 'unsafe-inline' under a CSP).
      root.append(el('style', { text: CSS }));
    }
    const id = `vc-rc-${++seq}`;
    this.#label = el('label', { attrs: { for: `${id}-in` }, text: 'VeilCore record check link' });
    const hint = el('p', {
      className: 'hint',
      attrs: { id: `${id}-hint` },
      text: 'Paste the link from the record’s “Show someone” page or its certificate’s QR code. It is checked in this browser against the public VeilCore registry. Free; no account.',
    });
    this.#input = el('input', {
      attrs: {
        id: `${id}-in`,
        type: 'url',
        inputmode: 'url',
        autocomplete: 'off',
        spellcheck: 'false',
        placeholder: 'https://veilcore.org/verify/VEIL-…?fp=…',
        'aria-describedby': `${id}-hint ${id}-status`,
      },
    });
    this.#button = el('button', { attrs: { type: 'button' }, text: 'Check' });
    this.#status = el('p', {
      className: 'small',
      attrs: { id: `${id}-status`, role: 'status', 'aria-live': 'polite' },
    });
    this.#out = el('div', { className: 'out', attrs: { 'aria-live': 'polite', 'data-state': 'empty' } });
    root.append(
      el(
        'div',
        { className: 'f' },
        this.#label,
        hint,
        el('div', { className: 'row' }, this.#input, this.#button),
        this.#status,
        this.#out,
      ),
    );

    this.#button.addEventListener('click', () => void this.check());
    this.#input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void this.check();
      }
    });
    this.#input.addEventListener('change', () => void this.check());
    this.#input.addEventListener('paste', () => setTimeout(() => void this.check(), 0));
    this.#input.addEventListener('input', () => {
      if (this.#result) this.#setResult(null);
      this.#sync();
    });
  }

  connectedCallback(): void {
    if (!this.#internals && !this.#fallback && this.getAttribute('name')) {
      // No form association in this browser: a hidden input beside the element carries the value.
      this.#fallback = el('input', { attrs: { type: 'hidden', name: this.getAttribute('name') ?? '' } });
      this.after(this.#fallback);
    }
    const label = this.getAttribute('label');
    if (label) this.#label.textContent = label;
    const v = this.getAttribute('value');
    if (v && !this.#input.value) this.#input.value = v;
    this.#sync();
  }

  disconnectedCallback(): void {
    this.#fallback?.remove();
    this.#fallback = null;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'label' && value) this.#label.textContent = value;
    if (name === 'value' && value !== null && value !== this.#input.value) {
      this.#input.value = value;
      this.#setResult(null);
    }
    this.#sync();
  }

  get value(): string {
    return this.#input.value.trim();
  }
  set value(v: string) {
    this.#input.value = String(v ?? '');
    this.#setResult(null);
    this.#sync();
  }
  /** The last answer, or null before a check (or after the link changed). */
  get result(): RecordCheck | null {
    return this.#result;
  }
  get form(): HTMLFormElement | null {
    return this.#internals?.form ?? null;
  }
  checkValidity(): boolean {
    return this.#internals
      ? this.#internals.checkValidity()
      : !this.hasAttribute('required') || acceptable(this.#result);
  }
  reportValidity(): boolean {
    return this.#internals ? this.#internals.reportValidity() : this.checkValidity();
  }
  formResetCallback(): void {
    this.value = '';
  }

  /** Run the check now. Resolves with the answer (null when nothing could be checked). */
  check(): Promise<RecordCheck | null> {
    const link = this.value;
    // A paste fires both paste and change: one request, not two.
    if (this.#pending && this.#pending.link === link) return this.#pending.p;
    const p = this.#check(link).finally(() => {
      if (this.#pending?.p === p) this.#pending = null;
    });
    this.#pending = { link, p };
    return p;
  }

  async #check(link: string): Promise<RecordCheck | null> {
    const run = ++this.#run;
    if (!link) {
      this.#setResult(null);
      this.#status.textContent = '';
      return null;
    }
    if (this.#result && this.#input.dataset.checked === link) return this.#result;
    // aria-disabled, not disabled: disabling the focused button would drop keyboard focus.
    this.#button.setAttribute('aria-disabled', 'true');
    this.#status.textContent = 'Checking…';
    this.#out.replaceChildren();
    this.#out.dataset.state = 'checking';
    try {
      const c = await checkRecord(link, { registry: this.getAttribute('registry') || DEFAULT_REGISTRY });
      if (run !== this.#run) return null;
      this.#input.dataset.checked = link;
      this.#setResult(c);
      this.#render(c);
      this.#status.textContent = c.summary;
      this.dispatchEvent(new CustomEvent<RecordCheck>('veilcore-check', { detail: c, bubbles: true, composed: true }));
      return c;
    } catch (e) {
      if (run !== this.#run) return null;
      this.#setResult(null);
      const msg =
        e instanceof LinkError || e instanceof RegistryError
          ? e.message
          : 'The check could not run. Nothing was checked; try again.';
      this.#out.replaceChildren(el('ul', {}, line('bad', 'Not checked:', msg)));
      this.#out.dataset.state = 'error';
      this.#status.textContent = msg;
      return null;
    } finally {
      if (run === this.#run) this.#button.removeAttribute('aria-disabled');
    }
  }

  #setResult(c: RecordCheck | null): void {
    this.#result = c;
    if (!c) {
      delete this.#input.dataset.checked;
      this.#out.replaceChildren();
      this.#out.dataset.state = 'empty';
    }
    this.#sync();
  }

  /** Form value and validity. */
  #sync(): void {
    const v = this.value;
    const required = this.hasAttribute('required');
    const ok = acceptable(this.#result);
    if (this.#fallback) this.#fallback.value = v;
    if (this.#internals) {
      this.#internals.setFormValue(v);
      if (required && !ok)
        this.#internals.setValidity(
          { customError: true },
          v
            ? this.#result
              ? 'This link does not lead to a VeilCore record whose fingerprint matches it.'
              : 'Check the VeilCore record link first.'
            : 'Paste the VeilCore record’s check link.',
          this.#input,
        );
      else this.#internals.setValidity({});
    }
    this.#input.setAttribute('aria-invalid', String(!!this.#result && !ok));
    if (required) this.#input.setAttribute('aria-required', 'true');
    else this.#input.removeAttribute('aria-required');
  }

  #render(c: RecordCheck): void {
    const items: HTMLLIElement[] = [];
    let heading: string;
    let headKind: 'ok' | 'bad' | 'warn';
    if (!c.recordExists) {
      heading = 'No record found';
      headKind = 'bad';
      items.push(line('bad', 'Not found:', `The registry has no record ${c.recordId}. Check the link is complete.`));
    } else if (c.fingerprintMatches === false) {
      heading = 'This link does not match the record';
      headKind = 'bad';
      items.push(line('bad', 'Do not rely on it:', c.summary));
    } else {
      heading = c.fingerprintMatches ? 'Record found, link matches' : 'Record found, link not tied to it';
      headKind = c.fingerprintMatches ? 'ok' : 'warn';
      items.push(
        c.fingerprintMatches
          ? line('ok', 'Checked:', 'the link’s fingerprint is the one the registry reports for this record.')
          : line(
              'warn',
              'Not tied to the link:',
              'the link names no fingerprint, so the lines below are about the registry’s fingerprint.',
            ),
      );
      const d = c.dated;
      items.push(
        d.status === 'checked-on-chain'
          ? line(d.testNetwork ? 'warn' : 'ok', 'Checked on Midnight:', d.reason)
          : d.status === 'reported'
            ? line('info', 'Registry’s word:', `${d.inBatch ? `in batch ${d.batch} (checked here); ` : ''}${d.reason}`)
            : d.status === 'not-confirmed'
              ? line('bad', 'Not confirmed:', d.reason)
              : line('info', 'Date:', `${d.inBatch ? `in batch ${d.batch} (checked here). ` : ''}${d.reason}`),
      );
      if (d.testNetwork)
        items.push(line('warn', 'Test network:', 'practice data; its dates carry no evidential weight.'));
      const shown = c.labReceipts.slice(0, 5);
      for (const r of shown)
        items.push(line(r.counts ? 'ok' : 'warn', r.counts ? 'Checked:' : 'Not counted:', r.words));
      if (c.labReceipts.length > shown.length)
        items.push(
          line('info', 'And', `${c.labReceipts.length - shown.length} more signatures (see the full check page).`),
        );
      if (c.labReceipts.length === 0) items.push(line('info', 'Lab signatures:', 'none about this record.'));
      if (c.keyBound.keyInLink !== 'not-given')
        items.push(line(c.keyBound.keyInLink === 'matches' ? 'ok' : 'warn', 'Key:', c.keyBound.reason));
      if (c.supersededBy)
        items.push(line('warn', 'Replaced:', `the holder has replaced this record with ${c.supersededBy}.`));
    }
    for (const p of c.problems) items.push(line('warn', 'Note:', p));

    const page = (this.getAttribute('check-page') || 'https://veilcore.org').replace(/\/+$/, '');
    const children: Node[] = [el('h3', { className: headKind, text: heading }), el('ul', {}, ...items)];
    if (c.recordExists && c.fingerprint && /^https:\/\/[^/?#]+$/.test(page)) {
      // Built from the id and fingerprint, never from the pasted link's host.
      const href = `${page}/verify/${encodeURIComponent(c.recordId)}?fp=${c.fingerprint}`;
      children.push(
        el(
          'p',
          { className: 'small' },
          el('a', { attrs: { href, target: '_blank', rel: 'noopener noreferrer' }, text: 'Open the full check page' }),
          document.createTextNode(' (it also looks the date up on Midnight).'),
        ),
      );
    }
    children.push(
      el(
        'details',
        {},
        el('summary', { text: 'What this does not show' }),
        el('ul', {}, ...c.whatThisDoesNotShow.map((t) => el('li', { text: t }))),
      ),
      el('p', {
        className: 'small',
        text: 'VeilCore never vouches: this says what was checked and whose word the rest is. You decide.',
      }),
    );
    this.#out.replaceChildren(...children);
    this.#out.dataset.state = !c.recordExists
      ? 'not-found'
      : c.fingerprintMatches === false
        ? 'mismatch'
        : c.fingerprintMatches
          ? 'matches'
          : 'unbound';
  }
}

/** Register the element (once). */
export const defineRecordCheck = (name = 'veilcore-record-check'): void => {
  if (typeof customElements !== 'undefined' && !customElements.get(name))
    customElements.define(name, VeilcoreRecordCheck);
};

defineRecordCheck();
