# A paid lab plan, without learning whose records are whose (design, not built)

Status: design, 5 November 2026. Needs VeilCore's company to exist (to take payments) and a
price both founders set. Nothing here is built.

## The problem

The free fee service pays for a few on-chain actions per browser and per network address a
day (`sponsor/README.md`). That is right for a breeder proving one plant to one buyer. A lab
or a herd book proving, licensing or pairing dozens a day hits the caps. VeilCore also pays
every fee the free service covers, so heavy free use is a cost with no income.

## Three ways for a heavy user, from cheapest for VeilCore to most income

1. **Pay their own fees.** The site connects the holder's own Midnight wallet (Lace, 1AM) and
   the wallet adds the fee (`balanceUnsealedTransaction` with fees). VeilCore sees nothing
   and pays nothing. Right for anyone already holding NIGHT; it keeps VeilCore an open
   format nobody is locked into. About 1 to 2 days to build.
2. **VeilCore-run** (`docs/MANAGED.md`, already designed): VeilCore runs everything for the
   lab and charges per agreement. Most income, most trust asked of the lab.
3. **The lab plan (this design):** a monthly fee buys an allowance of sponsored actions,
   spent from the lab's own browser like the free tier, without the caps.

## How the plan keeps VeilCore from learning which actions are the lab's

Anonymous tokens, the Privacy Pass design (RFC 9576 to 9578, RSA blind signatures RFC 9474),
the way Kagi lets paid subscribers search without Kagi linking searches to accounts:

- Once a day the lab signs in and is issued its allowance as blind-signed tokens: VeilCore
  signs them without seeing them.
- Each sponsored action spends one token instead of counting against the free caps. The
  sponsor checks the signature and that the token wasn't spent before; it can't tell which
  issued token it was.
- So VeilCore knows how many tokens a lab took, not which actions it used them on.

Rules that make that true (from the research, 5 Nov 2026):

- One signing key per day for everyone, published, never a key per lab (a per-lab key would
  make its tokens traceable). Rotate daily; keep the spent-token list until the key rotates.
- Tokens carry nothing else: no lab id, no lab-specific count.
- Issue ahead of use, so a token isn't spent seconds after it was issued (timing links them).
- Say it honestly: with only a few labs on the plan, "one of three labs" is a small crowd.
  The plan hides which action is whose from VeilCore; it can't hide that a lab is a customer.

Libraries: `@cloudflare/privacypass-ts` and `@cloudflare/blindrsa-ts` (Apache-2.0, WebCrypto,
RFC test vectors). Not widely adopted: pin exact versions and review them. About 5 to 8 days
to build, after the company and a payment provider exist.

## Not chosen

Rate-limiting nullifiers (RLN, Semaphore): the most private, but a second proving system in
the browser and weeks of work, and with few labs the crowd is still small.

## Decisions for the founders

- The price, and what one token buys (one sponsored action is simplest).
- Whether the plan is sold alone or bundled with VeilCore-run.
- When to build: after incorporation, and after a real lab hits the free caps.
