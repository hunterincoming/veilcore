# A lab's key on the lab's own website

Status: built (registry `lineage/lab-domain.mjs`, site `attesters.ts` and the lab's key
screen), November 2026.

## Why

Until now the only way a page could say more than _a key named "Acme Labs" (name not
checked)_ was VeilCore's operator matching the name (`docs/lab-name-checks.md`). That makes
VeilCore the one who says whose key it is. Every outside review (5 November 2026: a variety
office examiner, evidence law, standards bodies and a skeptic) named it as a reason a court
or a body wouldn't lean on a lab signature.

This turns it round: the lab says it itself. Its key names its website, and the website
lists the key, so the two vouch for each other and anyone can look at the website without
VeilCore. It is the same pattern as Nostr's NIP-05
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

The lab's key screen (header → _Your signing key_) saves the file and shows the TXT line;
the lab types its domain and presses _Look now_. The app signs
`veilcore:lab-domain:v1\n<public key>\n<domain>\n<issuedAt>` with the lab's key, so
only the key's holder can name or change its website. An independent attack on the first
version (5 November 2026) showed why: unsigned, anyone could list a lab's public key on a
lookalike domain and have it shown beside the lab's signatures, or point the lab's record at
a domain that lists nothing.

## What the registry does

- `POST /attesters/<public key>/domain` with `{ domain, issuedAt, signature }`: only a
  claim the key signed counts, never one older than the claim on record, at most one look
  per key per ten minutes. The registry fetches the file, then tries the TXT record, and
  records what it saw: the domain, the way, the time and the file's SHA-256. It adds no
  judgement.
- It looks again at every domain whose last look is a day old (hourly, from the stored
  times, eight at a time). A key the lab takes out of its file stops being shown at the
  next look; a domain not found for 30 days is forgotten.
- The fetch only goes to public addresses (global IPv4 and IPv6 unicast, checked when
  connecting, so a name can't be switched to a private one in between), with no redirects,
  5 seconds for the file (body included), 5 for the DNS record, and 16 KiB at most.
- `GET /attesters/<public key>` and every attestation carry `domainCheck`, only while the
  last look found the key and is under 7 days old. It includes `claim` (`issuedAt` and the
  key's signature over the payload above), so anyone can check that the key named the
  domain, not only the registry.

## What pages say

> Receipt signed by a key named "Acme Labs" (name not checked). The website acme-labs.com
> lists this key, and the key names that website (looked up on 2026-11-05).

The domain is a link to the file, so the reader can look for themselves. A listing does
**not** turn the name green: it shows the key's holder and whoever controls that domain
name each other, not that the domain belongs to a licensed or accredited lab, nor that the
domain isn't a lookalike. Matching the domain to a public
licence or accreditation listing is still the name check, or, better, a body's own list.

## Next: a body's list

The same file format works for a body that says which labs count (ICAR for parentage labs,
ISTA for seed testing, a national accreditation body): a file on the body's domain listing
its members' keys. When one body wants to do that, the registry reads its list the same way,
and pages say "listed by <body>". No contract change, no change for labs.
