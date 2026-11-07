# Ask VeilCore

Status: BUILT on branch `ask-veilcore`, 6 November 2026. Not on veilcore.org or the test site
yet. Five languages (English published; German, Spanish, French and Japanese drafts like the
rest of the app).

Ask drafts; only you save, sign or send. It works with Wi-Fi off.

## What it is

An **Ask** button on the record app's pages (「VeilCoreに聞く」 in Japanese; never "AI"). It opens
a sheet: suggestion chips first, a text box second. There is no AI model. The engine is called
**Shortcuts**: fixed word lists in five languages (`bboard-ui/src/ask/shortcuts.ts`), built into
the page, instant and offline.

What it does:

- **Batches.** "Cut 12 clones from Blue Dream #12", "3 calves from Bull #4 x Cow #9": one
  review screen with N new records, each naming its parent(s) inside its own sealed record, and
  one Save. Also on a record's own page: "Cut clones from this" (plants), "Record offspring"
  (animals). See [Batches](#batches).
- **A record or a cross.** "New plant Harbour Mist", "cross Blue Dream x Gelato" (交配): opens
  the logging screen with the name and the parents filled in.
- **What's due.** Royalty reports, payments and agreement end dates, from the signed terms of
  the live agreements in this browser. A calendar file (.ics), and a reminder to share that says
  only how many items are due ("2 items due on VeilCore"): no names, dates or amounts.
- **Explain.** A fixed glossary: prior possession, proof code, proof, dating, license, royalty
  report.
- **Search my records.** Words, a year, "plant" or "animal", over the records this browser
  holds.
- A miss shows the three closest things Ask can do, never "I didn't understand".

## Privacy

What the sheet says, and what the receipt on every on-chain step says, word for word (the test
`bboard-ui/src/ask/shortcuts.test.ts` checks this page against the app's strings):

> Ask sends nothing; Save does.

Before every step that writes to Midnight, a receipt lists what that step makes public, built
from the contract's own `disclose()` calls ([The receipt](#the-disclosure-receipt)), and then:

> Genetics and DNA files never leave this device.
>
> Name and notes go to the registry locked with your key. It can’t read them.
>
> The registry sees the kind of record (plant, animal, document) and its proof code.

How that is kept true:

- **Nothing is sent while Ask drafts.** Ask's code makes no request and touches no browser
  storage (a unit test reads its sources for `fetch`, `WebSocket`, `localStorage` and the
  like). `e2e/ask.spec.ts` counts every request the page makes while a draft is typed and
  answered, online and with the network off: none. The sheet's own file is fetched once, when
  the button is first pressed.
- **The conversation is kept in memory only**, for as long as the page is open: never stored,
  never in a backup.
- **Saving is the app's own Save**, on the screen Ask opens, with the backup step and the
  receipt as for anything else.

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

## v2.1: an on-device model

Shortcuts sits behind one interface (`bboard-ui/src/ask/engine.ts` `AskEngine`): text and the
person's records in, a draft or something to show out. A model plugged in later answers in the
same shape and is checked by the same reader, so it can do nothing Shortcuts can't.

The plan, not built:

- **Model:** a small open model (Qwen3 1.7B class, Apache-2.0) in the browser (WebLLM, in a
  Web Worker), with its output constrained to the `AskResult` shape. Turned on only after a real
  test answer passes on that device; otherwise Shortcuts.
- **Desktop only first.** Phones are too weak for a useful model today, and the download is
  1-2 GB.
- **Self-hosted weights with their hashes in the bundle.** The weights are served from
  VeilCore's own host, every file's SHA-256 is in the site's own code and checked before use,
  and the Content Security Policy names that host (and the worker gets its own Trusted Types
  policy). The bandwidth (1-2 GB per person who turns it on) is a cost for the founders to
  decide on.
- **A new npm dependency** (WebLLM) means a lockfile change made by hand with npm 11.6.2 and
  reviewed entry by entry.
- **Opt-in, with the size shown first**, cached with `navigator.storage.persist()`.
- Not before it: voice (browser speech sends audio to Apple or Google), photo-to-draft,
  a cloud model in a secure enclave, WebMCP, agent-to-agent licensing.

Why it wasn't built now: the weights host can't be reached from the build environment, so it
couldn't be tested, and the hosting cost is a decision for the founders.
