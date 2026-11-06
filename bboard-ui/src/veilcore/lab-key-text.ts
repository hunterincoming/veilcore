// A laboratory key as people read it (lab-attest.ts keyHex: x then y, 64 hex characters each).
// Kept apart from lab-attest.ts so pages that only show a key don't load the signing code.
// SPDX-License-Identifier: Apache-2.0

/** The key short enough to read aloud and compare: the first and last 8 characters. */
export const keyShort = (keyText: string): string => `${keyText.slice(0, 8)}…${keyText.slice(-8)}`;

/** The id suffix of a laboratory's claims-key binding attestation (claims-key.ts). */
export const CLAIMS_KEY_SUFFIX = '_ck1_';

/** Is this attestation id a claims-key binding (so receipt and report lists leave it out)? */
export const isClaimsKeyBinding = (attestationId: string): boolean => attestationId.includes(CLAIMS_KEY_SUFFIX);
