# A lab's key on the lab's own website: design note

Status: the first version is built (`docs/lab-domain-keys.md`, registry `lineage/lab-domain.mjs`).
This note records why it is built the way it is, and what this round adds: the page checks the
key's own claim itself, a website taking a key down is shown, and the key can be published in a
W3C did:web document. 18 November 2026.

## The problem

Anyone can make a signing key and register it under any lab's name. Today a page can say more
than _a key named "Acme Labs" (name not checked)_ in one way: VeilCore's operator matches the
name by hand (`docs/lab-name-checks.md`). That makes VeilCore the one saying whose key it is. A
stranger, a body or a court should be able to check "this key is published by whoever runs
acme-labs.com" without trusting VeilCore, and the lab should be able to take it back on its own.

## What others do

| System | Where the proof lives | Who checks | Taking it back |
| --- | --- | --- | --- |
| ACME http-01 / dns-01 (RFC 8555) | a token at `/.well-known/acme-challenge/` or `_acme-challenge` TXT | the CA, once | n/a (certificate expires) |
| `/.well-known/` (RFC 8615), security.txt (RFC 9116) | a fixed path on the domain | anyone | edit the file |
| Keybase proofs | a signed statement posted on the site, and the key's own signed chain naming the site | every client, again and again | delete the post: clients show the proof as broken |
| did:web (W3C CCG) | `https://<domain>/.well-known/did.json`, keys as verification methods | any resolver; the document's `id` must be the DID resolved | edit the document |
| Bluesky handles | `_atproto` TXT or `/.well-known/atproto-did` | the app server, re-checked | remove it |
| Nostr NIP-05 | `/.well-known/nostr.json` listing names → keys; must send `Access-Control-Allow-Origin: *` and no redirects | each client, in the browser | remove the name |

The common shape: a fixed path or a DNS name on the domain, both sides naming each other, checked
again over time, and removal as the way to take it back. Keybase is the one that shows a removed
proof as broken rather than just dropping it, which is what a reader needs when a key may have
leaked.

## The design

**Three places, any one is enough** (registry looks in this order):

1. `https://<domain>/.well-known/veilcore-lab.json`:
   `{"format":"veilcore-lab/v1","name":"Acme Labs","keys":[{"publicKey":"<64 hex>"}]}`. The
   simplest for a lab: one file, saved from its key screen.
