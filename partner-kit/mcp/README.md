# veilcore-mcp

Check VeilCore records and documents, and make a link to start a record, from an AI assistant
that speaks the Model Context Protocol (Claude Desktop, ChatGPT's desktop app, and others). It
runs on your computer, talks to the assistant over stdio, and is read-only: it never saves,
signs or sends anything, and never reads a record's private contents.

Status: in this repository, not published to npm yet. Build it with
`node partner-kit/mcp/scripts/build.mjs` (from the repository root, after `npm ci`); the server
is then `partner-kit/mcp/dist/veilcore-mcp.js`.

```json
{
  "mcpServers": {
    "veilcore": { "command": "node", "args": ["/path/to/veilcore/partner-kit/mcp/dist/veilcore-mcp.js"] }
  }
}
```

## The tools, and what each one reveals

The assistant's provider (Anthropic, OpenAI, …) sees what you type to the assistant, every
tool's arguments and every tool's answer. VeilCore's registry sees only what a tool asks it.

| Tool | What it does | Sent to VeilCore's registry | Seen by the assistant's provider |
| --- | --- | --- | --- |
| `check_record(link)` | The public check of a record, as the check page does it (`record-check`): whether the registry has it, whether its proof code matches the link, its date stamp looked up on Midnight itself, lab signatures, and what none of this shows. `acceptable` is true only when nothing contradicts the record **and** its date stamp was checked on Midnight here; otherwise `missing` lists what is lacking (a date the registry only reports, no date yet, a look-up that couldn't be made). `nothingContradicts` and `datedOnChain` are the two halves. | The record's id and proof code from the link, and your computer's address, as for anyone opening the check page. A Midnight indexer sees the batch's transaction id. | The link, and the check's answer. |
| `check_document(link, path)` | Whether a file on your computer is, byte for byte, one of the files sealed in the document record the link names. | Nothing. | The link, the file's path, and `{"match": true}` or `{"match": false}`. Never the file, its hash, its name or its size, and never whether there is a file at that path (a path with no readable file answers `false` too). |
| `draft_link(kind, preset, count)` | A `veilcore.org/new#draft=…` link that opens the logging screen for one record, a cross, clones of a plant or offspring of an animal. | Nothing. | The kind, preset and count, and the link. |

What the tools do not do:

- `check_document` does not check the document's date. A document check link carries the
  record's sealed fields; anyone can write a link that lists a file. Open the link in a browser
  to see whether that document is dated on Midnight, and when.
- `draft_link` puts only the kind of record, the preset and how many in the link (at most 500,
  the bulk import's limit). Never a name, a parent or a record: the person picks those on the
  screen, which marks everything the link filled and saves nothing until they press Save.
- `check_document` reads only a file inside one folder: `VEILCORE_MCP_ROOT`, or, unset, the
  folder the server was started in. There is no "anywhere" setting. It reads only the path
  given in the call, and refuses a link that says where to look (a `path`, `file`, `folder` or
  similar field in the link, or a file name that is a path): a document check link never carries
  one, and a link planted in a page or a message could otherwise turn this tool into a way to
  find out which files are on your computer. It also refuses a link to another file (a symbolic
  link), the system's pseudo-files (`/proc`, `/sys`, `/dev`), anything over 1 GB, and a link
  listing more than 20 files.
- `check_record` never calls a date acceptable on the registry's word alone. On Midnight's main
  network the look-up needs a Blockfrost project id: set `VEILCORE_BLOCKFROST_PROJECT_ID` (never
  put it in a file or a chat), or `VEILCORE_INDEXER` and `VEILCORE_SECOND_INDEXER` for indexers
  you trust. Without one, every main-network record comes back `acceptable: false` with
  `missing` saying the date stamp could not be looked up.
- None of them hashes or reads a file you did not name, and none keeps anything after it answers.

`VEILCORE_REGISTRY` names another registry for `check_record`; `VEILCORE_ORIGIN` another site
for `draft_link`. Defaults: VeilCore's public registry and `https://veilcore.org`.

A record shows prior possession by a date. The tools' answers say which facts were checked and
which are someone's word; VeilCore does not vouch for the material.
