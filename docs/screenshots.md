# Page screenshots

Pictures of every page, to see what a change did to the look before it is merged. They are
for people to compare by eye, and for comparing two runs on the same machine pixel by pixel.
They are not a CI check: fonts and graphics differ between machines, so a pixel test in CI
would fail for reasons that have nothing to do with the change.

## What it takes

Every page in `bboard-ui/src/config/route-tiers.ts` that opens without a record, plus
`/docs/spec` (for `/docs/:doc`) and a made-up path (the not-found page). Pages that need a record
or a licence (a path with `:`) are listed on the contact sheet as skipped. Each page is taken
full length on a phone (390×844) and a laptop (1440×900), in English and Japanese.

The page list comes from `route-tiers.ts`, so a new page is included without changing the script.

Runs are made to repeat exactly: the date is fixed, timers and animations run on the test's
clock, the page is scrolled through so what draws on screen has drawn, and random numbers are
seeded (only inside the throwaway test browser; nothing leaves the machine).

## How to run it

In `bboard-ui`:

```
npm run e2e:build
npm run screenshots
```

The pictures and a contact sheet (`index.html`) go to `bboard-ui/screenshots/out/`, which is
not committed. `SHOTS_DIR=<folder>` puts them somewhere else. A run takes 10 to 15 minutes.

## Comparing a branch with main

```
git switch main && npm run e2e:build && SHOTS_DIR=/tmp/before npm run screenshots
git switch <branch> && npm run e2e:build && SHOTS_DIR=/tmp/after npm run screenshots
node screenshots/compare.mjs /tmp/before /tmp/after
```

It lists every picture that changed, with how many pixels, writes a diff picture for each
(changed pixels in red) to `/tmp/after/diff/`, and exits with 1 if anything changed. Both runs
must be on the same machine.
