# The complexity budget

The rules in `docs/simple-flow.md` ("one thing per screen") were never checked by a test, so
each new feature added one more row and the app slowly got heavier. The budget makes the limit
a number that CI checks. The rules themselves are in `CLAUDE.md`, "Keep it simple".

## What is checked

- **`bboard-ui/complexity-budget.json`**: the most each default screen may show. The first
  numbers (21 Nov 2026) are what the screens showed that day, so nothing had to change to pass.
  - `primary`: filled buttons, the one thing the screen asks for.
  - `buttons`: everything that can be tapped (buttons, links, summaries); a button inside a
    tappable card counts once.
  - `words`: words a person can see, per language: anything between spaces with a letter or
    digit in it (Japanese: characters ÷ 2.5). Plain counting gives the same number in every
    browser version.
  - `moreDepth`: how many levels of "More" or "Technical details" the screen goes.
  - `firstSeal`: screens and taps from the landing page to sealing a first record.
  - `coreRoutes`: how many pages are core in `bboard-ui/src/config/route-tiers.ts`.
  - `jargon.terms`: words that don't belong on a default screen, per language.
    `jargon.today`: the ones still there today. These are reported, not failed, until they are
    removed; any other term on a default screen fails.
- **`bboard-ui/e2e/complexity-budget.spec.ts`**: an iPhone 14 walks the default screens in all
  five languages against the stand-in registry: Home on a new device, getting records back,
  the four screens to a first sealed record, Home with a record, the keep-your-records-safe
  sheet, the record page and a stranger's check page. It counts what is shown before anything
  is opened, then opens every "More" to count the levels, and fails if any number is over.
- **`bboard-ui/src/complexity-budget.test.ts`**: every page in `App.tsx` has a tier (core, role
  or advanced) in `route-tiers.ts`, the core count is within `coreRoutes`, and the budget file
  is whole.

Only the page's main part is counted (and the sheet, for keep-safe), not the header, the footer
or the Ask button. The test build can't reach the network, so the sealed screen is measured with
the key's date stamp waiting to try again.

## Updating it

1. Build and measure, with the numbers written to a file:
   ```
   cd bboard-ui
   npm run e2e:build
   BUDGET_REPORT=/tmp/budget.json npx playwright test e2e/complexity-budget.spec.ts
   ```
   The file has each screen's numbers and the exact text counted, per language.
2. **A screen got simpler**: lower its numbers in `complexity-budget.json` to the new ones, in
   the same PR. If a jargon term is gone, the test prints "gone from …": take it off
   `jargon.today`.
3. **A screen needs more**: don't raise the number on your own. The PR says why, names what was
   removed to make room (and lowers that number), and carries Hunter's written OK. Then raise it.
4. **A new page**: add it to `route-tiers.ts`. Start at `role` or `advanced`; `core` needs
   Hunter's OK and room under `coreRoutes`.
5. **A new default screen** for the budget: add a step to the spec and an entry to the budget
   at what it measures today.

## Not checked by a test

- The one-plain-sentence line in each feature's PR, and the quarterly removal. These are for
  the reviewer.
- The tiers say where a page belongs; they don't hide anything yet. Some role and advanced
  pages are still linked from default screens, and the budget counts those links as they are.
- No analytics. Whether people find it simple is checked by watching people use it, never by
  tracking them.
