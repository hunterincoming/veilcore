# A lab's key on the lab's own website

Status: built (registry `lineage/lab-domain.mjs`, site `attesters.ts` and the lab's key
screen), November 2026.

## Why

Until now the only way a page could say more than *a key named "Acme Labs" (name not
checked)* was VeilCore's operator matching the name (`docs/lab-name-checks.md`). That makes
VeilCore the one who says whose key it is. Every outside review (5 November 2026: a variety
office examiner, evidence law, standards bodies and a skeptic) named it as a reason a court
or a body wouldn't lean on a lab signature.

This turns it round: the lab says it itself, in a place only the lab can write, and anyone
can look, without VeilCore, today or in ten years. It is the same pattern as Nostr's NIP-05
(`/.well-known/nostr.json`), Bluesky handles (`/.well-known/atproto-did` or a `_atproto` TXT
record) and `security.txt` (RFC 9116).

## The two ways

**A file** at `https://<domain>/.well-known/veilcore-lab.json`:

```json
{
  "format": "veilcore-lab/v1",
  "name": "Acme Labs",
  "keys": [{ "publicKey": "<the 64-character public key>" }]
}
```

At most 64 keys and 16 KiB. Served over https on port 443, with no redirect.

**Or a DNS TXT record** at `_veilcore-lab.<domain>`, one per key:

```
veilcore-lab=v1 key=<the 64-character public key>
```

The lab's key screen (header → *Your signing key*) saves the file and shows the TXT line;
the lab types its domain and presses *Look now*.

## What the registry does

- `POST /attesters/<public key>/domain` with `{ "domain": "acme-labs.com" }`: anyone may
  press it, at most once per key per ten minutes. The registry fetches the file, then
  tries the TXT record, and records what it saw: the domain, the way, the time and the
  file's SHA-256. It adds no judgement.
- It looks again at every domain on record once a day. A key the lab takes out of its file
  stops being shown at the next look.
- The fetch only goes to public addresses (the address is checked when connecting, so a
  name can't be switched to a private one in between), with no redirects, 5 seconds and 16
  KiB at most.
- `GET /attesters/<public key>` and every attestation carry `domainCheck`, only while the
  last look found the key and is under 7 days old.

## What pages say

> Receipt signed by a key named "Acme Labs" (name not checked). The website acme-labs.com
> lists this key as its own (looked up on 2026-11-05).

The domain is a link to the file, so the reader can look for themselves. A listing does
**not** turn the name green: it shows the key belongs to whoever controls that domain, not
that the domain belongs to a licensed or accredited lab. Matching the domain to a public
licence or accreditation listing is still the name check, or, better, a body's own list.

## Next: a body's list

The same file format works for a body that says which labs count (ICAR for parentage labs,
ISTA for seed testing, a national accreditation body): a file on the body's domain listing
its members' keys. When one body wants to do that, the registry reads its list the same way,
and pages say "listed by <body>". No contract change, no change for labs.
