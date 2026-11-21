// The record app in English: the recovery sheet (easy mode step 3, veilcore/account-copy.ts and
// recovery-code.ts; components/flow/RecoverySheet.tsx). The sheet's own words follow the UX
// review (section 3): "VeilCore recovery sheet… Keep this with your herd book…", and the one line
// against phishing: the code is asked for only when restoring on a new device at the site.
// Plain words: "recovery sheet", "recovery code", never "slot" or "key". Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const recovery = {
  // What can be wrong with a typed code.
  'app.recovery.err.length': 'A recovery code has 28 characters. Check you typed all of it.',
  'app.recovery.err.typo': 'That code has a mistake in it. Check each character against your sheet.',
  'app.recovery.err.wrong': 'That code doesn’t open any saved records. Check it against your sheet.',
  'app.recovery.err.notThisSheet': 'That’s the code from an older sheet. Type the code on the sheet you just printed.',
  'app.recovery.err.needsSheet':
    'Your passkey can’t open your saved records here. Type the code from your recovery sheet to set it up again.',

  // Offered on the "Saved." screen, right after Face ID is set up.
  'app.recovery.prompt.title': 'One more thing: your recovery sheet',
  'app.recovery.prompt.recommended': 'Recommended',
  'app.recovery.prompt.text':
    'If you ever lose your Apple or Google account, this sheet is the only way back. VeilCore can’t recover it for you.',
  'app.recovery.prompt.bound': 'Make it now: it is the only way back. VeilCore can’t recover it for you.',
  'app.recovery.prompt.make': 'Print or save my recovery sheet',
  'app.recovery.prompt.later': 'Later',

  // Making it, printing it, checking it.
  'app.recovery.title': 'Your recovery sheet',
  'app.recovery.intro':
    'It has a code that opens your saved records on a new device. The code is made on this device, and VeilCore never sees it.',
  'app.recovery.asking': 'Your device asks once, to open your records and make the sheet.',
  'app.recovery.haveOne': 'I have my sheet: check it',
  'app.recovery.onlyNow':
    'This code is shown only while this window is open. Print the sheet, or write the code down, before you close it.',
  'app.recovery.print': 'Print or save as PDF',
  'app.recovery.next': 'Next: check it',
  'app.recovery.confirm.lead': 'To make sure your sheet is right, type the whole code from it.',
  'app.recovery.confirm.label': 'Recovery code',
  'app.recovery.confirm.check': 'Check it',
  'app.recovery.confirm.skip': 'Skip for now',
  'app.recovery.confirm.back': 'Show the code again',
  'app.recovery.done.title': 'Your recovery sheet works.',
  'app.recovery.done.text': 'Keep it with your important papers. Any older sheet no longer works.',
  'app.recovery.done.ok': 'Done',
  'app.recovery.close': 'Close',
  'app.recovery.failed': 'That didn’t work: {why}',

  // The sheet itself, as it is printed.
  'app.recovery.sheet.title': 'VeilCore recovery sheet',
  'app.recovery.sheet.keep':
    'Keep this with your herd book or other important papers. Don’t photograph it or email it.',
  'app.recovery.sheet.codeLabel': 'Recovery code',
  'app.recovery.sheet.made': 'Made on {date}.',
  'app.recovery.sheet.passkey':
    'The passkey that opens the same records is named “VeilCore: unlocks your records · {tag}” in your passwords.',
  'app.recovery.sheet.how':
    'To get your records back: go to {site}, tap “Get my records back”, then “Other ways”, choose “Use my recovery sheet”, and type the code.',
  'app.recovery.sheet.phishing':
    'VeilCore asks for this code only at {site}: to check this sheet, or to get your records back. Never type it anywhere else. Never read it out on a phone call, WhatsApp or email, even to VeilCore.',
  'app.recovery.sheet.anyone':
    'Anyone with this code can open your records. VeilCore doesn’t keep it and can’t tell it to you again.',
  'app.recovery.sheet.newer': 'When you check a newer sheet, this one stops working.',

  // Getting records back with it on a new device.
  'app.recovery.restore.use': 'Use my recovery sheet',
  'app.recovery.restore.lead': 'Type the code from your recovery sheet. Dashes and spaces don’t matter.',
  'app.recovery.restore.what':
    'A recovery sheet is a printed page with a 28-character code. You can make one in Settings after setting up a passkey; if you never made one, use another way.',
  'app.recovery.restore.open': 'Open my records',
  'app.recovery.restore.addTitle': 'Open them by yourself next time',
  'app.recovery.restore.addText':
    'Set up a passkey on this device, so it keeps saving and opens your records without the sheet.',
  'app.recovery.restore.added': 'Done. This device opens your saved records by itself now.',

  // Settings.
  'app.settings.ways.sheet': 'Recovery sheet · made {date}',
  'app.settings.ways.sheetChecked': 'Checked {date}.',
  'app.settings.ways.sheetUnchecked': 'Not checked yet: type its code to check it.',
  'app.settings.sheet.why':
    'A recovery sheet opens your saved records on a new device if you lose the phone or computer your passkey is on, or the account it’s saved in.',
  'app.settings.sheet.make': 'Make a recovery sheet',
  'app.settings.sheet.makeNew': 'Make a new recovery sheet',
  'app.settings.sheet.check': 'Check my recovery sheet',
  'app.settings.faceId.here': 'This device opened your records with the recovery sheet.',

  // The one line on Home.
  'app.account.line.makeSheet': 'Make a recovery sheet',
  'app.account.line.later': 'Later',
  'app.account.line.reminder': '<b>Make a recovery sheet:</b> your way back if you ever lose your passkey.',
  'app.account.line.reverify': 'It’s been a while. Check that your passkey still opens your saved records.',
  'app.account.line.check': 'Check',

  // The "Keep your records safe" sheet when only the recovery sheet can set Face ID up again.
  'app.account.sheet.setUpAgain': 'Set it up again',
  'app.recovery.noPrinter':
    'No printer? Write the code on paper by hand. If you save a PDF, keep it on a USB stick, not in email, chat, iCloud, Google Drive or OneDrive.',
  'app.recovery.prompt.laterBound': 'I’ll do it later',
  'app.recovery.err.noMatch': 'That doesn’t match your sheet. Check each character, then try again.',
  'app.recovery.done.first': 'Keep it with your important papers, not on your phone.',
  'app.recovery.sheet.lost': 'Lost this sheet, or someone saw it? Make a new one in Settings now.',
  'app.recovery.sheet.letters': 'There are no letters O, I or L in it: read them as 0 and 1.',
  'app.account.sheet.noSheet': 'I don’t have my sheet: start again',
  'app.account.sheet.noSheetConfirm':
    'Start again without the sheet? Your saved records are replaced by a new copy from this device, and every recovery sheet stops working. Records kept only on your other devices come back when those devices save again.',
};
