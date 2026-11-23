// Types for fingerprints.mjs. SPDX-License-Identifier: Apache-2.0
export declare const ROOT: string;
export declare const FINGERPRINTS_V2: string;
export declare const V2_CONTRACTS: readonly ['veilcore', 'veilcore-claims'];
export declare const V2_KEY_SLOT: 'v4';
export declare const EXPECTED_CIRCUITS: Readonly<Record<'veilcore' | 'veilcore-claims', number>>;
export type V2Pins = Record<'veilcore' | 'veilcore-claims', Record<string, string>>;
export declare const parseFingerprintsV2: (text: string) => { pins: V2Pins; commit?: string; compiler?: string };
export declare const loadFingerprintsV2: (file?: string) => {
  pins: V2Pins;
  commit?: string;
  compiler?: string;
  fileSha256: string;
};
export declare const slotOfKey: (vk: Uint8Array) => 'v3' | 'v4' | undefined;
export declare const sha256Hex: (bytes: Uint8Array) => string;
