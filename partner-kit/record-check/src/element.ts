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
// found whose fingerprint matches the link and nothing contradicts it: see `acceptable`),
// registry (default: VeilCore's public registry), check-page (where "Open the full check
// page" points; default https://veilcore.org), label, value,
// allow-test-network (accept a record dated on a test network; for trying the field out),
// when-unreachable="allow" (if the registry can't be reached, let the form send the link
// marked as not checked: the form also gets `<name>-unchecked=registry-unreachable`, and
// the event's detail is { checked: false, reason: 'registry-unreachable', … }. Without it,
// a required field blocks the form while the registry is down).
// Properties: value (the link), result (the answer for the link in the box now, or null),
// unchecked (true while the link goes unchecked under when-unreachable="allow").
// Event: `veilcore-check` (bubbles, composed) with the answer in `detail`, so the page can
// keep it with the form. An answer counts only for the link it was made for: typing in
// the box drops it, and an answer that comes back after the link changed is thrown away.
//
// No key, no account, no cookies, no tracking: the only requests are the three public
// registry reads, with no credentials and no referrer. Nothing is written as HTML (no
// innerHTML), so it runs under Trusted Types; styles go in a constructed stylesheet, so in
// current browsers it needs no style-src exception. CSP: script-src for wherever the
// script is served from, connect-src for the registry.
// SPDX-License-Identifier: Apache-2.0

import {
  acceptable,
  checkRecord,
  DEFAULT_REGISTRY,
  FORMAT,
  LinkError,
  RegistryError,
  type RecordCheck,
} from './check.js';
import { CUT } from './link.js';

// Colours, each overridable by a --vc-* property on the element: --vc-accent (the button,
// links, the focus ring; VeilCore's stamp red), --vc-ok (a check that passed), --vc-bad
// (one that failed), --vc-warn, --vc-ink, --vc-muted, --vc-line, --vc-paper.
const CSS = `
:host{display:block;font:inherit;color:var(--vc-ink,#1e2227);--_accent:var(--vc-accent,#b3173b);--_ok:var(--vc-ok,#2e6b55);--_muted:var(--vc-muted,#575e66);--_line:var(--vc-line,#c2c7cd);--_paper:var(--vc-paper,#ffffff);--_bad:var(--vc-bad,#9e2a0b);--_warn:var(--vc-warn,#7a4700);max-width:40rem}
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
.ok .tag{color:var(--_ok)}
.bad .tag,.bad h3{color:var(--_bad)}
.warn .tag{color:var(--_warn)}
.small{font-size:.9em;color:var(--_muted)}
details{margin-top:.5rem}
summary{cursor:pointer;color:var(--_muted);padding:.7rem 0}
a{color:var(--_accent)}
`;

export { acceptable };

/** The event detail when the registry could not be reached and the form allows that. */
export type UncheckedLink = {
  readonly format: typeof FORMAT;
  readonly checked: false;
  readonly reason: 'registry-unreachable';
  readonly link: string;
  readonly message: string;
  readonly at: string;
};

