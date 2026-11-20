// The record app in English: scanning a code into a box (scan/), and printing QR labels that
// open a record's check page (components/labels/). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const scan = {
  // scan/ScanButton.tsx: beside an ID box.
  'app.scan.buttonLabel': 'Scan a QR code or barcode into this box',
  'app.scan.nfcLabel': 'Read an NFC tag into this box',
  // scan/ScanDialog.tsx
  'app.scan.title': 'Scan a code',
  'app.scan.starting': 'Opening the camera…',
  'app.scan.point':
    'Point the camera at the QR code or barcode. It is read on this device; nothing is sent to read it.',
  'app.scan.video': 'Camera view',
  'app.scan.denied':
    'The camera wasn’t allowed. You can allow it in this browser’s settings for this site, or type the code instead.',
  'app.scan.noCamera': 'No camera was found on this device. Type the code instead.',
  'app.scan.unsupported': 'This browser can’t open the camera here. Type the code instead.',
  'app.scan.failed': 'The camera or the code reader couldn’t start. Type the code instead.',
  'app.scan.typeInstead': 'Type it instead',
  'app.scan.done': 'Scanned into “{field}”. Check it before you go on.',
  'app.scan.notLabel':
    'That code isn’t a VeilCore label. Point the camera at the label’s QR code, or type the record ID instead.',
  'app.scan.nfcTitle': 'Read an NFC tag',
  'app.scan.nfcHold': 'Hold the tag against the back of the phone.',
  'app.scan.nfcEmpty': 'That tag has no text or link on it. Type the number instead.',
  'app.scan.nfcOff': 'NFC is off or wasn’t allowed. Turn it on in the phone’s settings, or type the number instead.',
  // Under the animal's ID box.
  'app.scan.readerHelp':
    'Many Bluetooth stick readers for ear tags can pair with this device as a keyboard. If yours can: tap this box, then scan the tag, and the number is typed in.',
  // components/labels/
  'app.labels.open': 'Print a QR label',
  'app.labels.openBatch': 'Print QR labels for these records',
  'app.labels.title': 'Print QR labels',
  'app.labels.intro':
    'Each label has a QR code that opens the record’s check page, the same page as its check link. Stick it on the tube, bag, pot or straw canister; anyone with a phone camera can scan it.',
  'app.labels.made': 'The labels are made on this device. Nothing is sent to make or print them.',
  'app.labels.which': 'Which records',
  'app.labels.all': 'Select all',
  'app.labels.none': 'Clear',
  'app.labels.noneHere': 'None of your records has a check page yet. A record gets one once VeilCore has it.',
  'app.labels.notReady.one': '{count} of these has no check page yet, so it can’t have a label.',
  'app.labels.notReady.other': '{count} of these have no check page yet, so they can’t have labels.',
  'app.labels.what': 'What the label shows',
  'app.labels.showId': 'The short record ID and “Scan to check”',
  'app.labels.showName': 'The record’s name too',
  'app.labels.idNote':
    'The QR code carries only the record ID and its proof code, which the check page shows to anyone. Nothing sealed is ever on a label.',
  'app.labels.nameNote':
    'The name goes on the label and into its QR code, so anyone who scans it sees the name, and the check page says whether it matches the record. Nothing else from the sealed record goes on a label.',
  'app.labels.size': 'Label size',
  'app.labels.size.thermal': '2 × 1 inch, one label per page (label printers)',
  'app.labels.size.letter': 'US Letter sheet of 30 (Avery 5160 size, 2⅝ × 1 inch)',
  'app.labels.size.a4': 'A4 sheet of 21 (Avery L7160 size, 63.5 × 38.1 mm)',
  'app.labels.skip': 'Labels already used on the first sheet',
  'app.labels.skipHelp':
    'Counted along each row from the top left. Printing starts after them, so a part-used sheet isn’t wasted.',
  'app.labels.copies': 'Labels for each record',
  'app.labels.count.one': '{count} label',
  'app.labels.count.other': '{count} labels',
  'app.labels.print': 'Print or save as PDF',
  'app.labels.printHelp':
    'Your browser’s print window opens. Choose 100% or “Actual size” and no margins so the labels line up, or “Save as PDF” to keep a file. Print one test sheet on plain paper first.',
  'app.labels.preview': 'How the labels will print',
  'app.labels.pageOf': 'Page {n} of {of}',
  'app.labels.scanToCheck': 'Scan to check',
  'app.labels.back': 'Back',
};
