# The landing page's explainer video

`explainer.html` draws the whole animation from one function, `render(t)`, so every frame
is exact and the video can be changed and re-rendered in minutes. Colours and fonts are the
site's light design.

Re-render (needs ffmpeg; from this folder):

    node render.cjs all 3

then encode the frames with
`ffmpeg -framerate 30 -i frames/frame_%05d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -movflags +faststart veilcore-walkthrough.mp4`
and copy the MP4 and a poster JPG to `../../public/media/`.

The words follow the site's rules: "hold", never "own"; no customers or partners claimed;
nothing about licensing (practice only).
