# The passkey copy of a backup

Status: built 21 October 2026, ships with agreements (`PASSKEY_BACKUP` in
`bboard-ui/src/config/copy.ts`). Owner: hunter@veilcore.org.

## The problem

Everything a person holds in VeilCore (records, licenses, the keys to each deal's private
channel) lives in their browser and in one backup file. A grower who loses their phone and
never kept the file loses all of it, and VeilCore can't help: it never had the keys.

## What it does

The backup screen offers a second copy that opens with a passkey (Face ID, Touch ID or the
device PIN). Passkeys sync through iCloud Keychain and Google Password Manager, so a new
phone signed into the same Apple or Google account can open the copy. The restore screen has
**Use my passkey** next to **Open my backup file**.

## How

- The browser asks the passkey for a PRF output (WebAuthn Level 3 `prf` extension), the
  mechanism Bitwarden and 1Password use for passkey unlock. It is computed inside the
  authenticator after the person unlocks it, and never leaves the page.
- HKDF-SHA256 (salt bound to the passkey's credential id) turns it into three values: an
  AES-256-GCM key that seals the copy, the copy's id at the registry, and a write token.
- The registry stores the id, the token's SHA-256 and the ciphertext (`/vault`, registry
  `lineage/passkey-vault.mjs`). No account, email or passkey public key. It can't open the
  copy, tie it to a person, or change it without the page noticing.
- A copy counts as a backup only after it is read back from the registry, opened, and
  passes the same check a saved file does (`checkBackup`).

## Why the file stays

A deleted passkey takes its copy's key with it. WebAuthn's own editors warn against making a
passkey the only way to encrypted data (Cappalli, 2025), so the file is still required in the
backup steps and the passkey copy is offered beside it, with that warning on screen.

## Limits

- Needs a passkey provider that supports PRF: iCloud Keychain (iOS 18.4+, macOS Safari 18+),
  Google Password Manager (Android, Chrome), 1Password and several others. Windows Hello only
  on recent Windows 11 builds. Others are told plainly and pointed to the file.
- The registry could serve an older copy it kept. The copy carries its date inside the sealed
  part and the restore result shows it.
- A passkey is tied to the website it was made on: a copy made on test.veilcore.org opens
  there, not on the mainnet site.