2. `https://<domain>/.well-known/did.json`, a did:web document (`id` `did:web:<domain>`), with the
   key as a verification method listed under `assertionMethod` (the relationship for signing
   statements; a key listed only for `authentication` doesn't count). Types read: `Multikey` and
   `Ed25519VerificationKey2020` (`publicKeyMultibase` `z6Mk…`, as did:key encodes Ed25519), and
   `JsonWebKey2020` (`publicKeyJwk` `{kty:"OKP",crv:"Ed25519",x}`). Every method id and controller
   must be absolute and the DID's own, so a document can't borrow another DID's key; a JWK with a
   private part is refused. The key screen shows the entry to add, and saves a whole did.json for
   a lab without one.
3. A TXT record at `_veilcore-lab.<domain>`: `veilcore-lab=v1 key=<64 hex>`, for a lab that can
   only change DNS.

The VeilCore file stays the default: it needs nothing else on the site and can't be confused with
a DID document someone else maintains. did:web is there so a lab that already runs one (or will)
lists its key once, in the standard form.

**Both sides name each other.** The key signs
`veilcore:lab-domain:v1\n<public key>\n<domain>\n<issuedAt>`, so only the key's holder can say
which website is its own (unsigned, anyone could list a lab's public key on a lookalike and have
it shown next to the lab's signatures).

**Who looks.** A browser can't: the site's `connect-src` allows only the registry and the
Midnight relays, and opening it to every domain would let any injected script send data
anywhere; most lab websites also wouldn't send CORS headers. So:

- the **registry** fetches the file, the DID document and the TXT record (public addresses only,
  no redirects, 5 s and 16 KiB each), once when the lab presses _Look now_ and again every day.
  That half is VeilCore's word, and the page says so: "VeilCore found it listed there on …";
- the **page** checks the other half itself: the key's signature naming the website, which the
  registry serves (`claim`). A row whose claim is missing or doesn't verify shows no website at
  all, whatever the registry says (`checkAttestations`, `lab-domain.ts domainClaimValid`);
- the website name is a **link** to the file, the DID document, or, for a TXT record, a public
  DNS lookup of the record, so anyone can look without VeilCore, today or later:
  `curl https://acme-labs.com/.well-known/veilcore-lab.json`, `dig +short TXT _veilcore-lab.acme-labs.com`.

**Caching.** The registry keeps one record per key: the domain, the way it was found, the time,
the file's SHA-256, the signed claim. Pages show "listed" only while the last look that found the
key is under 7 days old. The page caches claim checks per claim, so a lab with many signatures
costs one check.

## What the check page says

After the signer's name (checked or not, unchanged):

| State | Words (English) |
| --- | --- |
| Listed: the key's claim verified here, VeilCore's last look found it, under 7 days old | The key names the website **acme-labs.com**, and VeilCore found it listed there on 2026-11-18. |
| Withdrawn: the key's claim verified here, the website had listed it, then answered without it | The key names the website **acme-labs.com**, but VeilCore found it no longer listed there on 2026-11-10. |
| Not published (no domain named, or never found there) | nothing |
| Couldn't check (website down, timeouts, a broken file, a look older than 7 days) | nothing |
| Claim missing or signed by another key | nothing |

"Couldn't check" says nothing rather than a warning: a lab's website being slow, or VeilCore's own
outage, is not something a reader of a signature should be alarmed by, and the line simply isn't
there. "Withdrawn" is different: the website answered and the key wasn't there.

**Withdrawn** is recorded only when the website and DNS both gave a real answer: a file without
the key or a 404/410 for each file, and a DNS answer (none, or one without the key). A timeout, a
5xx, a file that isn't JSON or DNS failing is never read as a withdrawal. It is kept, not forgotten
after 30 days, until the website lists the key again. And until then the key can't name another
website (409, `withdrawn`): otherwise whoever took a leaked key could point it at a lookalike and
wipe the lab's withdrawal off every page. The lab's key screen says so, and tells a lab that stops
using a key to leave it in the file: only remove it to disown it.

The words never say the lab is real, licensed, accredited or "verified", and never "owns": the
unit tests check that in all five languages. It shows the key's holder and whoever controls that
domain name each other. The operator's name check is unchanged and still the only thing that
prints a name plainly; the website line sits after it, never instead of it.

## Threats

- **Domain takeover or hijack.** Whoever controls the domain controls the listing. They can't make
  the key name their domain (no private key), so the worst is removing it (shown as withdrawn) or
  keeping it listed. Limit: a listing is only as good as the domain's own security, like a TLS
  certificate.
- **Expired domain.** The site stops answering: not a withdrawal; the line drops after 7 days and
  the record is forgotten after 30. If someone re-registers it and serves a 404, it reads as
  withdrawn, which is true of that domain. The key can't then name another website: the lab makes
  a new key (as after `key-compromised` in the name check).
- **A lab with no website.** Nothing changes for it: the operator's name check and, later, a
  body's list remain. Absence of a line says nothing bad.
- **Lookalike domains (acme-1abs.com, Unicode).** Only plain ASCII names are accepted and shown, so
  an internationalised name appears in its `xn--` form, never as lookalike Unicode. A lookalike in
  plain letters can't be stopped by software: this is why the line names the domain exactly and
  never turns the name green. Matching a domain to a licence listing is the operator's name check.
- **A lab copying another's key.** It can list the other lab's public key on its own site, but the
  key never signed a claim naming that site, so no page shows it.
- **A leaked key.** The lab removes it from its website: every page shows the withdrawal, and the
  thief can't move the key to another website. If the thief names a lookalike _before_ the lab
  removes it, the registry stops looking at the lab's site; the lab then also asks the operator to
  take any name-check mark off (`key-compromised`). Watching the old domain after a move was
  weighed and not done: a lab moving websites removes the key from the old one, which would read as
  a withdrawal.
- **The registry lying.** It could claim a website lists a key it doesn't: the link lets anyone see.
  It can't claim the key named a website it didn't: the page checks that signature itself.

## Later: DIDs

Nothing here needs migrating for DID-based identity, and nothing beyond did:web is built.

- **did:midnight or Midnight Passport.** A lab's DID would list the same Ed25519 key as a
  verification method, as its did.json does today. The registry would resolve that DID instead of
  fetching a website, and record what it saw in the same `domainCheck` record: the optional `did`
  and `didKeyId` fields exist now (filled for did:web) and older records without them read as
  before. The key, its signatures and the claims contract don't change.
- **A credential from an accreditor** (a verifiable credential issued by an accreditation body to
  the lab's DID, or a body publishing its own list, as in `docs/lab-domain-keys.md` "Next"): pages
  would add "listed by <body>" from the body's own signature, still separate from the website line
  and the operator's check. It would be a new optional field next to `domainCheck`, not a change to
  it.

## Where it is

- Registry (`veilcore-api`): `lineage/lab-domain.mjs` (reading the file, did.json and TXT; what
  counts as an answer), `lineage/attesters.mjs` (`setDomainCheck` withdrawal, `claimDomain`
  refusal, `domainWithdrawn` served), `/health` feature `lab-domain-withdrawn-v1`. Tests:
  `test/lab-domain.test.mjs`.
- Site: `bboard-ui/src/veilcore/lab-domain.ts` (claim check, did:web form), `attesters.ts`
  (`checkAttestations`, `currentDomainCheck`, `currentDomainWithdrawal`, `signerLabel`),
  `components/NameCheckText.tsx`, `components/AttesterSetup.tsx`. Tests:
  `veilcore/lab-key-on-website.test.ts`, `attesters.test.ts`, `e2e/lab-key-website.spec.ts`.
- Deploy order: registry first. A site on an older registry shows no withdrawals and, without the
  served `claim`, no website line; nothing breaks.
