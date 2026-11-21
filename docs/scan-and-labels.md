# Scan, don't type, and QR labels

Status: built in the site (`bboard-ui`), tested in a browser with a fake camera. Not live
anywhere until a deploy carries it; it has not been tried on a real phone camera, a stick
reader or an NFC tag yet.

## Scan

A **Scan** button sits at the end of these boxes:

| Where | Box |
| --- | --- |
| Logging an animal | Individual ID, sire's and dam's individual ID |
| A batch of young (`BatchFlow`) | each young's ID (a reader's Enter moves to the next box) |
| Sending to a lab | sample ID, seal number |
| Receiving a sample (lab) | sample ID on arrival |
| A lab result | sample ID |
| The app's paste box | anything someone sent: a scanned check link or proof link opens at once, as Go would; anything else (a lab code, a proof request, an agreement to sign) only fills the box, for the holder to read and press Go |
| `/verify` (public) | "Scan a label's QR code": only a VeilCore label is taken. A check link opens its check page, a bare record ID fills the box; any other code (an ear tag, a lot number) is refused in the window and goes nowhere, so this page can't become a look-up by tag number |

How it reads:

- **The browser's own `BarcodeDetector`** where it reads QR codes (Chrome on Android, macOS,
  ChromeOS).
- **Elsewhere** (iPhone and iPad, Firefox, Chrome on Windows and Linux): the bundled reader,
  [`zxing-wasm`](https://github.com/Sec-ant/zxing-wasm) 3.1.6, pinned exactly. MIT; the
  ZXing-C++ code inside it is Apache-2.0. Its reader-only WebAssembly is 947 KB (414 KB gzipped)
  plus 38 KB of script, served from this site and fetched only when someone presses Scan on such
  a browser. The package's default of fetching the WebAssembly from jsDelivr is replaced
  (`scan/decoder.ts`), and the Content-Security-Policy (`connect-src 'self'`) would refuse it
  anyway. Three type-only packages come with it in the lockfile (`type-fest`, `tagged-tag`,
  `@types/emscripten`); none of them is in the built site.
- Formats: QR, Data Matrix, Code 128, Code 39, Code 93, Codabar, EAN-13, EAN-8, UPC-A, UPC-E,
  ITF, PDF417, Aztec.

What stays true:

- Frames are read in the tab and dropped. Nothing about a scan is sent anywhere: the text goes
  into the box, and from there only where that box already goes (for a record, inside the sealed,
  locked record).
- A scanned link opens only its path on this site (`scan-text.ts checkPathOf`, `paste.ts`), never
  the host the code names.
- The camera is never required. The window's first focus is "Type it instead"; a refused,
  missing or broken camera says so and offers typing. The camera is released as soon as a code
  is read or the window closes.
- There is no look-up by tag number, and there must never be one: it would let anyone link a
  known animal to its records.

`Permissions-Policy` changes from `camera=()` to `camera=(self)`: this site's own pages may ask
for the camera (the browser still asks the person); no other origin or frame can. Microphone and
location stay off.

### Bluetooth stick readers

Many livestock stick readers (Allflex RS420, Gallagher and others) can pair as a Bluetooth
keyboard and type the tag number into whatever box has focus, usually followed by Enter or Tab.
None has been tried with the site yet, so the help text says "many … can", not "works".
In a batch of young, a reader's Enter moves to the next young's box. The ID
boxes trim what the reader adds (spaces, line breaks, STX/ETX) and never let Enter submit the
form (`scan-text.ts readerKeyDown`). The help text under the animal's ID box says how to use one.

### NFC

On Chrome for Android a second button reads one NFC tag's first text or link record
(Web NFC, `NDEFReader`) into the box. Elsewhere it is hidden. An iPhone opens a link written on a
tag by itself, which covers "tap to check" without the site.

## QR labels

From a record ("Print a QR label", next to "Open check page") and from a batch just saved
("Print QR labels for these records"). From a record, the records made from it (its batch) are
offered too, not ticked. The records go to `/records/labels` in the tab's router state, never in
the address.

Sizes:

| Choice | Paper | Labels |
| --- | --- | --- |
| 2 × 1 inch | one label per page, for label printers | 1 |
| US Letter, Avery 5160 size | 2⅝ × 1 in, 3 × 10, 2.75 in horizontal pitch | 30 |
| A4, Avery L7160 size | 63.5 × 38.1 mm, 3 × 7, 66.04 mm horizontal pitch | 21 |

Margins are worked out from the paper and the pitch (`label-layouts.ts`). Labels already used on
a sheet can be skipped, and each record can have several copies. The page draws the labels on the
device. Two buttons:

- **Download PDF** saves the sheet as a PDF in one tap (`label-pdf.ts`, `label-download.tsx`),
  so nobody has to find "Save as PDF" in a phone's print window. Each PDF page is the paper at
  its true size (2 × 1 in, US Letter or A4), with every label where the screen puts it
  (`labelParts`, shared with the screen). The QR codes are vector (one filled rectangle per run
  of dark modules, from qrcode.react with the screen's settings), so they print sharp at any
  size. The words beside them are a 600 dpi greyscale picture of just the lines, drawn once per
  record by the browser in the screen's fonts: a PDF's built-in fonts have no Japanese or other scripts a name may use, and
  embedding a font would make every file large. The PDF is written by hand (PDF 1.4, compressed
  with `fflate`, already in the site); no PDF library was added. The file is
  `veilcore-labels-<record ID>-<paper>.pdf` for one record, the device's date in place of the ID
  for several. The PDF is made inside the tap, so the browser lets it save, and saved from a
  `blob:` address with a `download` link (Safari on iPhone and iPad 13 and later, Chrome,
  Firefox, Edge); a browser without `download` opens it in a new tab. Some browsers take the tap
  and save nothing (an app's built-in browser, perhaps an iPhone Home Screen app), so a
  "Nothing saved? Open the PDF" link to the same file stays under the buttons until the labels
  change. Not yet tried on a real iPhone. One difference from the screen: a line too long for
  its room is squeezed to fit in both, but the screen squeezes by an estimate of its width and
  the PDF by its measured width, so a line can sit a little differently.
- **Print** opens the browser's print window (100% or "Actual size", no margins).

What a label carries:

- **By default:** the short record ID (`VEIL-3F9A…C21B`) and "Scan to check". The QR code opens
  `/verify/<id>?fp=<proof code>`: both are public on the check page.
- **If the holder ticks "The record's name too":** the name on the label, and the name with its
  salt after the `#` (`n`, `ns`), so the check page says whether it matches. Anyone who scans
  the label reads the name; the page says so. A name over 60 characters is printed (cut to fit)
  but left out of the QR code, which would otherwise be too dense to read on a 1 inch label.
- **Never:** the DNA report's or lab report's salt, on-chain links, or anything sealed. The
  holder's own check link may carry those; a label never does (`labels.test.ts`).

## Tests

- `src/scan/scan.test.ts`, `src/components/labels/labels.test.ts`, `src/vercel-config.test.ts`.
- `e2e/scan-labels.spec.ts`: a fake camera (`e2e/fake-camera.ts` draws the QR code into a Y4M
  video at test time) read by the bundled reader on `/verify` and in the paste box; no camera; a
  stick reader's burst; printing labels as a PDF of the chosen paper; Download PDF saves a PDF of
  that paper, named for the record, whose QR code reads back as the check link
  (`e2e/label-pdf-read.ts`).
- `src/components/labels/label-pdf.test.ts`: page sizes, one QR code per label in its place, the
  words drawn once per record, and every code read back with zxing-wasm.
