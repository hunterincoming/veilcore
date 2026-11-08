# Ask VeilCore

Status: BUILT on branch `ask-veilcore`, 6 November 2026. Not on veilcore.org or the test site
yet. Five languages (English published; German, Spanish, French and Japanese drafts like the
rest of the app).

Ask drafts; only you save, sign or send. It works with Wi-Fi off.

## What it is

An **Ask** button on the record app's pages (「VeilCoreに聞く」 in Japanese; never "AI"). It is a
chat bubble at the bottom right; on a touch screen it steps aside while a field that brings up
the keyboard (not a checkbox or radio) has focus on the page, so it never sits on the field or
its button with the keyboard up. Once someone has a
record, a hint sits by it with an example naming their own latest record ("Try: cut 6 clones
from Gelato", or "Try: record 2 calves from Daisy" for someone whose records are mostly
animals); tapping it opens Ask with the example typed in. The example is read with Shortcuts
first, and a record whose name would send it elsewhere ("Due Diligence", "Backup") is passed
over for the next latest; with none that works there is no hint. It shows on three visits at
most, and not again once dismissed or once Ask has been opened. The sheet: on the first open, what Ask can
do, as a list that claims only what it does (batches, what's due, words like "proof code", your
records, a new record filled in for you to check and save) and "I never sign or send anything.
You do.", then folded under "What can Ask do?"; suggestion chips; a text box. By default there
is no AI model (an optional on-device one is built but left out of the site: v2.1). The engine
is called
**Shortcuts**: fixed word lists in five languages (`bboard-ui/src/ask/shortcuts.ts`), built into
the page, instant and offline.

What it does:

