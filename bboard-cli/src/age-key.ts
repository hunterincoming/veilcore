// SPDX-License-Identifier: Apache-2.0
/**
 * Contract v2's temporary maintenance key, kept ONLY as an age-encrypted file on the maintainer's
 * Mac (docs/contract-v2.md 5: never on paper, never in a password manager).
 *
 * The file is written here, in age's own passphrase format (age-encryption.org/v1, the scrypt
 * recipient), with the passphrase the operator typed at the tool's hidden prompt. It is not
 * written by `age -p`, because age, given an EMPTY passphrase, makes one up and prints it on the
 * terminal. Here an empty or short passphrase is refused. The file is then opened once with the
 * real `age --decrypt` (age asks for the passphrase itself), so every file this writes is proved
 * readable by age before anything is sent. The key never reaches the screen, a log or the
 * clipboard; age's decrypt hands it back on a pipe. Used by the v2 deploy (launcher/deploy-v2.ts) and by the
 * committee launcher's handover (launcher/committee.ts, --temp-key-file).
 */
import { spawnSync } from 'node:child_process';
import { createCipheriv, createHmac, hkdfSync, randomBytes, scryptSync } from 'node:crypto';
import { chmodSync, existsSync, writeFileSync } from 'node:fs';

export class KeyFileError extends Error {}

export type KeyStore = {
  /** Encrypt `keyHex` to a NEW file with `passphrase` (never empty: see passphraseProblem). */
  create(file: string, keyHex: string, passphrase: string): void;
  /** Decrypt the file; the key, 64 hex. */
  open(file: string): string;
};

const AGE_MISSING =
  'The age command is not installed, and the temporary key is kept only as an age-encrypted file. Install it ' +
  '(brew install age), then run this again. Nothing was done.';

export const ageKeyStore: KeyStore = {
  create(file, keyHex, passphrase) {
    if (spawnSync('age', ['--version'], { stdio: 'ignore' }).status !== 0) throw new KeyFileError(AGE_MISSING);
    if (existsSync(file))
      throw new KeyFileError(`${file} already exists; a key file is never written over. Choose another --key-file.`);
    const problem = passphraseProblem(passphrase);
    if (problem !== null) throw new KeyFileError(problem);
    writeFileSync(file, encryptWithPassphrase(Buffer.from(`${keyHex}\n`), passphrase), { flag: 'wx', mode: 0o600 });
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

/** The shortest passphrase accepted. */
export const MIN_PASSPHRASE = 12;

/** Why a passphrase is refused, or null. */
export const passphraseProblem = (p: string): string | null =>
  p.length === 0
    ? 'The passphrase is empty. Type one of your own; it is the only thing that protects the key file.'
    : [...p].length < MIN_PASSPHRASE
      ? `The passphrase is ${[...p].length} characters; use at least ${MIN_PASSPHRASE}.`
      : null;

const b64 = (b: Buffer): string => b.toString('base64').replace(/=+$/, '');

/** ChaCha20-Poly1305 encryption, the tag appended. */
const seal = (key: Buffer, nonce: Buffer, data: Buffer): Buffer => {
  const c = createCipheriv('chacha20-poly1305', key, nonce, { authTagLength: 16 });
  return Buffer.concat([c.update(data), c.final(), c.getAuthTag()]);
};

/** age's work factor for a passphrase file (the age command's own default). */
const LOG_N = 18;

/**
 * `data` encrypted to an age v1 file with one scrypt recipient (the format `age -p` writes,
 * https://age-encryption.org/v1). The payload must fit one 64 KiB chunk (a key does).
 */
export const encryptWithPassphrase = (data: Buffer, passphrase: string): Buffer => {
  if (data.length > 64 * 1024) throw new Error('Only small payloads are written here.');
  const fileKey = randomBytes(16);
  const salt = randomBytes(16);
  const wrapKey = scryptSync(
    Buffer.from(passphrase, 'utf8'),
    Buffer.concat([Buffer.from('age-encryption.org/v1/scrypt'), salt]),
    32,
    { N: 2 ** LOG_N, r: 8, p: 1, maxmem: 512 * 1024 * 1024 },
  );
  const body = b64(seal(wrapKey, Buffer.alloc(12), fileKey));
  const header = `age-encryption.org/v1\n-> scrypt ${b64(salt)} ${LOG_N}\n${body}\n---`;
  const macKey = Buffer.from(hkdfSync('sha256', fileKey, Buffer.alloc(0), 'header', 32));
  const mac = b64(createHmac('sha256', macKey).update(header).digest());
  const nonce = randomBytes(16);
  const payloadKey = Buffer.from(hkdfSync('sha256', fileKey, nonce, 'payload', 32));
  const chunkNonce = Buffer.alloc(12);
  chunkNonce[11] = 1; // counter 0, the last chunk
  return Buffer.concat([Buffer.from(`${header} ${mac}\n`), nonce, seal(payloadKey, chunkNonce, data)]);
};
