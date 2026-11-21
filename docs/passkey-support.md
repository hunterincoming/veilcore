# Passkeys that can lock data: what works where

"Saved with VeilCore" locks a person's keys with a passkey: the passkey's PRF output (the
WebAuthn `prf` extension) is turned into the key (`bboard-ui/src/veilcore/passkey-backup.ts`).
That only works if three things hold on the device in front of the person:

1. **PRF works**: the browser and the passkey provider return PRF output at all;
2. **it is stable**: the same passkey gives byte-identical output every time, on every device it
   syncs to (otherwise a copy locked on one device won't open on another);
3. **it syncs, or the person knows it doesn't**: a synced passkey (the authenticator data's BS
   flag) is on their other devices; a device-bound one (a security key, some Windows Hello
   setups) is only on that one, so losing the device loses that way in.

This page collects what public sources say, and the **passkey check** (below) lets anyone
measure their own browser and add a row.

## The passkey check

`https://veilcore.org/tools/passkey-check.html` (in this repository:
`bboard-ui/public/tools/passkey-check.html` and `passkey-check.js`). Linked from Settings, and
from the passkey step's error when setting up "Saved with VeilCore". In all five languages.

- **What the browser reports**, with no prompt: WebAuthn, a platform authenticator,
  `getClientCapabilities()`'s `extension:prf` and `hybridTransport`.
- **A real test**: ask a passkey twice (one already made for the site, or a new test passkey
  named "Passkey check (test only)"), each time with a PRF input that is **only for this test**
  (`SHA-256("veilcore/passkey-check/v1/prf-input")`, not the input that locks records, so its
  output opens nothing). It reports: PRF yes/no, the same output both times, synced (BE/BS
  flags), platform or cross-platform.
- **A check code**: 4 bytes of `SHA-256("veilcore/passkey-check/v1/code" || PRF output)`. Run
  the test with the same passkey on the person's other device; the codes must match. That is
  the cross-device stability check, without showing any secret.
- **One line to share**, language-neutral, e.g.
  `passkey-check v1 · 2026-11-20 · Safari 18.4 on iOS 18.4 · webauthn=yes · platform=yes ·
  prf-reported=yes · test=existing · prf=yes · stable=yes · be=1 bs=1 · attach=platform ·
  code=1a2b3c4d`. No key, no credential ID, no PRF output, no address.

Nothing is sent anywhere. The page is plain HTML and one script; another project can copy both
(change the two labels and the site check in `rpIdFor`).

A browser's `extension:prf: true` is a claim, not a result: Corbado's measurements found
providers that report it and return nothing (source 2). Only the real test counts.

## What public sources say (seeded 20 November 2026)

Each row says which source it comes from and that source's date. Where sources disagree, both
are given. Nothing here has been measured with the passkey check yet; the "Measured" table
below is for that.

### Browser and system

| Where | PRF with this device's passkey | Security key | Phone by QR (hybrid) | Notes | Source |
| --- | --- | --- | --- | --- | --- |
| Chrome / Edge, desktop | Yes, since 116 (Aug 2023) | Yes | Yes | With Google Password Manager passkeys | 1, 2 |
| Safari, macOS 15+ | Yes, Safari 18+ | Yes from 26.4, with two open WebKit bugs (311099: output still encrypted on USB/NFC keys; 314934: `null` from keys that skip the PIN) | Yes | Platform passkeys unaffected by those bugs | 2 |
| Safari, iOS / iPadOS | Yes, 18+; **reliable from 18.4** | Yes from 26.4 (same WebKit bugs) | **18.0–18.3: output could differ between local and phone-by-QR use (data loss); fixed in 18.4** | Chrome and Firefox on iOS use WebKit: same rows | 1, 2 |
| Chrome on Android | Yes, since 116 | Yes | Yes | All Google Password Manager passkeys | 1, 2 |
| Samsung Internet | Yes | Yes | Yes | Samsung Pass: no PRF at creation, PRF on the next sign-in | 2 |
| Firefox, desktop | Yes, since 139 (May 2025) | Yes | Yes | | 1, 2 |
| Firefox, Android | **Sources disagree**: "no" (1); "yes from 149, March 2026; key and QR paths not measured" (2) | ? | ? | Measure with the passkey check | 1, 2 |
| Android WebView (in-app browsers) | No | | | | 1 |
| Windows 10 | No | No | No | | 2 |
| Windows 11 before the Feb 2026 update | **No with Windows Hello** (no hmac-secret) | Yes | Yes | | 1, 2 |
| Windows 11 24H2/25H2 with KB5077181 (Feb 2026) | Yes: Firefox 148+, Chrome/Edge 147+ (Chrome/Edge 146: sign-in only, not at creation) | Yes | Yes | Windows Hello passkeys stay **on that computer** (not synced) | 1, 2 |