- **Batches.** "Cut 12 clones from Blue Dream #12", "3 calves from Bull #4 x Cow #9": one
  review screen with N new records, each naming its parent(s) inside its own sealed record, and
  one Save. Also on a record's own page: "Cut clones from this" (plants), "Record offspring"
  (animals). See [Batches](#batches).
- **A record or a cross.** "New plant Harbour Mist", "cross Blue Dream x Gelato" (交配): opens
  the logging screen with the name and the parents filled in.
- **What's due.** Royalty reports, payments and agreement end dates for the live agreements in
  this browser. Each period's step comes from the deal's signed messages as this page last read
  them (on the license page, or for the backup), worked out exactly as the license page does
  (`royalty-ledger.ts` `periodRows`): a report not sent or sent back to fix, and a payment
  accepted and not made, stay on the list, marked overdue, until they are done; a period that is
  done, or waiting on the other side's answer or confirmation, isn't listed. Ask reads no
  messages itself, so an agreement whose messages this page hasn't read yet is a link to open it,
  not a guess. A calendar file (.ics) of the dated items, and a reminder to share that says only
  how many items are due ("2 items due on VeilCore"): no names, dates or amounts.
- **Explain.** A fixed glossary: prior possession, proof code, proof, dating, license, royalty
  report.
- **Search my records.** Words, a year, "plant" or "animal", over the records this browser
  holds.
- A miss shows the three closest things Ask can do, never "I didn't understand".

## Privacy

What the sheet says, and what the receipt on every on-chain step says, word for word (the test
`bboard-ui/src/ask/shortcuts.test.ts` checks this page against the app's strings):

> Typing here sends nothing. Only Save does.

Before every step that writes to Midnight, a receipt lists what that step makes public, built
from the contract's own `disclose()` calls and ledger writes ([The receipt](#the-disclosure-receipt)), and then:

> Genetics and DNA files never leave this device unlocked.
>
> Name and notes go to the registry locked with your key. It can’t read them.
>
> The registry sees the kind of record, its proof code and the codes tied to it, and links between records (where one came from, what replaced it). When a record is corrected, it also sees which fields changed and from when.

How that is kept true:

- **Nothing is sent while Ask drafts.** Ask's code makes no request and keeps nothing in
  browser storage but one flag, that the person has seen Ask (a unit test reads its sources for
  `fetch`, `WebSocket`, `localStorage` and the like; the flag and the optional model's download
  live apart in `src/ask-local/` and are tested there). `e2e/ask.spec.ts` counts every request the page makes while a draft is typed and
  answered, online and with the network off: none. The sheet's own file is fetched once, when
  the button is first pressed.
- **The conversation is kept in memory only**, for as long as the page is open: never stored,
  never in a backup.
- **Saving is the app's own Save**, on the screen Ask opens, with the backup step and the
  receipt as for anything else. "Do it for me" (below) is the one exception: there the one
  Approve on the job's page is the Save, and it covers only the plan that page shows.
- **"Do it for me" keeps a job record on this device**, and nothing else new. See
  [Do it for me](#do-it-for-me) for what it holds and when it goes.

## The provenance rule

Every value Ask fills in comes from what you typed in the Ask box in this tab, or from your own
records in this browser. Nothing a counterparty wrote (an invite's label, the other side's
terms, a lab's notes) is ever read for a draft value. Ask reads only its own text box, at most
300 characters, with word lists and plain substring search (no pattern that can take longer than
the text is long).

A draft reaches the logging screen through one reader (`bboard-ui/src/ask/handoff.ts`), checked
there as the screen checks typing, and read once: it is cleared from the address and the router
state, so a reload or Back doesn't fill it again.

- **From Ask, or a record's own page** (router state, this tab only): the kind, the preset, a
  name you typed, how many, and parents that are records in this browser. An id this browser
  doesn't hold is dropped, never looked up.
- **From a link** (`/new#draft=kind=plant&preset=clones&count=12`, as `veilcore-mcp` makes
  them): the kind, the preset and how many, nothing else. The count is capped at 500 (the bulk
  import's limit) and stays editable. A link never names or picks a parent or a record: you pick
  those on the screen.

A filled screen says **"Filled in by Ask. Check every highlighted field."** (from a link: what
the link chose) and marks each field it filled. If a record is already half-typed, the screen
asks before replacing it.

## Batches

1. **Review** (works offline): the parent(s), from your records; how many; a name, numbered
   ("Blue Dream #12 clone 1" …); the date. The screen says saving needs a connection.
2. **Save your backup.** The children are sealed in this browser first, through the bulk
   import's own path (`bulk-import.ts sealRows`, held by `holdForBackup`), so the backup holds
   every new record's key. This is a step in the flow, not a refusal at Save.
3. **Save.** The same sealed records are sent, as the bulk import sends rows: never new ones.

Each child names its parent(s) inside its own sealed record (a private `ParentRef`). Clones are
sealed with "Clone / cutting" as how they were made.

**Optional: make parentage checkable on Midnight.** That part is public, and each child takes
two steps: you name the parent on Midnight, then the parent's holder confirms. The done screen
explains this and links to the record's page (Family on Midnight). Ask never does it for you.

## The disclosure receipt

`bboard-ui/src/veilcore/onchain-receipt.ts` lists, for every circuit in
`contract/src/veilcore.compact` and `contract/src/veilcore-claims.compact` that discloses
anything, each `disclose()` expression it reaches (through the helper circuits it calls, and
the Schnorr module), and the fact the receipt names for it. `onchain-receipt.test.ts` parses the
`.compact` sources and fails when a circuit's disclosures change and the table doesn't.

A step reveals more than its disclosed values: it writes the ledger. The same table lists every
ledger field each circuit writes, and `LEDGER_FACTS` says what writing each field reveals: which
step this was and that it ties the codes together (on every receipt), that two records are linked as
parent and child, that a license or obligation is tied to a record, that the public license
list changed, and how many licenses, obligations or key moves a record has. The test checks the
writes against the sources too, and that every ledger field of both contracts has its words.

The receipt is shown just before the confirm button of every screen that sends a step: sealing
(the key's date stamp), the bulk import's key stamps, prove you hold it, DNA pairing, family on
Midnight, number and lab-signature claims, license issue, activate, prove, revoke and hand-on,
offspring obligations and lender claims. Every receipt also lists the date: a transaction lands
in a block, and the block has a time.

Some examples, as the app says them:

| Step | Goes public on Midnight |
| --- | --- |
| Seal (key date stamp) | A code made from your record’s key (not the record); a code made from the record’s recovery secret; the date |
| Prove you hold it | A code made from your record’s key; the checker’s one-time challenge code; the date |
| Prove a number is at most / at least | The sealed certificate’s proof code; which kind of certificate; which line; the limit you chose (never the number itself); whether at least or at most; the date |
| Prove a value exactly | … and the value on that line, in full |
| Prove a license | A one-time code only the person checking can match; which version of the license list it matched; that the check passed; the date |

## veilcore-mcp

For people who use their own AI assistant: `partner-kit/mcp`, a Model Context Protocol server
written by hand (JSON-RPC over stdio, no SDK, no new dependency). Three read-only tools:
`check_record(link)`, `check_document(link, path)` (yes or no only) and
`draft_link(kind, preset, count)`. What each one reveals to the registry and to the assistant's
provider is in [partner-kit/mcp/README.md](../partner-kit/mcp/README.md).

## Cut from this build, and why

- **License by conversation** ("let Joe grow 50 clones for 2 years at 10%"): the terms screen's
  presets already cover it. v2.1.
- **`hash_file` in veilcore-mcp**: a tool that hashes any path an assistant names is more than
  the checks need; `check_document` reads only the file it is checking and answers yes or no.
- **A live request counter** in the sheet: replaced by the fixed sentence and the browser test
  that proves it.

## v2.1: the on-device language model (optional, off by default)

Status: BUILT on branch `ask-ondevice-model`, 7 November 2026, **left out of the site**. A build
without `VITE_ASK_MODEL` has none of it: `vite.config.ts` makes the flag a constant, so the
model's code, its two workers and WebLLM are not in the bundle, and `public/ask-model/` (the
model libraries) is removed from the output (`load-split.test.ts` checks the site's own build).
With `VITE_ASK_MODEL=on` it is offered only once `bboard-ui/src/ask-local/model-manifest.json`
is pinned (`scripts/pin-model.mjs`, run on the maintainer's Mac: the weights host can't be
reached from the build environment), and it should be turned on only if `scripts/eval-ask.mjs`
shows it clearly beats Shortcuts. Not on veilcore.org or the test site. `test` and `eval` builds
are refused for `--mode preprod` and `--mode mainnet` by `vite.config.ts`, and by
`scripts/vercel-config.mjs` from the environment and from the built files.

The person never sees the word "Shortcuts": the copy says "everything works as usual" without
the model.

Shortcuts sits behind one interface (`bboard-ui/src/ask/engine.ts` `AskEngine`). The model
answers through the same interface (`ask/model-engine.ts`) and is read by the same rules
(`ask/model-output.ts`), so it can do nothing Shortcuts can't:

- **No free-form text.** WebLLM holds the output to a JSON schema of Ask's own actions, kinds,
  glossary words and, as parents, only the ids of the person's records whose names they typed
  (given to the model as id and name, in a block marked as data). Qwen3's "thinking" is off.
- **The provenance rule, as for Shortcuts.** A name, a search or a parent said back is the
  person's own span of what they typed, found by whole words with case and character width
  aside, never the model's string: look-alike letters (fullwidth, mathematical) and word
  fragments can't get into a draft. A count must be one Shortcuts could read: not digits inside
  a record's name ("Cow 9"), a "#12" or a longer number. Explain is the fixed glossary.
  Anything else is dropped. An answer with nothing usable, an error, or 15 seconds with no
  answer: Shortcuts answers. The draft then goes through `handoff.ts` like any other.
- **A test answer first.** After every start, the model must turn "cut 3 clones from Test
  Plant" into exactly that batch on this device, or Ask stays on Shortcuts and says why.

**Model:** Qwen3 1.7B or 0.6B (Apache-2.0), q4f16, in WebLLM 0.2.86 (pinned exactly;
`docs/log/web-llm-lockfile.md`). q4f16 needs WebGPU's `shader-f16`; no q4f32 copy is pinned, so
without it the model is not offered.

**Desktop first.** Offered only on a computer-sized screen with a mouse or trackpad, WebGPU with
`shader-f16`, and 8 GB of memory or more where the browser says. On a phone or tablet nothing
about the model is shown; a computer with a narrow window is told to widen it. Phones: not until
a real test generation passes on one and its memory is enough. The download screen shows in
full on the first open of Ask, then folds to one line ("Optional: a language model on this
computer").

**Where the files come from, and how they are checked.**

- The weights come from Hugging Face, from the model folder **at a pinned commit**
  (`resolve/<commit>/`, never `main`). `scripts/pin-model.mjs` downloads that commit, checks it
  is WebLLM 0.2.86's format (`tensor-cache.json`), and writes every file's size and SHA-256 into
  the manifest, which is compiled into the bundle.
- The model library (`.wasm`) is not fetched from GitHub: the copies built for 0.2.86, from
  `mlc-ai/binary-mlc-llm-libs` at a pinned commit, are served from this site
  (`bboard-ui/public/ask-model/`, only in a build with the model), with their SHA-256 in the
  manifest.
- The download (its own worker) fetches each file itself, the library included, checks its
  SHA-256, and only then stores it where WebLLM reads it (the Cache API; the library under an
  absolute address in `webllm/wasm`, so WebLLM reads it from there and never fetches it). A file
  that doesn't match stops the download and is not kept. Every stored file is checked again
  before every start; WebLLM checks the library, the chat config and the tokenizer against the
  same hashes.
- **Serve a local build on 127.0.0.1, not localhost.** WebLLM always fetches a library
  address containing "localhost" past its cache, and the engine worker may fetch nothing, so
  the model won't start there. The browser tests and `scripts/eval-ask.mjs` use 127.0.0.1.
- **Known gap (accepted):** WebLLM re-reads `tensor-cache.json` and the weight shards from the
  cache after that check and doesn't check them itself. Only code running on this site's origin
  (another tab of it, a hostile extension, an XSS) could swap them in between, and such code
  could already do anything Ask can.

**Content Security Policy.** The page's policy is unchanged for the model (its `connect-src`
stays this site and the registry); it gains only the Trusted Types name for the two worker
addresses. Each worker file has its own policy, on its own route
(`scripts/ask-model-csp.mjs`, `scripts/vercel-config.mjs`), one header each:

- the **download worker** may fetch only the pinned model folders, Hugging Face's file-storage
  host(s) they redirect to (`pin-model.mjs` records every hop), and this site (the library). It
  never sees what is typed;
- the **engine worker** (WebLLM), which holds what is typed, may fetch nothing at all
  (`connect-src 'none'`).

Each worker checks, before anything else, that its own policy is the one in force (it tries
`eval`, which both refuse, and reads the policy the browser reports). A browser that doesn't
apply a worker's own policy gets no model.

**What the download screen says** (all five languages; in Japanese 「端末内の言語モデル」, never
"AI"): what the model is, its real size, that it is kept until deleted, and:

> The model files come from Hugging Face. Hugging Face sees your IP address, the time, which model, and that the request comes from veilcore.org. Nothing you type is sent, then or later.

It also says that starting the model needs a connection: each start loads its program (the
engine worker and WebLLM, about 6 MB, as scripts) from veilcore.org. Those requests carry nothing
typed, but they show this site that Ask was opened with the model on. Once started, answering
makes no request, online or off. Cancel, resume (stored files are not fetched again), delete,
and a storage check before it starts. Any failure says what happened, and that everything works
as usual without the model.

**"Ask sends nothing" stays testable.** The model runs in this browser; typing still sends
nothing. With the model on, the privacy line reads:

> Typing here sends nothing. The language model runs on this device. Only Save sends.

The download worker is the only code in Ask that fetches, and it lives apart
(`bboard-ui/src/ask-local/`), outside the scan of Ask's own code; its own tests check it
fetches only pinned addresses. `e2e/ask-model.spec.ts`:

- loads the real WebLLM 0.2.86 in its worker under the production policies in headless
  Chromium, with stub files from a local stand-in for Hugging Face; the only failure allowed is
  "no WebGPU" (headless has none), and the start fetches only its own scripts, never the
  library or a model file. That page then answers with Shortcuts, offline, with no request;
- covers the model's own answer path: in the test build only, the engine worker runs every real
  check (its policy, every stored file's hash) and then answers with a stand-in instead of
  WebLLM. With the network off, a request Shortcuts can't read is answered by the model path,
  with no request. `scripts/eval-ask.mjs` counts requests while the real model answers on a GPU.

**What Ask stores:** how far the person has got with Ask, under one key
(`veilcore.ask.seen.v1`): how many visits the hint has shown on ("1" to "3"), "dismissed", or
"opened". Seeing the hint is not opening Ask: what Ask can do and the model panel are shown in
full on the real first open. Never what was typed. And, only once the person uses "Do it for
me", the job record and the held rows below.

**To pin it and measure it (the maintainer, on the Mac, in order):**

1. `node scripts/pin-model.mjs --check`, then `node scripts/pin-model.mjs` (downloads about
   1.5 GB from Hugging Face; writes `bboard-ui/src/ask-local/model-manifest.json`). Read the
   diff: two commits, the files and hashes, and the redirect host.
2. `cd bboard-ui && VITE_ASK_MODEL=eval npx vite build --mode preview --outDir ask-eval-dist && cd ..`
3. `node scripts/eval-ask.mjs` (opens Chrome; about 10 to 20 minutes), and again with
   `--model Qwen3-0.6B-q4f16_1-MLC`. It prints Shortcuts' score, the model's, per language, the
   requests made while answering, and "CLEARLY WINS" or not (`scripts/ask-eval-score.mjs`:
   at least 20 more of the 200 right, no language worse, at most 4 that Shortcuts gets right and
   the model gets wrong, no request). Shortcuts gets 144 of 200 (the unit test prints it).
4. Commit the manifest. Only if a model clearly wins does `VITE_ASK_MODEL=on` go into a site
   build, and that is the founders' call.
5. After any deploy, `npm run check:site -- https://veilcore.org` (the release check) now also
   checks Ask's model: for a release built with `VITE_ASK_MODEL` (its build settings say so),
   both worker files must be served with exactly their own policy; for a release without it,
   it says "not checked (built without the model)" and fails if a worker file is listed anyway.
   `node scripts/check-model-headers.mjs https://veilcore.org` does the same from the deploy's
   `.vercel/output/static`, and also checks that the page's policy names no Hugging Face host
   and that a build without the model serves no model library.

Not before it: voice (browser speech sends audio to Apple or Google), photo-to-draft, a cloud
model, WebMCP, agent-to-agent licensing.

## Do it for me

Part A (built): one request, got ready on this device as one finished result, sent only after
one approval. Names: "Do it for me", 「まとめて準備」 (no "AI"), "Für mich erledigen", "Hazlo por
mí", "Faites-le pour moi". It is a switch in Ask's sheet.

The jobs:

1. **A birth or a cut, each with its own details**: "Bella whelped 6 pups, 4 male 2 female",
   "3 calves by AI bull 7HO12345 out of Cow #9", "Daisy calved today, bull calf, tag 1234",
   "cut 12 clones off Blue Dream, tag 1A4-0099". No date stamps. IDs can be pasted as a column on
   the result screen; young saved without them show on Home as "Add 6 IDs".
2. **What's due, reports drafted**: every report due on the agreements this browser holds as a
   licensee, at most 5, in one sheet. The person types each number or ticks "Nothing to report".
3. **Bring in a collection**: "add my 40 mothers". The person picks the file on the result
   screen; the bulk import's own steps read it (`readSheet`, `guessMapping` with the passport
   columns, `checkRows`) and the result says "40 ready, 3 need a fix". No stamps.
4. **Get one record ready to license**: its key date stamp (one sponsored step) and the backup
   check. Home then shows "Blue Dream: ready to license", or "ready tomorrow" while the stamp
   waits.

Batch plus license, and the license quantity field, are Part B and not built: a request that
licenses is refused with the closest things Ask can do.

**The planner** (`src/ask/plan.ts`, `src/ask/clauses.ts`) is Shortcuts: fixed word lists,
deterministic. Every record name in the browser is masked first, received ones too, so a name
someone else chose can't split the text; values bind only to the person's own records. At most
3 clauses, split on joining words in the five languages, Japanese て-form and 「、」 included.
Each clause's reader must use every word but a fixed list of fillers: a leftover word or any
negation refuses the whole plan ("no tag yet" is read as IDs to follow, not a negation). A name
two of the person's own records share is refused. A refusal says what it understood, which words
it couldn't use, and offers a shorter sentence made only from the words typed (or "get <their
record> ready to license" in their language) for them to send. The hint's example, unedited,
never starts a job. `src/ask/plan-phrases.test.ts` holds the users' review phrasings, in five
languages. Every value
carries its source (typed span, own record, the frozen rule "today", or the person on the result
screen); `provenanceHolds` checks it in the tests. The optional on-device model is not used to
plan jobs.

**Nothing is sent while a job is got ready**, except for "What's due": each agreement's messages
are read fresh from the deal channel (reads with the deal's write token, never the holder key),
never from what a page read earlier, and what each report will come to (the top-up to a yearly
minimum included) is fixed in the plan from that read. Jobs are never got ready on a check or
prove page. Records are sealed here and held for the backup (the bulk-import ledger's `held`
state, each row marked with its job, never shared between jobs); sealing needs this browser's
vault key already here (read locally, no request), and without it Ask says "Open VeilCore once with a connection first." `e2e/ask-job.spec.ts` counts
the requests while a batch is got ready, online and with the network off: none.

**Approve** sends the hash of the plan the page drew. In one IndexedDB transaction the job is
approved only if that is still the stored plan's hash and the job is still waiting: an edit in
another tab, then Approve on the stale page, sends nothing. Every edit bumps the plan's `rev`.
Approve stays off until every question is answered and "Can't be undone" has been on screen.
A job page opened from a link is read-only ("Open from Home to approve"). There is no Ask
bubble on a job's page.

**The runner** (`src/ask-job/run.ts`) carries out approved jobs only, only where the page may
send the holder's requests and the tab is visible (never on `/prove` or `/verify`, the same rule
as the stamp background; a records send also stops between batches if the page changes), one
runner across tabs, its lease checked before each step. Each step is written as running before it
sends, and nothing is sent unless the ledger's `pending` write succeeded. A report is signed only
if it comes to exactly the amount and currency Approve showed; otherwise nothing is signed and the
page says the new amount. Records are sent from the ledger as themselves (a resend is the same records); a report is
read for fresh and signed once (`deal-client.ts sayOnce`), so a retry after a lost answer finds
it and sends no second one; a stamp goes through the existing stamp path, its queue entry
marked as started by the approved job, with the stamp queue's "may have gone out" stop. An
unknown outcome stops and asks. There is no automatic rollback.

**The job record** (IndexedDB `veilcore.ask.job.v1`, this device only, never in a backup):

- holds step states and when to try next, the plan's `rev` and hash, when it was made and
  approved, and references: row hashes in the bulk-import ledger, record ids, the agreements'
  invite ids and periods, the report ids made at prepare. Also the few values typed in the
  request that a batch is rebuilt from (counts, a sire's code, a first tag) and the answers given
  on the result screen. A report's typed figures are kept only until that report is sent.
- never holds the request as typed, tokens, secrets, or a copy of what another store keeps.
- expiry is checked on every read. A job waiting for approval expires 72 hours after it was made
  (a report job at the end of its earliest report's due day, if sooner). An approved job that has
  started, or whose records are `pending`, never lapses; 30 days after approval it stops for the
  person to look at. An approved records job not sent by its deadline asks ("Send now" or
  "Discard") and never loses its records; an approved report or stamp job not started expires.
  Any job is deleted 7 days after it ends. Held records are dropped, through `dropHeld` (only
  `held` rows of that job), only for a job whose records step never started; a job's stamps not
  yet made leave the stamp queue when it ends.
- young saved without IDs are listed on Home from the records themselves ("Bella's litter (6):
  add IDs"), not from the job, with a box to paste a column; each ID is saved as a correction.

Also on the device while a job waits: its records in the bulk-import ledger as `held` rows, and
their new keys. A backup made while a job waits holds those keys, for records that may never be
saved: harmless, and said here so it isn't a surprise.
