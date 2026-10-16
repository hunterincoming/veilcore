# The landing page's explainer video

`explainer.html` draws the whole animation from one function, `render(t)`, so every frame
is exact and the video can be changed and re-rendered in minutes. Colours and fonts are the
site's light design. It runs 60 seconds, to match the "60 s" chip on the landing page.

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
- Genetic data never leaves your computer. The plant name and other typed fields are kept
  on VeilCore's server, and the plant name is on every check page.
- "Prove it" shows the person controls the key the record names (spec 3.6.1). It says
  nothing about who bred the plant. The checker's screen shows no record date, so the video
  doesn't either.
- The end card says "Prove it: on the test site first." (veilcore.org doesn't have it yet;
  lab reports are on both sites since 16 October).
- Lab receipts are signed with the lab's own key and kept by VeilCore's registry, not the
  chain. A lab report reaches VeilCore's server only when a lab sends it back, locked so
  only the holder can open it; VeilCore can't read it, and never says it "holds" the
  file. VeilCore doesn't vouch for results.
- No customers or partners claimed; nothing about licensing; all names and dates are made
  up.
