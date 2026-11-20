export type TsaPin = { name: string; certSha256: string; [k: string]: unknown };
export type TsaPinFile = { format: string; pins: TsaPin[] };
export const PINS_FORMAT: string;
export function signerCertificateOf(token: Uint8Array): Uint8Array | undefined;
export function isPinFile(v: unknown): v is TsaPinFile;
export function pinOf(token: Uint8Array, pins: readonly TsaPin[]): Promise<(TsaPin & { cert: Uint8Array }) | undefined>;
export function stripCertificates(token: Uint8Array): Uint8Array;
