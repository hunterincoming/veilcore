// The widths each home page photo comes in (public/media/home).
// SPDX-License-Identifier: Apache-2.0

export type PhotoName = 'cutting' | 'greenhouse' | 'lab' | 'hand' | 'cattle';

/**
 * A phone at 3x needs about 1000 pixels for a photo's 84vw: the 1200 wide copy, not the 1600
 * (live walk, 18 Nov). The greenhouse's largest is 1280, which serves that already.
 */
export const photoSrcSet = (name: PhotoName): string =>
  name === 'greenhouse'
    ? `/media/home/${name}-800.webp 800w, /media/home/${name}.webp 1280w`
    : `/media/home/${name}-800.webp 800w, /media/home/${name}-1200.webp 1200w, /media/home/${name}.webp 1600w`;
