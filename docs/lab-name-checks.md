# Checking a lab's name before marking its key

**For VeilCore's registry operator · written 14 October 2026**

Anyone can make a signing key and register it under any lab's name. Until the operator
marks a key, every page shows its signatures as *a key named "…" (name not checked)*.

A mark lets pages print the name plainly, followed by exactly what was checked:

> Receipt signed by Acme Labs. VeilCore's operator matched this name to
> cannabis.example.gov (licence TL-000123) on 2026-10-14. VeilCore doesn't vouch for the
> lab's work.

Follow every step below before marking a key. If a step fails, don't mark it.

## What a mark means, and what it doesn't

A mark means: on that day, the operator found a lab with this name in a public licence
or accreditation listing, and someone at an email address on that lab's own domain
confirmed this key.

A mark does **not** mean VeilCore vouches for the lab, its work, its results, its
methods, or any sample or report it signs. It doesn't mean the lab is licensed or
accredited for a given test. Anyone relying on a lab report checks that with the lab and
the listing themselves. Never describe a marked lab as "verified", "approved",
"certified" or "trusted by VeilCore".

## 1. Find the lab in a public listing

Look the lab up yourself. Don't use a link, document or listing the lab or anyone else
sent you.

Use one of these:

- **A licence listing.** The government body that licenses testing labs in that place,
  for example a state regulator's list of licensed testing labs.
- **An accreditation directory.** For ISO/IEC 17025 labs, the accreditation body's
  public directory: in the US, A2LA, ANAB or PJLA; elsewhere, the national body (for
  example UKAS in the UK or DAkkS in Germany).

Write down:

- the listing's web address (https only);
- the licence or certificate number as listed;
- the lab's name exactly as listed;
- whether the licence or accreditation is current, and when it ends.

Stop if the listing shows the licence as expired, suspended or revoked, or if the name
on the key is different from the listed name (beyond capitals and punctuation). For a
different name, ask the lab to register the key under its listed name, then start again.

## 2. Find the lab's email domain

Take the domain from the listing, or from the lab's own website reached from the
listing or a search you ran yourself. Not from the request, and not from an email the
lab sent you.

Free mail (gmail.com, outlook.com, yahoo.com, proton.me and the like) never counts. The
registry refuses it.

## 3. Send a one-time code to that domain

1. Make a fresh code: `openssl rand -hex 8`. Use it once.
2. Email it to an address at the lab's domain: the general, quality or lab address
   shown on the listing or the lab's site.
3. Ask them to reply **from that address** with the code and the lab key's full public
   key (64 characters, under "Public key" on their signing key screen). If they can sign
   the code with the lab key, ask for that too and check the signature against the key.
4. Check the reply:
   - the code is the one you sent;
   - the public key is exactly the one registered (`GET /attesters/<public key>` answers
     with the same name);
   - the reply came from the lab's domain, and its headers show the domain's DKIM check
     passed (in Gmail: *Show original*, look for `DKIM: 'PASS'` with the lab's domain).

## 4. Record it and mark the key

Mark the key with the operator token (the Railway variable `VEILCORE_OPERATOR_TOKEN`;
never paste it into a chat or a document):

```
curl -X POST https://veilcore-api-production.up.railway.app/attesters/<public key>/vetting \
  -H "x-operator-token: $VEILCORE_OPERATOR_TOKEN" -H "content-type: application/json" \
  -d '{ "vetted": true,
        "check": { "source": "licence-listing",
                   "sourceUrl": "https://…the listing…",
                   "licenceNo": "…as listed…",
                   "emailDomain": "lab.example",
                   "checkedAt": "2026-10-14",
                   "checkedBy": "XX" },
        "note": "what you saw" }'
```

- `source`: `licence-listing` or `accreditation`.
- `checkedBy`: your initials.
- `expiresAt` (optional): set it to the day the licence or accreditation ends, if that
  is sooner than 12 months.
- `note` is private. Put in it what you saw: the code, who replied and from which
  address, the licence status and end date. It is never shown publicly.

Everything in `check` is public: the listing address, the number, the email domain, the
day and your initials. Never put a person's name or email address in it. The registry
refuses an address in `emailDomain` and any field it doesn't know.

Then open `GET /attesters/<public key>` and check `nameCheckStatus` is `checked`.

## 5. Re-check every year

A mark expires 12 months after the check, or on `expiresAt` if sooner. After that,
pages show the key as *name not checked* again. To renew, do steps 1 to 4 again and mark
the key with the new check.

## 6. Take a mark off

Take it off straight away when:

| What happened | `reason` |
| --- | --- |
| The lab says its key leaked or the device holding it was lost | `key-compromised` |
| The lab closes | `lab-closed` |
| The licence or accreditation lapses, is suspended or revoked | `licence-lapsed` |
| The lab changes its name | `name-changed` |
| The mark was a mistake | `entered-in-error` |
| It expired and won't be renewed | `expired` |
| Anything else (explain in the note) | `other` |

```
curl -X POST https://veilcore-api-production.up.railway.app/attesters/<public key>/vetting \
  -H "x-operator-token: $VEILCORE_OPERATOR_TOKEN" -H "content-type: application/json" \
  -d '{ "vetted": false, "reason": "licence-lapsed", "note": "what you saw" }'
```

The reason and the day are public. The note is not.

A key taken off as `key-compromised` can't be marked again: whoever has it can sign as
the lab. The lab makes a new key, and that key goes through steps 1 to 4.

Renaming a key drops its mark on its own. Past signatures stay on record either way;
pages just stop printing the name plainly.

`GET /attesters/<public key>/vetting` (operator token) lists every mark and unmark on a
key, with the notes, newest first.

## Marks made before 14 October 2026

They have no check record, so from this version on they read as *name not checked*.
That is intended. Run steps 1 to 4 for any lab that should show its name.
