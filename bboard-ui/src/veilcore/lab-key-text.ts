// A laboratory key as people read it (lab-attest.ts keyHex: x then y, 64 hex characters each).
// Kept apart from lab-attest.ts so pages that only show a key don't load the signing code.
// SPDX-License-Identifier: Apache-2.0

/** The key short enough to read aloud and compare: the first and last 8 characters. */
export const keyShort = (keyText: string): string => `${keyText.slice(0, 8)}…${keyText.slice(-8)}`;
