# Home page redesign: what moved where

The home page (`bboard-ui/src/components/site/Home.tsx`) rebuilt in the layout of Mako's design,
18 November 2026. List A is everything on the home page before (origin/main); list B is every
section of Mako's draft home page. Each row says where it is now, or why it is not there.

Anchors other pages link to, all still on the page and checked by `e2e/home.spec.ts`:
`#top`, `#about` (header, app footer), `#how` (header), `#demo`, `#updates`, `#live`,
`#technical` (app footer), `#claims` (the gallery), `#team`, `#contact`, `#status`,
`#questions`, `#value`, `#open` (older links). Help links to `/#live`; the app footer's
"How checking works" to `/#technical`. Arriving at `/#live` or `/#technical` opens that fold.

## A. The home page before

| Before | Now |
| --- | --- |
| Hero: headline (m.hero.title1/2), lede (m.hero.lede) | Hero, same strings; second line in yellow |
| "Your records" button for a returning visitor | Hero, same |
| "Try the demo" button (to #demo) | Hero "Make a record" goes to /new (the app); the demo's ways in are still at #demo |
| "How it works" button (to #how) | Hero, quiet link to #how |
| "Got a lab code or a link? Paste it here" (data-paste-entry="hero") | Hero, same; on a phone above the buttons, as before |
| Status line (m.hero.status) | Hero, under the paste line |
| Live proof code demo (Cultivar, Bred by, real commitment, announced to screen readers) | Hero "Try it. Nothing is sent.", same code and announcements; it also draws the event display |
| DATED stamp and gold strip on the specimen sheet | Dropped from the hero (Mako's has none); "Dated on Midnight" is in step 3's picture. The strings stay |
| What it's for: heading and lede (m.for.title1/2, m.for.lede) | "What did you have, and when?" (#about) |
| Six situations (m.for.1-6) | Five are the gallery "Where it matters" (cutting, variety protection, lab, someone asks, animal lines) with the animal-records mail link and the link to #claims; "Lab results, back to you" (m.for.4) is a card in "More than a date" |
| Four steps (m.step1-4) | "Four steps" (#how), all four texts shown |
| Share proof, not data (lede, five claims, limits, spec link) | #claims: the five claims are buttons, each showing its text under the picture; limits and spec link under it |
| What you get (m.get.1-3) | get.1 under "What did you have, and when?"; get.2 (licenses) and get.3 (lineage) are cards in "More than a date" (#value) |
| Where it stops (m.stops.1-4, m.open.3) | "Where it stops" (#status), five cards |
| If VeilCore disappears (m.open.1, 2, 4, 6) | open.1 in "We don't hold your keys" (#open); open.2, 4, 6 in "For technical readers" |
| Questions (five FAQ) | #questions, unchanged |
| Try the demo: lede, privacy link, Make, Verify, Got a code or link? (data-paste-entry="demo"), video | #demo, unchanged content, as four cards |
| Where things stand: test/main network, no audit (with link to reviews), no sign-up | In #status as a short list, the same three strings and link |
| What's live where table (all rows and cell rules) | #live, folded on every screen; opens at /#live |
| Updates feed (three, older folded, all updates on GitHub, follow on X) | #updates, unchanged |
| For technical readers (check by hand, implementations, Bitcoin stamp, DNA pairing, claims contract status, maintenance key and policy, contract addresses on mainnet) | #technical, unchanged, folded |
| Contact by audience (four groups, buttons) | "Talk to the founders" (#contact), unchanged |
| Founders row with photos and full-profiles link | #team, unchanged |

Nothing from list A was dropped except the hero's DATED stamp, which is decoration (its words
are still used in step 3's picture).

## B. Mako's draft home page

| Mako's | Now |
| --- | --- |
| Header: logo, How it works, Records, About, Make a record | The site's one header on every page: How it works (#how), About (#about), Your records (/records), Verify a record, Make a record (/new; "Try the demo" on the test site). The new gold mark, not his ring |
| Hero headline, lede, buttons | Same layout; the lede is the site's own (his said genetic data stays on your computer; ours says DNA files do, and typed details reach the server locked) |
| Event display (canvas) | Ported (EventDisplay.tsx): draws about a second after each change, pauses off screen, DPR capped at 1.5, static with reduced motion |
| Try it (hash demo) | The site's real commitment instead of his plain SHA-256 of the two fields |
| Marquee of audiences | Same, with a pause button; stops off screen; still with reduced motion |
| Photo break: jar, "Your genetics stay with you" | Same photo, resized; scroll-driven opening (CSS view timeline, never holds the page). His "only a 64-character proof code leaves your computer" became "only a proof code goes on Midnight" |
| Question, timeline (scroll-pinned), word-by-word highlight | Same heading and timeline, drawn with a CSS view timeline instead of a pinned scroll; the paragraph fades in whole |
| Where it matters: pinned horizontal gallery | A swipe/scroll-snap row with previous/next, counter and progress bar; never pinned. Four photos replaced (sources unknown), see public/media/home/CREDITS.md |
| We never hold your genetics (yellow) | "We don't hold your keys" (#open): his headline is not true of typed details, which reach our server locked |
| Four steps: pinned stage with four layers | Not pinned: the step in the middle of the window lights up, or the one chosen; the picture beside it changes |
| Share proof, not data: claim buttons and bar chart | Same, with the site's claim texts |
| More than a date: six cards | Seven: plants/animals/strains, documents, licenses, lab results, lineage, Ask (in every build, on veilcore.org since 13 Nov), and no sign-up moved to the status list |
| Where it stops: sticky stacked cards | Five coloured cards, not sticky |
| Status: main network, no audit, open to first users | The site's own status lines (main network or test site, no audit, no sign-up). "Open to first users" left out: not a string the site has |
| Marquee: prior possession, backdate, zero custody, free to check | Same idea; "Zero custody" left out (typed details are held, locked) |
| Tell us where it fails (yellow) | Same, last section |
| His footer (big CTA, giant wordmark) | The site's one footer, shared with the app |
| His hairline rules and outlined buttons | Left out: the founder's rule for every public page (design.test.ts) is no rules and no outlined boxes |
