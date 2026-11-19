# Records saved with VeilCore (the account copy)

Status: **built, not on veilcore.org.** Easy mode step 2, November 2026. It replaces the passkey
copy built on 21 October 2026, which shipped with agreements (`PASSKEY_BACKUP` in
`bboard-ui/src/config/copy.ts`; the account copy follows the same switch). Nothing here is called
live until it has worked once on mainnet. Owner: hunter@veilcore.org.

Code: `bboard-ui/src/veilcore/account-copy.ts` (the copy, saving, the check), `account-key-store.ts`
(the keys kept between visits), `passkey-backup.ts` (passkeys, and reading the older copy),
`components/flow/KeepSafe.tsx`, `SettingsPage.tsx`, `RestorePage.tsx`; registry
`lineage/account-copy.mjs`.

## The problem

Everything a person holds in VeilCore (records, licenses, the keys to each deal's private
channel) lives in their browser. Before this, the only way to keep it safe was a backup file,
saved and opened again to check it. People lose files, and many never save one; growers lose
phones. The founder's word for it was "hassle".

## What a person sees

1. They save their first record. Then, once, **Keep your records safe**: one button, labelled for
   the device (Use Face ID, Touch ID, your screen lock, Windows Hello), and "Other ways" for a file.
   On a computer that can't unlock a passkey itself, the sheet doesn't open by itself, and says
   to choose "Use a phone" in the browser's window.