### Passkey providers

| Provider | PRF | Same output on every synced device | Synced | Source |
| --- | --- | --- | --- | --- |
| iCloud Keychain (Apple Passwords) | Yes | Yes, iOS/iPadOS 18.4+ and macOS 15.4+ | Yes | 1, 2 |
| Google Password Manager | Yes (100% in the source's tests) | Yes | Yes | 1, 2 |
| Windows Hello | Only with the Feb 2026 update (above) | n/a | **No** (device-bound, TPM) | 1, 2 |
| Security keys (e.g. YubiKey, firmware 5.2+) | Yes | n/a | **No** (one key) | 1, 2 |
| 1Password, Proton Pass, Enpass, Keeper | Yes, at creation and sign-in, in the source's tests | Not reported | Yes | 2 |
| Bitwarden | Inconsistent: 100% on Linux/Firefox, 0% on iOS/Safari, none on macOS in one test | Not reported | Yes | 2 |
| KeePassXC | Sign-in 81%, creation 21% | Not reported | Depends on setup | 2 |
| Dashlane, NordPass | No PRF for other sites | | | 2 |
| Microsoft Password Manager | Creation yes; every sign-in with PRF fails | | | 2 |

## What VeilCore does about the gaps

- **No PRF** (Android WebView, Windows without the update, Dashlane, NordPass): the passkey step
  fails with "This phone or browser can't make a passkey that opens a backup"
  (`app.backup.passkey.err.unsupported`), and the person keeps the backup file. The setup
  sheet's error now links to the passkey check, and so does Settings.
- **Device-bound passkeys** (Windows Hello, security keys): accepted as a way in; Settings says
  "Passkey on one device only" (`app.settings.ways.bound`), from the BS flag, so nobody believes
  it syncs.
- **iOS 18.0–18.3**: the gap that can lose data. The passkey check's two asks and its check code
  are how to catch it on a real device; a device that shows `stable=no`, or a check code that
  differs from the person's other device, must not be relied on.
- **Providers with partial PRF** (Bitwarden, KeePassXC): measure; until then, treat as unknown.

## Measured with the passkey check

Add a row per device: the date, the result line, and who ran it (no names of people outside the
team in this public file).

| Date | Result line | Ran by |
| --- | --- | --- |
| | | |

Gaps found here are worth filing with the browser or provider, with the result line; nothing has
been filed yet.

## Sources

1. DeOrganized, "WebAuthn PRF Support Matrix", stacks-passkey-wallet `docs/prf-support-matrix.md`
   (living document, seeded from a diagnosis dated 14 Jul 2026), which cites W3C WebAuthn
   Level 3, MDN, WebKit's Safari 18.0 notes, Chrome 116 notes, Apple Developer Forums threads
   764730 and 774112, and Yubico's PRF guides:
   https://github.com/DeOrganized/stacks-passkey-wallet/blob/HEAD/docs/prf-support-matrix.md
2. Corbado, "Passkeys & WebAuthn PRF" (created 16 Apr 2025, updated 29 Sep 2026; support data
   and community measurements labelled August 2026): https://www.corbado.com/blog/passkeys-prf-webauthn
3. W3C, Web Authentication Level 3: the `prf` extension and the authenticator data flags (BE,
   bit 3; BS, bit 4): https://www.w3.org/TR/webauthn-3/
