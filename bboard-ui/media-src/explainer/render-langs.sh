#!/bin/bash
# Renders the explainer in de, es, fr and ja (frames, MP4, poster), one language at a time.
set -e
cd "$(dirname "$0")"
for L in ${LANGS:-de es fr ja}; do
  VIDEO_LANG=$L node render.cjs all 4
  ffmpeg -y -loglevel error -framerate 30 -i frames-$L/frame_%05d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -movflags +faststart veilcore-walkthrough.$L.silent.mp4
  VIDEO_LANG=$L node render.cjs poster 21.5
  rm -rf frames-$L
  echo "done $L"
done
