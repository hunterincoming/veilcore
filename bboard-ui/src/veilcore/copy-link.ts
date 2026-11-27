// Copying a claim link on the first tap, even when the link waits on a look-up (link-hashes.ts).
//
// A browser lets a page write to the clipboard only during the tap itself. Safari on iPhone and
// Mac is the strictest: a `writeText` that runs after a network round trip is refused
// (NotAllowedError), so a link that had to look up a saved id first was never copied (PR #231,
// fourth review). So:
//   - a link that needs nothing looked up is written straight away, inside the tap;
//   - one that does is handed to the clipboard inside the tap as a promise of the link
//     (ClipboardItem), where the browser has it: Safari waits for it and writes it;
//   - where neither works, the link is made and given back ready, and the page shows a button
//     that copies it on the next tap, with nothing left to wait for.
// SPDX-License-Identifier: Apache-2.0

/** The clipboard calls used here (navigator.clipboard). */
export type ClipboardLike = {
  readonly writeText: (text: string) => Promise<void>;
  readonly write?: (items: ClipboardItems) => Promise<void>;
};

/** A ClipboardItem constructor, where the browser has one. */
export type ClipboardItemCtor = new (
  items: Record<string, string | Blob | PromiseLike<string | Blob>>,
) => ClipboardItem;

/** Copied, or made but not copied: the page offers a button that copies `link` on the next tap. */
export type CopyResult = { readonly copied: true } | { readonly copied: false; readonly link: string };

const browserClipboard = (): ClipboardLike | undefined =>
  typeof navigator === 'undefined' ? undefined : (navigator as { clipboard?: ClipboardLike }).clipboard;

const browserItem = (): ClipboardItemCtor | undefined =>
  (globalThis as { ClipboardItem?: ClipboardItemCtor }).ClipboardItem;

const writeOrHand = async (clip: ClipboardLike | undefined, link: string): Promise<CopyResult> => {
  try {
    if (!clip) throw new Error('no clipboard');
    await clip.writeText(link);
    return { copied: true };
  } catch {
    return { copied: false, link };
  }
};

/**
 * Copy a link from a tap. `now` is the link when nothing has to be looked up (written at once);
 * otherwise `later` makes it. Call it from the tap handler before anything is awaited, so the
 * clipboard is asked while the tap still counts. Throws what `later` throws (LinkNotReady).
 */
export const copyLink = async (
  now: string | undefined,
  later: () => Promise<string>,
  deps: { clipboard?: ClipboardLike; item?: ClipboardItemCtor | null } = {},
): Promise<CopyResult> => {
  const clip = deps.clipboard ?? browserClipboard();
  if (now !== undefined) return writeOrHand(clip, now);
  const Item = deps.item === null ? undefined : (deps.item ?? browserItem());
  const making = later();
  let handed: Promise<boolean> | undefined;
  if (clip?.write && Item) {
    try {
      // Asked now, inside the tap; the browser writes the text once the link is made.
      const written = clip.write([
        new Item({ 'text/plain': making.then((l) => new Blob([l], { type: 'text/plain' })) }),
      ]);
      handed = written.then(
        () => true,
        () => false,
      );
    } catch {
      handed = undefined;
    }
  }
  // A link that can't be made is said as that, whatever the clipboard did.
  const link = await making;
  if (handed && (await handed)) return { copied: true };
  return writeOrHand(clip, link);
};