2. Face ID twice: once to make the passkey, once to check it opens the records (below, "When it
   counts"). Then **Saved.** New records save by themselves from then on.
3. Home says nothing about backups while all is well. When something is wrong it says so in one
   line ("Not saved to your account yet. Fix it"), never on each record.
4. **Settings** shows where the records are saved, the ways in, the devices and when each last
   saved, "Stop saving with VeilCore", and **Download a copy**: the backup file, which works as
   before and without VeilCore.
5. On another device, **Get my records back** → Face ID (or "Use a phone" on a computer) → the
   copy's date, then "Bring them here" → **Welcome back. N records are here.** Documents kept on
   the other device only are named there ("2 documents are kept only on your iPhone").

## How

- **One account key, several ways in** (the Bitwarden pattern). The browser makes an account key
  (AK, 32 random bytes) once. The copy (the backup file's keys, never `recordData`) is sealed with
  a key derived from AK: AES-256-GCM, the copy's id in the AAD, padded to the next power of two
  from 16 KiB. Each way in is a *slot* at the registry holding AK sealed for it; the AAD names
  the copy, the slot and its kind, so a sealed AK can't be moved between slots (review N4).
- **A passkey slot**: the passkey's PRF output (WebAuthn Level 3 `prf`, asked with the same input
  as the older copy, so the same passkey still works), HKDF-SHA256 with the slot's own label,
  gives the key that seals AK, the slot's id and its read token.
- **Two kinds of token** (S3). A slot's token reads that slot only. Saving, reading, checking or
  deleting the copy, and adding or removing a slot, need the copy's write token, made from AK.
  The registry stores SHA-256 of each token, never the token.
- **AK is never kept.** Between visits the browser keeps two keys derived from it, in IndexedDB,
  as WebCrypto keys the page can use and never read back (`extractable: false`; AES-GCM for
  encrypt/decrypt, HMAC for the write token and the key-check value) (S5). Adding a way in needs
  AK itself, so a fresh unlock through an existing way in. "Start over" on a device forgets them.
- **Sealed inside the copy** (S4): the list of slots (kind, when added, whether the passkey syncs,
  when it was last opened again through the registry), a key-check value, each device's last save
  (S17), and the records deleted on purpose (S13). The registry can't change any of it.
- **Saving by itself** (S9): 30 to 60 seconds after the last change (the random part, S10), at once
  when the page is hidden, a check for a newer copy when the app opens and every ten minutes, and
  a save at least every three days so the other devices don't think this one gone. The registry
  counts saves per copy (500 a day), not per address, once a copy exists.
- **Reused unchanged** from the passkey copy (attack pass 21 Oct and its re-check): each save names
  the copy it replaces and the registry refuses a save over a newer one; the newer one is merged
  in and saved again; a merge takes only a copy whose sealed counter is higher than any seen here,
  marks nothing, skips records removed on purpose and never swaps the vault key; four tries at
  most; the restore screen shows the copy's date and asks before anything changes.

## When it counts as backed up (the founder's decision, 19 Nov 2026)

The two reviews disagreed. Decided:

- A passkey that **syncs** (its authenticator data says BS=1: iCloud Keychain, Google Password
  Manager) and that was **opened again through the registry's own copy of its slot, with a fresh
  Face ID, giving the same AK** (the key-check value inside the sealed copy matches: review B2)
  counts as backed up at once. Both facts are read from the sealed list, never from the registry.
  Then the copy's check marks what it holds as backed up, with the copy as the source.
- Right after, a strong prompt for the **recovery sheet** (step 3, a later change:
  `components/flow/RecoverySheetPrompt.tsx` is its place). B1's point stands: a synced passkey
  protects against losing the phone, not against deleting the passkey or losing the Apple or
  Google account. The recovery sheet is for that.
- A passkey that **stays on one device** (BS=0: Windows Hello, a security key) saves the copy but
  does **not** count. It will need the recovery sheet. Until then Home says "only this device can
  open it. Download a copy".
- **Documents kept on this device only** never sync: what they say is never in the copy. Their ID
  and keys are, locked, as before (the privacy page says so). The copy never marks them backed up,
  and the key date stamp of such a document waits for a checked file that holds it
  (`components/chain/stamp-gate.ts`; review B3).
- **Marks know where they came from** (S1). A mark from the copy goes when the copy is deleted,
  when the registry no longer has it (the check gets 404), or when a way in it counts on is gone
  (S4). A checked file's marks stay.

## What the registry can see, and can do

- Which slots open which copy; the copy's size bucket; when it is saved and checked. A save soon
  after a holder's record write, from the same address, lets it guess which holder a copy belongs
  to. The random wait makes that harder, not impossible. (Before this, the docs said the registry
  couldn't tie a copy to a holder. That was never quite true and isn't said any more.)
- It can't open the copy or a slot, and can't add a way in that works (that needs AK).
- It can withhold or delete the copy or a slot: the site says so and clears the copy's marks.
- It can serve an older copy it kept: the site refuses one older than any it has seen, and shows
  the date before a restore. A brand-new device can't tell, so the date stays on screen.
- **It can keep two devices on separate copies forever** (a fork, S17). Compare-and-swap stops
  accidents, not a dishonest registry: each device would see its own counter rise. The partial
  check: each device's last save is sealed inside the copy, and a device that sees another's entry
  stuck for two weeks says "Your iPhone hasn't saved since …". Records only on the other fork
  would be lost with that device. The downloaded copy is the answer to a registry you don't trust.
- "Saved with VeilCore" depends on VeilCore's server (S14): the copy holds keys, and the records
  come back from the registry's sealed rows. The downloaded copy holds the records themselves and
  works without VeilCore, so it stays, in Settings.

## Found in the attack pass on this step (19 Nov 2026), and what was done

- **The list of deleted records only grew** (high). A record restored from a file after being
  deleted is now listed as restored, with its date, and the later of the two wins; a record the
  copy lists as deleted is never counted as in the copy (its copy mark goes). Still open: a script
  running in the page (XSS) could, for that visit, save a copy listing every record as deleted. A
  new device would then leave them out (the records stay on every device that holds them). A cap
  on how many deletions one save may add, and asking before a restore skips more than a few, is
  the follow-up.
- **"Save again" deleted the copy when this passkey's slot was missing** (medium). It now
  deletes the old copy only when that passkey was its one way in.
- **Two tabs could lower the counter this browser remembers** (medium). Saves now take a browser
  lock (Web Locks) where there is one, and the remembered counter never goes down.
- **A copy shown back older than the one just saved** was reported as "damaged". It is now
  refused as older, and Home says so.
- **Not done:** a slot is verified once, at setup or on a new device; nothing re-verifies it later,
  so a registry that keeps a slot listed but corrupts its sealed key is found only at a restore
  (re-verify after 90 days, with step 3). A passkey whose sync is turned off later keeps counting
  until it is next opened. The save when the page is hidden goes at once, without the random wait.

## Restoring the registry from a backup (operators)

Every device refuses a copy older than one it has seen. After the registry's database is restored
from a backup (`backup.mjs`), each person's devices show "Something looks wrong on VeilCore's
server" and stop saving until the person deletes the copy in Settings ("Stop saving with
VeilCore") and sets it up again. Say so in the notice about the restore.

## Moving the older passkey copy over

A browser that kept a passkey copy before this asks for that passkey once ("Your saved records
need one Face ID to keep saving"). The same PRF output opens the older copy and makes the new
slot. If another device already moved it, this one joins that account copy. Otherwise the older
copy is merged in when newer, an account copy is made with the same passkey as its first way in,
opened again through the registry (B2), and the older copy is deleted at the registry and
forgotten here (N3). On a new device, an older copy is found with the passkey, restored after its
date is shown, then moved over the same way.

**Which site a passkey is for** (N2). New passkeys are made for `veilcore.org` on veilcore.org and
its subdomains, `test.veilcore.org` on the test site, and the page's host elsewhere. Passkeys made
before on veilcore.org were made for the same name, so nothing is stranded. One made on
www.veilcore.org (www is its own alias of the site) was made for that host: the move-over asks for
it by the page's own host, and the restore screen on www also offers "Made your passkey on
www.veilcore.org before? Try it here".

## Later ways in, without a migration

The slot is generic: `{ slotId, copyId, kind, sealed AK, read token hash }`, and the registry
already accepts the kinds below.

- **`recovery`** (step 3): a code made on the device (at least 120 bits, Crockford base32 with a
  check character, review S15); HKDF gives the slot id, its token and the key that seals AK. It
  will clear the gate where a passkey that stays on one device can't.
- **`password`** (step 6): needs B4, S2, S3, S7 and S8 first (a generated passphrase or a strength
  floor; client-side minimum Argon2 settings; a guess limit; the pepper's backup). The slot's
  token can't delete anything, by design.
- **`member`**, a second person of a shared space (an association's secretary and its growers, a
  lab's manager and technicians: UX review #9). A shared space gets its own key, and its own
  copy; each member's slot holds that space key sealed with a key derived from the member's own
  account key (`HKDF(AK, "member:" + spaceId)`), so the member's id and token there come from
  their own account, and the space's list of members is sealed inside the space's copy. Adding a
  member is adding a slot to the space's copy; removing one rotates the space key. None of it
  needs a change to the slot format or the registry's tables.

## Limits

- Needs a passkey provider that supports PRF: iCloud Keychain (iOS 18.4+, macOS Safari 18+),
  Google Password Manager (Android, Chrome), 1Password and several others. Windows Hello only on
  recent Windows 11 builds, and it stays on that PC. Others are told plainly and pointed to the file.
- Deleting a record on one device doesn't delete it on another that still holds it; the record
  stays deleted on any new device restored from the copy (S13).
- A passkey is tied to the website it was made on: a copy made on test.veilcore.org opens there,
  not on the mainnet site.
- Deploy order: the registry (`account-copy-v1` on /health) before the site. The site's deploy
  checks refuse without it (`scripts/registry-features.mjs`), and a site against an older registry
  says it can't reach the saved records instead of "no copy".
