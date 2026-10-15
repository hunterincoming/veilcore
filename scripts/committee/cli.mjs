#!/usr/bin/env node
// The committee tools that never touch a network: make a key, check a stored key, read a
// request, sign a request. Each holder runs these on their own computer.
//
//   node scripts/committee/cli.mjs keygen --holder mako --paper
//   node scripts/committee/cli.mjs keygen --holder mako --out /Volumes/KEYS/mako-key.json
//   node scripts/committee/cli.mjs check  --card committee-key-mako.json [--key-file FILE]
//   node scripts/committee/cli.mjs read   --request request.json
//   node scripts/committee/cli.mjs sign   --request request.json [--key-file FILE] [--out FILE]
//
// A signing key is shown on screen only in --paper mode, and is never written to a log.
// With --out it is written to a file you choose (0600, never over an existing file) and
// not shown. Without --key-file, a key is typed in from paper, hidden.
// SPDX-License-Identifier: Apache-2.0

import { closeSync, constants, existsSync, fsyncSync, openSync, readFileSync, writeSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { sampleSigningKey } from '@midnight-ntwrk/ledger-v8';
import { readMainnetPins } from '../mainnet-pins.mjs';
import {
  checkKeyCard,
  describeRequest,
  fingerprint,
  groupHex,
  keyMatchesCard,
  makeKeyCard,
  parseSigningKey,
  rebuildRequest,
  signRequest,
} from './core.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export class Stop extends Error {}

/** Flags as a map: --name value, or --flag alone (true). */
export const parseArgs = (argv) => {
  const [command, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) throw new Stop(`Unexpected "${a}". Options start with --.`);
    const name = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) flags[name] = true;
    else {
      flags[name] = next;
      i++;
    }
  }
  return { command, flags };
};

/**
 * Where a key file must NOT go: inside this repository (git could publish it), or a folder
 * a cloud service copies (iCloud, including a Mac's synced Desktop and Documents; Dropbox;
 * Google Drive; OneDrive). Returns the reason, or null.
 */
