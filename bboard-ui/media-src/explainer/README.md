# The landing page's explainer video

`explainer.html` draws the whole animation from one function, `render(t)`, so every frame
is exact and the video can be changed and re-rendered in minutes. Colours and fonts are the
site's pollen and ink (src/config/theme.ts): ink #16181D on herbarium paper #F6F3EC, sheets
#FFFDF7, and one colour, pollen gold #F6DA3C, as a fill or a mark (the "Prove it" button, the
dated row, the scan line, toggles), never as text; a check that passed is a ✓ in the quiet
green #2E6B55, and nothing is red (red means an error). Captions and the wordmark are set in
Libre Caslon Text Bold (fonts/, the site's heading face); the rest in Inter and Space
Grotesk. It runs 60 seconds, to match the "60 s" chip on the landing page.

Re-render (needs ffmpeg; from this folder):

    node render.cjs all 3

then encode the frames with
`ffmpeg -framerate 30 -i frames/frame_%05d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -movflags +faststart veilcore-walkthrough.mp4`,
make the poster with `node render.cjs poster 21.5`, copy the MP4 and the JPG to
`../../public/media/`, and delete `frames/`. `node render.cjs snap 6.5 13.8 …` writes single
frames to `snaps/` for checking; `sheet.sh` puts eight of them on one contact sheet.

The words follow the landing page (`src/i18n/en.ts`: hero, "What it's for", "How it works")
and say nothing it doesn't:

- The headline is "Date your record. Keep your genetics." A record shows you had this
  record by a date, not that you had the plant first, and never ownership ("hold", never
  "own").
- Genetic data never leaves your computer. Every typed field, the plant name included, is
  stored locked on VeilCore's server, which doesn't have the key ("Locked on VeilCore's
  server"; sealed records, 16 October, and the name since 17 October). The holder's check
  link carries the name, after the # ("In your check link").
- The record's code is the "proof code" (never "fingerprint": that word means only a DNA
  fingerprint, genetic data).
- "Prove it" shows the person controls the key the record names (spec 3.6.1). It says
  nothing about who bred the plant. The checker's screen shows no record date, so the video
  doesn't either.
- The end card says "Prove it: on the test site first." (veilcore.org doesn't have it yet;
  lab reports are on both sites since 16 October).
- Lab receipts are signed with the lab's own key and kept by VeilCore's registry, not the
  chain. A lab report reaches VeilCore's server only when a lab sends it back, locked so
  only the holder can open it; "VeilCore doesn't have its key" (never "can't read it":
  VeilCore also serves the app's code), and never says it "holds" the file. VeilCore
  doesn't vouch for results.
- No customers or partners claimed; nothing about licensing; all names and dates are made
  up.
