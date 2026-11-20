// The record app in English: records saved with VeilCore (veilcore/account-copy.ts): the "Keep
// your records safe" sheet, the one account line on Home, Settings, and getting records back on
// another device (components/flow/KeepSafe.tsx, SettingsPage.tsx, RestorePage.tsx). Plain words:
// "saved with VeilCore", never "vault", "slot" or "key" (the UX review, 19 Nov). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const account = {
  // How this device opens a passkey, on its button.
  'app.account.use.faceId': 'Use Face ID',
  'app.account.use.touchId': 'Use Touch ID',
  'app.account.use.screenLock': 'Use your screen lock',
  'app.account.use.windowsHello': 'Use Windows Hello',
  'app.account.use.passkey': 'Use a passkey',

  // The sheet after the first record is saved.
  'app.account.sheet.title': 'Keep your records safe',
  'app.account.sheet.lead': 'So you can get them back, even if you lose this device.',
  'app.account.sheet.how':
    'Your records are saved with VeilCore, locked so only you can open them: VeilCore doesn’t have the key. Your other phones and computers on the same Apple or Google account open them too. Documents you keep on this device only aren’t included.',
  'app.account.sheet.usePhone':
    'This computer can’t unlock a passkey by itself. Your browser will offer “Use a phone”: scan the code with your phone.',
  'app.account.sheet.twice': 'Your device asks twice: once to make the passkey, once to check it opens your records.',
  'app.account.sheet.otherWays': 'Other ways',
  'app.account.sheet.file': 'Keep a file myself',
  'app.account.sheet.fileHint': 'A file you keep yourself, on a USB stick or in a password manager. Also in Settings.',
  'app.account.sheet.notNow': 'Not now',
  'app.account.sheet.failed': 'That didn’t work: {why}',
  'app.account.saved.title': 'Saved.',
  'app.account.saved.text': 'Your records are saved with VeilCore. New ones save by themselves.',
  'app.account.saved.bound':
    'Saved with VeilCore, but this passkey stays on this device only: if you lose the device, it goes too. Download a copy you keep yourself to be safe.',
  'app.account.saved.download': 'Download a copy',
  'app.account.saved.done': 'Done',

  // The one line on Home, shown only when something is wrong.
  'app.account.line.none': '<b>Not saved to your account yet.</b>',
  'app.account.line.fix': 'Fix it',
  'app.account.line.older': '<b>Unlock your saved records once to keep saving.</b>',
  'app.account.line.locked': '<b>Saving is paused on this device.</b> Open your records once to carry on.',
  'app.account.line.continue': 'Continue',
  'app.account.line.missing': '<b>Your records saved with VeilCore are gone from its server.</b> Save them again.',
  'app.account.line.saveAgain': 'Save again',
  'app.account.line.slotMissing':
    '<b>A way to open your saved records is missing on VeilCore’s server.</b> Set it up again.',
  'app.account.line.serverOlder':
    '<b>Something looks wrong on VeilCore’s server.</b> Your records on this device are fine, and nothing was changed. Download a copy to be safe.',
  'app.account.line.failing': '<b>Couldn’t save to your account.</b> {why} It tries again by itself.',
  'app.account.line.tryNow': 'Try now',
  'app.account.line.bound':
    '<b>Saved with VeilCore, but only this device can open it.</b> Download a copy you keep yourself.',
  'app.account.line.download': 'Download a copy',
  'app.account.line.deviceOnly.one': '<b>{count} document is only on this device.</b> Download a copy to keep it safe.',
  'app.account.line.deviceOnly.other':
    '<b>{count} documents are only on this device.</b> Download a copy to keep them safe.',
  'app.account.line.stale': 'Your {device} hasn’t saved since {date}. If you still use it, open VeilCore on it.',
  'app.account.line.gone': 'Remove this device',
  'app.account.line.unknownSlot': '<b>Something you didn’t add can open your saved records.</b>',
  'app.account.line.seeSettings': 'See Settings',

  // Kinds of device, in "your iPhone".
  'app.account.device.iphone': 'iPhone',
  'app.account.device.ipad': 'iPad',
  'app.account.device.android': 'Android phone',
  'app.account.device.mac': 'Mac',
  'app.account.device.windows': 'Windows computer',
  'app.account.device.linux': 'computer',
  'app.account.device.other': 'other device',

  // Getting records back on another device.
  'app.account.restore.lead': 'Open your records on this device.',
  'app.account.restore.sameAccount': 'Same Apple or Google account as your other phone? This just works.',
  'app.account.restore.usePhone':
    'On a computer without Face ID? Choose “Use a phone” in the window that opens, then scan the code with your phone.',
  'app.account.restore.oldName': 'Made your passkey on {host} before? Try it here',
  'app.account.restore.otherWays': 'Other ways',
  'app.account.restore.found': 'Found your records saved with VeilCore on {date}. Bring them to this device?',
  'app.account.restore.bring': 'Bring them here',
  'app.account.restore.notThis': 'Not this one',
  'app.account.restore.welcome.one': 'Welcome back. {count} record is here.',
  'app.account.restore.welcome.other': 'Welcome back. {count} records are here.',
  'app.account.restore.elsewhere.one':
    '{count} document is kept only on your {device}, so it isn’t shown here. Open it there.',
  'app.account.restore.elsewhere.other':
    '{count} documents are kept only on your {device}, so they aren’t shown here. Open them there.',
  'app.account.restore.savedOn': 'From your records saved with VeilCore on {date}.',

  // Settings.
  'app.settings.title': 'Settings',
  'app.settings.link': 'Settings',
  'app.settings.account.title': 'Saved with VeilCore',
  'app.settings.account.on': 'Saved {date}. New records save by themselves.',
  'app.settings.account.bound': 'Saved {date}, but only this device can open it.',
  'app.settings.account.off': 'Not set up. Save your records with VeilCore so you can get them back on a new phone.',
  'app.settings.account.why':
    'Your records are kept locked on VeilCore’s server, and only you can open them. They come back from there, so this works while VeilCore is running. A copy you download works without VeilCore.',
  'app.settings.ways.title': 'Ways to open them',
  'app.settings.ways.synced': 'Passkey on your devices with the same Apple or Google account · added {date}',
  'app.settings.ways.bound': 'Passkey on one device only · added {date}',
  'app.settings.ways.unknown.one':
    '{count} way in that you didn’t add can open your saved records. If you didn’t add it, stop saving with VeilCore and set it up again.',
  'app.settings.ways.unknown.other':
    '{count} ways in that you didn’t add can open your saved records. If you didn’t add them, stop saving with VeilCore and set it up again.',
  'app.settings.devices.title': 'Your devices',
  'app.settings.devices.line': '{device} · last saved {date}',
  'app.settings.devices.here': '{device} (this one) · last saved {date}',
  'app.settings.stop': 'Stop saving with VeilCore',
  'app.settings.stopConfirm':
    'Delete your records saved with VeilCore? This device keeps them. Your other devices stop saving, and the first of them to save again sets up a new copy. The passkey stays in your phone’s settings.',
  'app.settings.stopped': 'Deleted. Your records stay on this device.',
  'app.settings.file.title': 'Download a copy',
  'app.settings.file.text':
    'A file you keep yourself. It works without VeilCore, and it is the only other place documents you keep on this device only are saved.',
  'app.settings.file.button': 'Download a copy',
  'app.settings.devices.removeConfirm': 'Remove your {device} from this list? If it saves again, it comes back.',
  'app.account.line.healed':
    'Something looked wrong on VeilCore’s server. Your newest copy was saved again, and nothing was lost.',
  'app.account.line.ok': 'OK',
  'app.account.line.deletedHere.one': '<b>{count} record here was deleted on your other device.</b> Keep it here?',
  'app.account.line.deletedHere.other':
    '<b>{count} records here were deleted on your other device.</b> Keep them here?',
  'app.account.line.keepThem': 'Keep',
  'app.account.restore.deleted.one': '{count} record was deleted on your other devices and won’t be brought here.',
  'app.account.restore.deleted.other': '{count} records were deleted on your other devices and won’t be brought here.',
  'app.account.restore.bringAnyway': 'Bring them anyway',
  'app.account.restore.adoptFailed':
    'Your records are here, but this device couldn’t start saving with VeilCore: {why}',
  'app.account.restore.tryAgain': 'Try again',
  'app.account.restore.tryWww': 'First used www.veilcore.org? Open this page there.',
  'app.settings.ways.tag': 'Named “VeilCore: unlocks your records · {tag}” in your passwords',
  // The way in, as a fragment after “with” (Home's first card, the live test on Windows).
  'app.account.how.faceId': 'Face ID',
  'app.account.how.touchId': 'Touch ID',
  'app.account.how.screenLock': 'your screen lock',
  'app.account.how.windowsHello': 'Windows Hello',
  'app.account.how.passkey': 'a passkey',
  'app.account.line.off':
    '<b>Saving with VeilCore is off.</b> Your saved copy was deleted, perhaps with “Stop saving with VeilCore” on another device.',
};
