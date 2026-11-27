// Copying a claim link on the first tap (copy-link.ts), with a clipboard that acts like Safari's:
// it only lets the page write while the tap is still being handled, before anything is awaited
// (PR #231, fourth review, polish 3). A real iPhone check is still needed (see the PR).
import { describe, expect, it, vi } from 'vitest';
import { copyLink, type ClipboardItemCtor, type ClipboardLike } from './copy-link';
import { LinkNotReady } from './link-hashes';

const LINK = 'https://veilcore.org/check-claim#c=abc';

/** A Safari-like clipboard: a write is allowed only during the tap (`tap` runs the handler). */
const safari = (opts: { item?: boolean } = {}) => {
  let inTap = false;
  const text: string[] = [];
  const refused = () => Promise.reject(new DOMException('not allowed', 'NotAllowedError'));
  const clipboard: ClipboardLike = {
    writeText: vi.fn((t: string) => {
      if (!inTap) return refused();
      text.push(t);
      return Promise.resolve();
    }),
    ...(opts.item === false
      ? {}
      : {
          // Asked during the tap, it waits for the item's promise and writes what it gives.
          write: vi.fn(async (items: ClipboardItems) => {
            if (!inTap) return refused();
            const blob = await (items[0] as unknown as FakeItem).parts['text/plain'];
            text.push(typeof blob === 'string' ? blob : await blob.text());
          }),
        }),
  };
  /** Run a tap handler: the tap counts only for its synchronous part. */
  const tap = <T>(handler: () => T): T => {
    inTap = true;
    try {
      return handler();
    } finally {
      inTap = false;
    }
  };
  return { clipboard, text, tap };
};

class FakeItem {
  constructor(readonly parts: Record<string, Blob | string | PromiseLike<Blob | string>>) {}
}
const Item = FakeItem as unknown as ClipboardItemCtor;

/** A link that waits on a network round trip first (link-hashes.ts readyClaimLink). */
const afterLookup =
  (link = LINK) =>
  () =>
    new Promise<string>((r) => setTimeout(() => r(link), 5));

describe('copying a link on the first tap', () => {
  it('a link that needs nothing looked up is written inside the tap', async () => {
    const s = safari();
    const later = vi.fn(afterLookup());
    expect(await s.tap(() => copyLink(LINK, later, { clipboard: s.clipboard, item: Item }))).toEqual({ copied: true });
    expect(s.text).toEqual([LINK]);
    expect(later).not.toHaveBeenCalled();
  });

  it('a link that waits on a look-up: handed to the clipboard inside the tap, written once made', async () => {
    const s = safari();
    expect(await s.tap(() => copyLink(undefined, afterLookup(), { clipboard: s.clipboard, item: Item }))).toEqual({
      copied: true,
    });
    expect(s.text).toEqual([LINK]);
  });

  it('the old way, writeText after the look-up, is refused by this clipboard (what the review found)', async () => {
    const s = safari();
    const old = async () => {
      const link = await afterLookup()();
      await s.clipboard.writeText(link);
    };
    await expect(s.tap(old)).rejects.toThrow('not allowed');
  });

  it('no ClipboardItem: the link comes back ready, and the next tap copies it at once', async () => {
    const s = safari({ item: false });
    const r = await s.tap(() => copyLink(undefined, afterLookup(), { clipboard: s.clipboard, item: null }));
    expect(r).toEqual({ copied: false, link: LINK });
    expect(s.text).toEqual([]);
    // The page's "ready" button: nothing left to wait for.
    await s.tap(() => s.clipboard.writeText(LINK));
    expect(s.text).toEqual([LINK]);
  });

  it('a clipboard that refuses the item too: the same, the link comes back ready', async () => {
    const s = safari();
    const refusing = { ...s.clipboard, write: vi.fn(() => Promise.reject(new Error('refused'))) };
    expect(await s.tap(() => copyLink(undefined, afterLookup(), { clipboard: refusing, item: Item }))).toEqual({
      copied: false,
      link: LINK,
    });
  });

  it('a link that can’t be made is said as that, and nothing is written', async () => {
    const s = safari();
    const notReady = () => new Promise<string>((_r, j) => setTimeout(() => j(new LinkNotReady()), 5));
    await expect(
      s.tap(() => copyLink(undefined, notReady, { clipboard: s.clipboard, item: Item })),
    ).rejects.toBeInstanceOf(LinkNotReady);
    await expect(
      s.tap(() => copyLink(undefined, notReady, { clipboard: s.clipboard, item: null })),
    ).rejects.toBeInstanceOf(LinkNotReady);
    expect(s.text).toEqual([]);
  });
});
