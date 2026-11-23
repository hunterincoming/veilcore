// SPDX-License-Identifier: Apache-2.0
/**
 * Contract v2's temporary maintenance key, kept ONLY as an age-encrypted file on the maintainer's
 * Mac (docs/contract-v2.md 5: never on paper, never in a password manager). age asks for the
 * passphrase on the terminal itself; the key reaches age on its standard input and never the
 * screen, a log or the clipboard. Used by the v2 deploy (launcher/deploy-v2.ts) and by the
 * committee launcher's handover (launcher/committee.ts, --temp-key-file).
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';

export class KeyFileError extends Error {}

export type KeyStore = {
  /** Encrypt `keyHex` to a NEW file. */
  create(file: string, keyHex: string): void;
  /** Decrypt the file; the key, 64 hex. */
  open(file: string): string;
};

const AGE_MISSING =
  'The age command is not installed, and the temporary key is kept only as an age-encrypted file. Install it ' +
  '(brew install age), then run this again. Nothing was done.';

export const ageKeyStore: KeyStore = {
  create(file, keyHex) {
    if (spawnSync('age', ['--version'], { stdio: 'ignore' }).status !== 0) throw new KeyFileError(AGE_MISSING);
    if (existsSync(file))
      throw new KeyFileError(`${file} already exists; a key file is never written over. Choose another --key-file.`);
    const r = spawnSync('age', ['--passphrase', '--output', file], {
      input: `${keyHex}\n`,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    if (r.status !== 0 || !existsSync(file))
      throw new KeyFileError('age did not write the key file. Nothing was sent.');
    chmodSync(file, 0o600);
  },
  open(file) {
    if (spawnSync('age', ['--version'], { stdio: 'ignore' }).status !== 0) throw new KeyFileError(AGE_MISSING);
    const r = spawnSync('age', ['--decrypt', file], { stdio: ['inherit', 'pipe', 'inherit'] });
    const key = r.stdout?.toString().trim().toLowerCase() ?? '';
    if (r.status !== 0 || !/^[0-9a-f]{64}$/.test(key))
      throw new KeyFileError(`Could not open the key file ${file} (wrong passphrase?). Nothing was sent.`);
    return key;
  },
};
