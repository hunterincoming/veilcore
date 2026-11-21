// The public pages' photos (public/media/home, credited in CREDITS.md there): Mako's own
// re-exports (21 November 2026, 92 to 190 KB each) as the large copy, and an 800-wide copy made
// from each for phones and small frames. Every <img> gets its real width and height, so nothing
// shifts as it loads.
// SPDX-License-Identifier: Apache-2.0

export type PhotoName = 'cutting' | 'greenhouse' | 'lab' | 'hand' | 'cattle' | 'jar' | 'leaf' | 'seed';

/** Each photo's large copy, as Mako exported it: its width and height in pixels. */
export const PHOTO_SIZE: Record<PhotoName, readonly [number, number]> = {
  cattle: [1200, 1803],
  cutting: [1200, 1800],
  greenhouse: [1296, 864],
  hand: [1200, 1800],
  jar: [1200, 1800],
  lab: [1600, 1067],
  leaf: [1458, 972],
  seed: [1800, 1350],
};

/** The large copy. */
export const photoSrc = (name: PhotoName): string => `/media/home/${name}.webp`;

/** The two copies: 800 wide, and Mako's own. The browser picks by the `sizes` it is given. */
export const photoSrcSet = (name: PhotoName): string =>
  `/media/home/${name}-800.webp 800w, ${photoSrc(name)} ${PHOTO_SIZE[name][0]}w`;

/**
 * How wide the gallery's photo is drawn. On a phone the frame is about 46svh tall and the photo
 * covers it (home.css object-fit: cover), so a landscape photo is drawn about 1.5 x 46svh = 69svh
 * wide, wider than the 84vw frame: a 390 x 844 phone needs about 582 CSS pixels, not 328
 * (review, 18 Nov). Mako's portrait photos are drawn at the frame's width, less than that.
 */
export const GALLERY_SIZES = '(max-width: 1080px) max(84vw, 69svh), 680px';
