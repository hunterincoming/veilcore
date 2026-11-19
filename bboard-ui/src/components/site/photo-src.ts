// The widths each home page photo comes in (public/media/home).
// SPDX-License-Identifier: Apache-2.0

export type PhotoName = 'cutting' | 'greenhouse' | 'lab' | 'hand' | 'cattle';

/**
 * The widths each photo comes in: 800, 1200 and 1600 (the greenhouse's largest is 1280). The
 * browser picks by GALLERY_SIZES, below.
 */
export const photoSrcSet = (name: PhotoName): string =>
  name === 'greenhouse'
    ? `/media/home/${name}-800.webp 800w, /media/home/${name}.webp 1280w`
    : `/media/home/${name}-800.webp 800w, /media/home/${name}-1200.webp 1200w, /media/home/${name}.webp 1600w`;

/**
 * How wide the gallery's photo is drawn. On a phone the frame is about 46svh tall and the photo
 * covers it (home.css object-fit: cover), so it is drawn about 1.5 x 46svh = 69svh wide, wider
 * than the 84vw frame: a 390 x 844 phone needs about 582 CSS pixels, not 328 (review, 18 Nov).
 */
export const GALLERY_SIZES = '(max-width: 1080px) max(84vw, 69svh), 680px';
