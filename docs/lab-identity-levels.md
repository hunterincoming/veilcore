# A lab key's identity level

**Built 21 November 2026.** Code: `bboard-ui/src/veilcore/attesters.ts` (`labIdentity`),
`veilcore/lab-identity-words.ts`, `components/LabIdentityBadge.tsx`, `components/LabOwnLevel.tsx`.
Tests: `veilcore/lab-identity.test.ts`, `e2e/lab-identity-levels.spec.ts`.

A signature shows which key signed. Anyone can make a key and give it any name, so every page
that shows a lab signature also says, in words, how far that key is known to be the lab's. It
never says anything about the quality of the lab's work.

## The levels

Worked out from the same checks the signer's sentence uses, first match wins:

| Level | When | Words (English) |
| --- | --- | --- |
| Withdrawn by website | The website the key named stopped listing it (two real "not here" answers, `docs/lab-key-on-website.md`). Shown on a retracted signature too. | **Withdrawn by website** — acme.com no longer lists this key: VeilCore saw that on 2026-11-19. The lab may have retired or disowned it. Don't rely on it without asking the lab. |
| Verified against a public listing | VeilCore's operator matched the key's name to a public licence or accreditation listing, current (`docs/lab-name-checks.md`). | **Verified against cannabis.example.gov** — VeilCore's operator matched the name "Acme Labs" to this public listing (license TL-1) on 2026-10-01, and the lab confirmed the key from an email address at the lab's domain. The match counts until 2027-10-01. VeilCore doesn't vouch for the lab's work. |
| Listed on a website | The key signed a claim naming a website (checked on the page), and the registry's last look, under 7 days old, found the key listed there (`docs/lab-domain-keys.md`). | **Listed on acme.com** — that website lists this key, and the key names that website. VeilCore last saw it there on 2026-11-20. VeilCore doesn't check who runs the website: make sure it is the lab's own, not a lookalike. VeilCore doesn't vouch for the lab's work. |
| Listing match withdrawn | The operator took the listing match off (`nameCheckStatus: withdrawn`). A website still listing the key wins, with a note. | **Not verified: listing match withdrawn** — this key calls itself "Acme Labs". VeilCore's operator took off its match to a public listing. Check with the lab before relying on it. |
| Not verified (expired) | An earlier listing check expired. | **Not verified** — this key calls itself "Acme Labs". Its earlier check against a public listing has expired. … |
| Not verified | Anything else, including a signature that doesn't verify or was retracted. | **Not verified** — this key calls itself "Acme Labs". Anyone can make a key with any name. Check with the lab before relying on it. |

Each is drawn with an icon, a coloured border and the title in bold: amber for not verified,
red for either withdrawal, blue for the website, green only for the listing. The words carry the level
on their own; colour and icon only repeat it. The website is shown in full, in bold and on one
unbroken line, so a lookalike name is there to see (only plain ASCII names are accepted, so an
internationalised name shows in its `xn--` form). Under each, "What does this mean?" opens a short explanation:
VeilCore checks which key signed and what is known about whose it is, never the quality of
the result or whether the lab is licensed; what each level means; and how a lab becomes verified.

The line before the level says "signature checked in this browser" (it was "verified"), so the
word "verified" means one thing on the page: who holds the key.

Where a page has only text (a PDF, a history line, the "What each fact rests on" box), the
signer's words carry the level: "a key calling itself "Acme Labs" (not verified)", "…, listed by
acme.com", "… (withdrawn by acme.com)", or the plain name after a listing match.

The evidence bundle's `verify.html` is read offline and can't look anything up, so it always
says "Not verified" for a key, in the same words.

## Where it shows

The check page (`/verify`), the one-fact claim check (`/check-claim`), the lab result checker
(`/check-lab-result`), a record's lab results and its receipt and signatures, the certificate
card (English, without the explainer, as it is printed), and the evidence bundle's `verify.html`.

## On the lab's own key screen

Once the key is published, the screen shows the lab its own level (from
`GET /attesters/<public key>`, with the same checks a check page makes) and the one step to the
next: list the key on its website (opens those steps), or email VeilCore for a listing match.

## Wording rule

"Verified" is used for one level only: a current match to a public listing, as "Verified against
<listing>", which is also the only green level. A key listed on a website is "Listed on
<domain>" (21 November 2026, after the skeptical-buyer review: anyone can register a website and
list their own key on it, so "verified" would overclaim). Never "verified lab", "approved",
"certified" or "trusted by VeilCore", and never a word about the quality of a result. The unit
tests check the website level never says "verified" in any of the five languages.