/** What the field holds an answer for: always tied to the exact link it was made for. */
type State = { readonly link: string; readonly result: RecordCheck } | { readonly link: string; readonly down: string };

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
    return ['label', 'required', 'value', 'allow-test-network', 'when-unreachable', 'name'];
  }

  #internals: ElementInternals | null = null;
  #fallback: HTMLInputElement | null = null;
  #fallbackUnchecked: HTMLInputElement | null = null;
  #input: HTMLInputElement;
  #button: HTMLButtonElement;
  #out: HTMLDivElement;
  #status: HTMLParagraphElement;
  #label: HTMLLabelElement;
  #state: State | null = null;
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
    // Leaving the box (as a click on the form's submit button does) checks a link not yet
    // tried; it doesn't retry one the registry didn't answer for, which would hold up a
    // form that accepts unchecked links. Enter or the button retries.
    this.#input.addEventListener('change', () => {
      if (!this.#current()) void this.check();
    });
    this.#input.addEventListener('paste', () => setTimeout(() => void this.check(), 0));
    // Any edit drops the answer and cancels a check in flight: an answer is only ever
    // for the link it was made for.
    this.#input.addEventListener('input', () => this.#drop());
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
    this.#fallbackUnchecked?.remove();
    this.#fallbackUnchecked = null;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'label' && value) this.#label.textContent = value;
    if (name === 'value' && value !== null && value !== this.#input.value) {
      this.#input.value = value;
      this.#drop();
    }
    // The rules changed under an answer already shown: show it again by the new rules.
    if ((name === 'allow-test-network' || name === 'when-unreachable' || name === 'required') && this.#state)
      this.#show(this.#state);
    this.#sync();
  }

  get value(): string {
    return this.#input.value.trim();
  }
  set value(v: string) {
    this.#input.value = String(v ?? '');
    this.#drop();
  }
  /** The answer for the link in the box now; null before a check, or after the link changed. */
  get result(): RecordCheck | null {
    const st = this.#current();
    return st && 'result' in st ? st.result : null;
  }
  /** True while the link goes with the form unchecked (registry unreachable, when-unreachable="allow"). */
  get unchecked(): boolean {
    const st = this.#current();
    return !!st && 'down' in st && this.#allowUnreachable();
  }
  get form(): HTMLFormElement | null {
    return this.#internals?.form ?? null;
  }
  checkValidity(): boolean {
    return this.#internals ? this.#internals.checkValidity() : !this.hasAttribute('required') || this.#ok();
  }
  /** Why the form refuses the link now ('' when it doesn't). */
  get validationMessage(): string {
    if (this.#internals) return this.#internals.validationMessage;
    return this.checkValidity() ? '' : this.#why();
  }
  reportValidity(): boolean {
    return this.#internals ? this.#internals.reportValidity() : this.checkValidity();
  }
  formResetCallback(): void {
    this.value = '';
  }

  /** Run the check now. Resolves with the answer (null when nothing could be checked, or the link changed meanwhile). */
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

  #allowUnreachable(): boolean {
    return (this.getAttribute('when-unreachable') ?? '').trim().toLowerCase() === 'allow';
  }
  #allowTestNetwork(): boolean {
    return this.hasAttribute('allow-test-network');
  }
  /** The state, only if it is about the link in the box now. */
  #current(): State | null {
    return this.#state && this.#state.link === this.value ? this.#state : null;
  }
  #ok(): boolean {
    const st = this.#current();
    if (!st) return false;
    if ('down' in st) return this.#allowUnreachable();
    return acceptable(st.result, { allowTestNetwork: this.#allowTestNetwork() });
  }

  /** Drop the answer and cancel any check in flight. */
  #drop(): void {
    ++this.#run;
    this.#pending = null;
    this.#state = null;
    this.#out.replaceChildren();
    this.#out.dataset.state = 'empty';
    this.#status.textContent = '';
    this.#button.removeAttribute('aria-disabled');
    this.#sync();
  }

  async #check(link: string): Promise<RecordCheck | null> {
    const st = this.#current();
    if (st && 'result' in st && st.link === link) return st.result;
    // Clear first: nothing about another link (or an earlier try) stands while this runs.
    this.#drop();
    const run = this.#run;
    if (!link) return null;
    // aria-disabled, not disabled: disabling the focused button would drop keyboard focus.
    this.#button.setAttribute('aria-disabled', 'true');
    this.#status.textContent = 'Checking…';
    this.#out.dataset.state = 'checking';
    // Only an answer for the link still in the box, from the latest check, is kept.
    const stale = () => run !== this.#run || this.value !== link;
    try {
      const c = await checkRecord(link, { registry: this.getAttribute('registry') || DEFAULT_REGISTRY });
      if (stale()) return null;
      this.#state = { link, result: c };
      this.#show(this.#state);
      this.#sync();
      this.dispatchEvent(new CustomEvent<RecordCheck>('veilcore-check', { detail: c, bubbles: true, composed: true }));
      return c;
    } catch (e) {
      if (stale()) return null;
      if (e instanceof RegistryError) {
        this.#state = { link, down: e.message };
        this.#show(this.#state);
        this.#sync();
        const detail: UncheckedLink = {
          format: FORMAT,
          checked: false,
          reason: 'registry-unreachable',
          link,
          message: e.message,
          at: new Date().toISOString(),
        };
        if (this.#allowUnreachable())
          this.dispatchEvent(
            new CustomEvent<UncheckedLink>('veilcore-check', { detail, bubbles: true, composed: true }),
          );
        return null;
      }
      const msg = e instanceof LinkError ? e.message : 'The check could not run. Nothing was checked; try again.';
      this.#out.replaceChildren(el('ul', {}, line('bad', 'Not checked:', msg)));
      this.#out.dataset.state = 'error';
      this.#status.textContent = msg;
      this.#sync();
      return null;
    } finally {
      if (run === this.#run) this.#button.removeAttribute('aria-disabled');
    }
  }

  #show(st: State): void {
    if ('result' in st) {
      this.#render(st.result);
      this.#status.textContent = st.result.summary;
      return;
    }
    const items = [line('bad', 'Not checked:', st.down)];
    if (this.#allowUnreachable())
      items.push(
        line(
          'warn',
          'Sent unchecked:',
          'this form accepts the link while the registry is not answering. It goes with the form marked as not checked.',
        ),
      );
    else if (this.hasAttribute('required'))
      items.push(line('info', 'Try again:', 'the form can be sent once the link has been checked.'));
    this.#out.replaceChildren(el('ul', {}, ...items));
    this.#out.dataset.state = 'unreachable';
    this.#status.textContent = st.down;
  }

  /** Why the form refuses the link now, in plain words. */
  #why(): string {
    const v = this.value;
    if (!v) return 'Paste the VeilCore record’s check link.';
    const st = this.#current();
    if (!st) return 'Check the VeilCore record link first.';
    if ('down' in st)
      return 'The VeilCore registry did not answer, so the link could not be checked. Try again shortly.';
    const c = st.result;
    if (c.linkLooksCut) return CUT;
    if (!c.recordExists) return 'The registry has no record for this link. Check the link is complete.';
    if (c.fingerprintMatches !== true)
      return c.fingerprintMatches === null
        ? 'This link names no fingerprint. Ask for the check link the site makes (it contains ?fp=).'
        : 'This link does not lead to a VeilCore record whose fingerprint matches it.';
    if (c.dated.status === 'proof-fails') return 'The registry’s proof for this record does not check out.';
    if (c.dated.status === 'not-confirmed') return 'The record’s date stamp was not confirmed on Midnight.';
    if (c.disclosedFieldsMatch === false || c.keyBound.keyInLink === 'does-not-match')
      return 'Something in the link does not match the record.';
    if (c.dated.testNetwork === true)
      return 'This record is dated on a test network (practice data). This form does not accept it.';
    return 'This link was not accepted.';
  }

  /** Form value and validity, from the answer for the link in the box now. */
  #sync(): void {
    const v = this.value;
    const name = this.getAttribute('name') ?? '';
    const required = this.hasAttribute('required');
    const st = this.#current();
    const ok = this.#ok();
    const unchecked = !!st && 'down' in st && this.#allowUnreachable();
    if (this.#fallback) {
      this.#fallback.value = v;
      if (unchecked && name && !this.#fallbackUnchecked) {
        this.#fallbackUnchecked = el('input', {
          attrs: { type: 'hidden', name: `${name}-unchecked`, value: 'registry-unreachable' },
        });
        this.#fallback.after(this.#fallbackUnchecked);
      } else if (!unchecked && this.#fallbackUnchecked) {
        this.#fallbackUnchecked.remove();
        this.#fallbackUnchecked = null;
      }
    }
    if (this.#internals) {
      if (unchecked && name) {
        const fd = new FormData();
        fd.append(name, v);
        fd.append(`${name}-unchecked`, 'registry-unreachable');
        this.#internals.setFormValue(fd);
      } else this.#internals.setFormValue(v);
      if (required && !ok) this.#internals.setValidity({ customError: true }, this.#why(), this.#input);
      else this.#internals.setValidity({});
    }
    this.#input.setAttribute('aria-invalid', String(!!st && 'result' in st && !ok));
    if (required) this.#input.setAttribute('aria-required', 'true');
    else this.#input.removeAttribute('aria-required');
  }

  #receiptLine(r: RecordCheck['labReceipts'][number]): HTMLLIElement {
    if (r.kind === 'custody-statement') return line('info', 'Not counted:', r.words);
    if (!r.counts) return line('warn', 'Not counted:', r.words);
    const cu = r.custody;
    if (cu && !cu.clean) {
      if (cu.state === 'sealed' && cu.senderSays?.covered === 'changed')
        return line('bad', 'Changed after signing (sender’s word):', r.words);
      if (cu.state === 'sealed' && cu.senderSays?.differingFields.length)
        return line('bad', 'Does not match (sender’s word):', r.words);
      if (cu.covered === 'changed') return line('bad', 'Changed after signing:', r.words);
      if (cu.differences.length) return line('bad', 'Does not match:', r.words);
      return line('info', 'Receipt:', r.words);
    }
    return line('ok', 'Checked:', r.words);
  }

  #render(c: RecordCheck): void {
    const items: HTMLLIElement[] = [];
    let heading: string;
    let headKind: 'ok' | 'bad' | 'warn';
    const allowTest = this.#allowTestNetwork();
    if (c.linkLooksCut) {
      heading = 'This link looks cut off';
      headKind = 'bad';
      items.push(line('bad', 'Not checked:', 'Ask for the whole link.'));
    } else if (!c.recordExists) {
      heading = 'No record found';
      headKind = 'bad';
      items.push(line('bad', 'Not found:', `The registry has no record ${c.recordId}. Check the link is complete.`));
    } else if (c.fingerprintMatches === false) {
      heading = 'This link does not match the record';
      headKind = 'bad';
      items.push(
        line(
          'bad',
          'Do not rely on it:',
          'the link was made for a different fingerprint than the registry reports for this record. Nothing else was checked. Ask for the record’s current check link.',
        ),
      );
    } else {
      const d = c.dated;
      if (!c.fingerprintMatches) {
        heading = 'Record found, link not tied to it';
        headKind = 'warn';
      } else if (d.status === 'proof-fails' || d.status === 'not-confirmed') {
        heading = 'Record found, but its date does not check out';
        headKind = 'bad';
      } else if (d.testNetwork && !allowTest) {
        heading = 'Record found, dated on a test network';
        headKind = 'warn';
      } else {
        heading = 'Record found, link matches';
        headKind = 'ok';
      }
      items.push(
        c.fingerprintMatches
          ? line('ok', 'Checked:', 'the link’s fingerprint is the one the registry reports for this record.')
          : line(
              'warn',
              'Not tied to the link:',
              'the link names no fingerprint, so the lines below are about the registry’s fingerprint.',
            ),
      );
      items.push(
        d.status === 'checked-on-chain'
          ? line(d.testNetwork ? 'warn' : 'ok', 'Checked on Midnight:', d.reason)
          : d.status === 'reported'
            ? line('info', 'Registry’s word:', `${d.inBatch ? `in batch ${d.batch} (checked here); ` : ''}${d.reason}`)
            : d.status === 'not-confirmed'
              ? line('bad', 'Not confirmed:', d.reason)
              : d.status === 'proof-fails'
                ? line('bad', 'Proof does not check out:', d.reason)
                : line('info', 'Date:', `${d.inBatch ? `in batch ${d.batch} (checked here). ` : ''}${d.reason}`),
      );
      if (d.testNetwork)
        items.push(
          line(
            'warn',
            'Test network:',
            allowTest || !this.hasAttribute('required')
              ? 'practice data; its dates carry no evidential weight.'
              : 'practice data; its dates carry no evidential weight, so this form does not accept it.',
          ),
        );
      const shown = c.labReceipts.slice(0, 5);
      for (const r of shown) items.push(this.#receiptLine(r));
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
    // The cut-off line already says it all.
    for (const p of c.problems) if (!(c.linkLooksCut && p === CUT)) items.push(line('warn', 'Note:', p));

    const page = (this.getAttribute('check-page') || 'https://veilcore.org').replace(/\/+$/, '');
    const children: Node[] = [el('h3', { className: headKind, text: heading }), el('ul', {}, ...items)];
    if (c.recordExists && c.fingerprint && !c.linkLooksCut && /^https:\/\/[^/?#]+$/.test(page)) {
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
    this.#out.dataset.state = c.linkLooksCut
      ? 'cut'
      : !c.recordExists
        ? 'not-found'
        : c.fingerprintMatches === false
          ? 'mismatch'
          : c.fingerprintMatches
            ? 'matches'
            : 'unbound';
    this.#out.dataset.accepted = String(acceptable(c, { allowTestNetwork: allowTest }));
  }
}

/** Register the element (once). */
export const defineRecordCheck = (name = 'veilcore-record-check'): void => {
  if (typeof customElements !== 'undefined' && !customElements.get(name))
    customElements.define(name, VeilcoreRecordCheck);
};

defineRecordCheck();