export const unsafeKeyPath = (file, home = os.homedir(), repo = REPO_ROOT) => {
  const p = path.resolve(file);
  const inside = (dir) => p === dir || p.startsWith(dir + path.sep);
  if (inside(repo)) return 'it is inside the VeilCore code folder, which git could publish';
  const synced = [
    [/\/Library\/Mobile Documents\//, 'iCloud Drive'],
    [/\/Library\/CloudStorage\//, 'a cloud storage folder'],
    [/\/(Dropbox|Google Drive|GoogleDrive|OneDrive|iCloud Drive|Box)( [^/]*)?\//i, 'a cloud-synced folder'],
  ];
  for (const [re, what] of synced) if (re.test(p + path.sep)) return `it is in ${what}`;
  if (inside(path.join(home, 'Desktop')) || inside(path.join(home, 'Documents')))
    return 'Desktop and Documents are often copied to iCloud on a Mac';
  return null;
};

/** Write a secret file: only for this user (0600), never over an existing file. */
export const writeSecretFile = (file, text) => {
  const fd = openSync(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  try {
    writeSync(fd, text);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
};

/** Write a public file (a key card, a request, a signature), never over an existing file. */
export const writeNewFile = (file, text) => {
  const fd = openSync(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o644);
  try {
    writeSync(fd, text);
  } finally {
    closeSync(fd);
  }
};

const readJson = (file, what) => {
  if (typeof file !== 'string') throw new Stop(`Say which ${what} file: --${what} FILE.`);
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Stop(`Could not read the ${what} file ${file}: ${e instanceof Error ? e.message : String(e)}`);
  }
};

/** A key file written by keygen --out: the signing key inside, checked. */
export const readKeyFile = (file) => {
  const k = readJson(file, 'key-file');
  const r = parseSigningKey(k?.signingKey);
  if ('problem' in r) throw new Stop(`The key file ${file} does not hold a valid key: ${r.problem}`);
  return r.value;
};

/** Questions on one readline; `hidden` mutes what is typed (a key from paper). */
export const makeIo = (input = process.stdin, output = process.stdout) => {
  let muted = false;
  const screen = new Writable({
    write(chunk, _e, done) {
      if (!muted) output.write(chunk);
      done();
    },
  });
  Object.defineProperty(screen, 'columns', { get: () => output.columns });
  // On a terminal, readline takes the keyboard (raw mode) and does its own echo through
  // `screen`, so muting `screen` hides a key as it is typed. Piped input (tests) has no echo.
  const rli = createInterface({
    input,
    output: screen,
    terminal: Boolean(input.isTTY && output.isTTY),
    historySize: 0,
  });
  const lines = rli[Symbol.asyncIterator]();
  const ask = async (q) => {
    output.write(q);
    const r = await lines.next();
    if (r.done) throw new Stop('Stopped: no more input.');
    return r.value.trim();
  };
  return {
    say: (text = '') => output.write(`${text}\n`),
    ask,
    hidden: async (q) => {
      muted = true;
      try {
        return await ask(q);
      } finally {
        muted = false;
        output.write('  (hidden)\n');
      }
    },
    /** Clear the screen and, on most Mac terminals, its scrollback. */
    wipe: () => output.isTTY && output.write('\x1b[2J\x1b[3J\x1b[H'),
    close: () => rli.close(),
  };
};

/** A key typed in from paper, hidden; asked again until it parses, blank stops. */
const askKey = async (io, prompt) => {
  for (;;) {
    const typed = await io.hidden(prompt);
    if (typed === '') throw new Stop('Stopped: no key was typed. Nothing was signed.');
    const r = parseSigningKey(typed);
    if ('value' in r) return r.value;
    io.say(`${r.problem} Try again, or press Enter on an empty line to stop.`);
  }
};

const WARN_FILE = [
  'THIS FILE IS A VEILCORE MAINTENANCE COMMITTEE SIGNING KEY.',
  'Together with one other committee key it can change the VeilCore contract on Midnight.',
  'Keep it offline: on a USB drive kept in a safe place, not on a laptop, not in iCloud,',
  'Dropbox, Google Drive, email, chat, a notes app, a password manager or a photo.',
  'Never send it to anyone, including other VeilCore people. Nobody will ever ask for it.',
].join(' ');

const keygen = async (flags, io) => {
  const holder = String(flags.holder ?? '');
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(holder))
    throw new Stop('Say whose key this is: --holder NAME (small letters, digits, dashes; like --holder mako).');
  const paper = flags.paper === true;
  const out = typeof flags.out === 'string' ? path.resolve(flags.out) : undefined;
  if (paper === (out !== undefined))
    throw new Stop('Choose one: --paper (write it on paper) or --out FILE (a key file).');
  const cardFile = path.resolve(typeof flags.card === 'string' ? flags.card : `committee-key-${holder}.json`);
  if (existsSync(cardFile)) throw new Stop(`${cardFile} already exists. Nothing was made. Choose another --card name.`);
  if (out !== undefined) {
    const why = unsafeKeyPath(out);
    if (why !== null)
      throw new Stop(`Not writing the key to ${out}: ${why}. Use a USB drive (on a Mac, /Volumes/NAME/...).`);
    if (existsSync(out)) throw new Stop(`${out} already exists. A key file is never written over. Nothing was made.`);
  }

  const key = sampleSigningKey();
  const card = makeKeyCard(holder, key);
  if (paper) {
    io.say('');
    io.say('  YOUR COMMITTEE SIGNING KEY. Write it on paper now, twice, on two sheets. The spaces are only to');
    io.say('  make copying easier. It is shown once and kept nowhere else: not on this computer, not in a log.');
    io.say('');
    io.say(`  ${groupHex(key)}`);
    io.say('');
    for (;;) {
      const ok = (await io.ask('Type WRITTEN once both sheets are written and checked: ')).toUpperCase();
      if (ok === 'WRITTEN') break;
    }
    io.wipe();
    for (;;) {
      const back = await io.hidden(
        'Now type the key back FROM THE SECOND SHEET (spaces fine; nothing shows; SHOW to see it again): ',
      );
      if (back.toUpperCase() === 'SHOW') {
        io.say(`\n  ${groupHex(key)}\n`);
        continue;
      }
      if (keyMatchesCard(back, card)) break;
      io.say('That does not match. Check the sheet, correct it, and type it again.');
    }
    io.wipe();
    io.say('Your paper copy matches. The key is not stored on this computer.');
  } else {
    writeSecretFile(
      out,
      `${JSON.stringify({ warning: WARN_FILE, holder, publicKey: card.publicKey, signingKey: key }, null, 2)}\n`,
    );
    if (keyMatchesCard(readKeyFile(out), card) !== true)
      throw new Stop('The key file did not read back correctly. Delete it and try again.');
    io.say(`Key written to ${out} (only you can read it). It was not shown on screen.`);
    io.say(
      'Move it to an offline USB drive now if it is not on one, and keep a second copy (paper, or a second drive).',
    );
  }
  writeNewFile(cardFile, `${JSON.stringify(card, null, 2)}\n`);
  io.say('');
  io.say(`Public key card written to ${cardFile}. It holds no secret: send it to the person installing the committee.`);
  io.say(`Your public key: ${card.publicKey}`);
  io.say(`Fingerprint to read out loud when you confirm it: ${fingerprint(card.publicKey)}`);
};

const check = async (flags, io) => {
  const card = readJson(flags.card, 'card');
  const c = checkKeyCard(card);
  if (!c.ok) throw new Stop(c.problem);
  const key =
    typeof flags['key-file'] === 'string'
      ? readKeyFile(flags['key-file'])
      : await askKey(io, 'Your committee key, from paper (nothing shows): ');
  if (!keyMatchesCard(key, card))
    throw new Stop(
      `That key is NOT the one on ${c.holder}'s card (${fingerprint(c.publicKey)}). Check the copy for a typo.`,
    );
  io.say(`OK: this copy is ${c.holder}'s committee key (${fingerprint(c.publicKey)}), and the card's proof is valid.`);
};

const pinned = () => {
  const p = readMainnetPins();
  return p.ok ? p.veilcore : undefined;
};

const read = async (flags, io) => {
  const req = readJson(flags.request, 'request');
  const r = rebuildRequest(req);
  if (!r.ok) throw new Stop(`This request cannot be signed: ${r.problems.join(' ')}`);
  for (const l of describeRequest(req, r, { pinnedMainnetAddress: pinned() })) io.say(l);
  return { req, r };
};

const sign = async (flags, io) => {
  const { req } = await read(flags, io);
  if (req.network === 'mainnet' && req.contractAddress !== pinned())
    throw new Stop(
      'Refused: on mainnet this tool signs only for the pinned VeilCore main contract. Nothing was signed.',
    );
  io.say('');
  io.say('Sign only if you agreed to exactly this change, for the reason given, and it was announced as the');
  io.say('maintenance policy requires (docs/maintenance-policy.md). Your signature is one of the two needed.');
  if ((await io.ask('Type SIGN to sign it, anything else to stop: ')) !== 'SIGN') throw new Stop('Not signed.');
  const key =
    typeof flags['key-file'] === 'string'
      ? readKeyFile(flags['key-file'])
      : await askKey(io, 'Your committee key, from paper (nothing shows): ');
  const s = signRequest(req, key);
  const out = path.resolve(
    typeof flags.out === 'string'
      ? flags.out
      : `signature-${s.publicKey.slice(0, 8)}-${s.dataToSignSha256.slice(0, 8)}.json`,
  );
  writeNewFile(out, `${JSON.stringify(s, null, 2)}\n`);
  io.wipe();
  io.say(`Signed by ${fingerprint(s.publicKey)} (committee place ${s.index + 1}). Signature written to ${out}.`);
  io.say('It holds no secret. Send it to the person who sends the change. Your key was not stored.');
};

const USAGE = `Usage:
  node scripts/committee/cli.mjs keygen --holder NAME (--paper | --out FILE) [--card FILE]
  node scripts/committee/cli.mjs check  --card FILE [--key-file FILE]
  node scripts/committee/cli.mjs read   --request FILE
  node scripts/committee/cli.mjs sign   --request FILE [--key-file FILE] [--out FILE]
See docs/maintenance-committee.md.`;

/** Run one command. Returns the exit code. */
export const main = async (argv, io = makeIo()) => {
  try {
    const { command, flags } = parseArgs(argv);
    const run = { keygen, check, read, sign }[command];
    if (run === undefined) {
      io.say(USAGE);
      return command === undefined || command === 'help' ? 0 : 2;
    }
    await run(flags, io);
    return 0;
  } catch (e) {
    if (e instanceof Stop) {
      io.say(e.message);
      return 1;
    }
    io.say(`Stopped: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  } finally {
    io.close();
  }
};

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
