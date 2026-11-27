// verify.html run as written, in Node, with just enough of a page for its own scripts: the
// elements it reads and writes by id, and text. No browser is needed, so a test can read what the
// page shows (review 10 of PR #233: the "From the holder's backup file" card had a line no test
// read, because the tests checked only the steps verify-core.js builds, never the card itself).
// Only for tests: the page's script runs in this process.
// SPDX-License-Identifier: Apache-2.0

/** A text node: only its text, and where it sits. */
class Text {
  parent: Node | null = null;
  constructor(readonly data: string) {}
  get textContent(): string {
    return this.data;
  }
  get text(): string {
    return this.data;
  }
}

class Node {
  readonly children: (Node | Text)[] = [];
  readonly attrs: Record<string, string> = {};
  parent: Node | null = null;
  className = '';
  hidden = false;
  readonly style: Record<string, string> = {};
  constructor(readonly tagName: string) {}
  get firstChild(): Node | Text | null {
    return this.children[0] ?? null;
  }
  /** As a page's: a node already somewhere is moved, not copied. */
  appendChild<T extends Node | Text>(c: T): T {
    c.parent?.removeChild(c);
    c.parent = this;
    this.children.push(c);
    return c;
  }
  removeChild(c: Node | Text): void {
    const i = this.children.indexOf(c);
    if (i >= 0) this.children.splice(i, 1);
    c.parent = null;
  }
  setAttribute(k: string, v: string): void {
    this.attrs[k] = String(v);
  }
  getAttribute(k: string): string | null {
    return this.attrs[k] ?? null;
  }
  addEventListener(): void {}
  get textContent(): string {
    return this.children.map((c) => c.textContent).join('');
  }
  set textContent(t: string) {
    while (this.firstChild) this.removeChild(this.firstChild);
    if (t) this.appendChild(new Text(String(t)));
  }
  /** Text with a line break after each block, as a reader sees it. */
  get text(): string {
    const block = /^(p|li|div|h1|h2|h3|ol|ul|tr)$/.test(this.tagName);
    return this.children.map((c) => c.text).join('') + (block ? '\n' : '');
  }
}

/** Runs verify.html's scripts against a stand-in page; resolves once the page says its checks are done. */
export const renderVerifyPage = async (html: string): Promise<{ text: (id: string) => string }> => {
  const byId = new Map<string, Node>();
  const scripts: string[] = [];
  for (const m of html.matchAll(/<script( type="application\/json" id="([^"]+)")?>([\s\S]*?)<\/script>/g)) {
    if (m[2]) {
      const n = new Node('script');
      n.textContent = m[3];
      byId.set(m[2], n);
    } else scripts.push(m[3]);
  }
  const body = new Node('body');
  const document = {
    title: '',
    body,
    getElementById: (id: string): Node => {
      if (!byId.has(id)) byId.set(id, new Node('div'));
      return byId.get(id)!;
    },
    querySelectorAll: (): Node[] => [],
    createElement: (tag: string) => new Node(tag),
    createTextNode: (t: string) => new Text(String(t)),
  };
  // The page's own scripts, run as written: that is the point.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('document', 'window', scripts.join('\n;\n'))(document, { document });
  for (let i = 0; i < 400 && !body.getAttribute('data-checked'); i++) await new Promise((r) => setTimeout(r, 10));
  if (body.getAttribute('data-checked') !== 'yes')
    throw new Error(`verify.html did not finish its checks: ${byId.get('checks')?.text ?? ''}`);
  return { text: (id: string) => byId.get(id)?.text ?? '' };
};
