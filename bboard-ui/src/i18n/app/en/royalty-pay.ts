// The record app in English: royalty payments made visible (overdue, reminders, revoke for
// non-payment, the public check page's notices) and paying in a US dollar stablecoin on
// Cardano (veilcore/royalty-ledger.ts paymentAlerts, veilcore/license-notices.ts,
// veilcore/cardano-pay.ts, components/licensing/RoyaltyPay.tsx). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const royaltyPay = {
  // ---- due soon, overdue: both sides ----
  'app.rpay.st.overdue': 'Overdue',
  'app.rpay.l.soon': 'Reminder: payment for report {n} is due on {date}.',
  'app.rpay.l.overdue': 'Payment for report {n} is overdue since {date}.',
  'app.rpay.l.consequence': 'Not paying shows on the public check page, and the license can be revoked.',
  'app.rpay.i.soon': 'Payment for report {n} from {licensee} is due on {date}.',
  'app.rpay.i.overdue': 'Payment for report {n} from {licensee} is overdue since {date}.',
  'app.rpay.i.public':
    'Your record’s public check page says: “A royalty statement is overdue since {date}.” No amounts, terms or names. It comes off when the payment is in.',
  'app.rpay.i.publicFailed':
    'Couldn’t put this on your record’s public check page just now. The page tries again the next time it opens.',
  'app.rpay.i.publicUnsupported':
    'VeilCore’s registry doesn’t take public notices yet, so this isn’t on your record’s public check page.',
  // ---- revoke for non-payment ----
  'app.rpay.revoke.open': 'Revoke for non-payment',
  'app.rpay.revoke.what':
    'This ends the license on Midnight and can’t be undone. {licensee} gets a signed notice first. Your record’s public check page then says a license from it was revoked for non-payment, and when.',
  'app.rpay.revoke.yes': 'Revoke the license',
  'app.rpay.revoke.note': 'License revoked for non-payment of report {n}.',
  'app.rpay.revoke.reason': 'Non-payment',
  'app.rpay.revoke.done': 'Revoked for non-payment on {date}. The public check page says so.',
  // ---- the public check page ----
  'app.rpay.pub.title': 'Royalties on licenses from this record',
  'app.rpay.pub.overdue': 'A royalty statement is overdue since {date}.',
  'app.rpay.pub.revoked': 'A license from this record was revoked on {date} for non-payment.',
  'app.rpay.pub.who':
    'Said by the holder of this record, who licensed it out. VeilCore doesn’t check it. It names no one and shows no amounts or terms.',
  // ---- paying in a stablecoin on Cardano: the licensor's payout ----
  'app.rpay.payout.option': 'US dollar stablecoin on Cardano',
  'app.rpay.payout.info':
    'They pay from their own wallet straight to your Cardano address, in {code}. By saving this you agree that 1 {code} counts as 1 US dollar. Cardano payments are public: anyone can see the amount, both addresses and the date, but not who you are. A new address just for this deal keeps it apart from your others. VeilCore never holds or moves the money.',
  'app.rpay.payout.token': 'Stablecoin',
  'app.rpay.payout.address': 'Your Cardano address ({prefix}…)',
  'app.rpay.payout.useMine': 'Use my {name} address',
  'app.rpay.payout.sanctioned': 'This address is on the US sanctions list, so it can’t be used.',
  'app.rpay.method': 'on Cardano, in {code} (1 {code} = 1 USD)',
  'app.rpay.addr.not': 'That isn’t a Cardano address (check it was copied whole).',
  'app.rpay.addr.notPayment': 'That isn’t a Cardano payment address (it should start with addr).',
  'app.rpay.addr.otherNetwork': 'That address is for another Cardano network, not {network}.',
  // ---- the licensee's pay screen ----
  'app.rpay.pay.title': 'Pay from your Cardano wallet',
  'app.rpay.pay.button': 'Pay {amount} {code} with {name}',
  'app.rpay.pay.waiting': 'Waiting for your wallet…',
  'app.rpay.pay.wallet': 'Wallet',
  'app.rpay.pay.noWallet':
    'This browser has no Cardano wallet. Open this page where you have one (Lace, Eternl or another CIP-30 wallet).',
  'app.rpay.pay.shows':
    'Your wallet shows it before you sign: {amount} {code} to {to}, a little ada that Cardano requires with a token, the network fee, and the reference {ref}.',
  'app.rpay.pay.screened':
    'Both addresses are checked against the US sanctions list (OFAC, Cardano addresses, list of {date}) before anything is built.',
  'app.rpay.pay.howTitle': 'How this works',
  'app.rpay.pay.how':
    'Your wallet pays {licensor} directly. VeilCore never holds, pauses or moves the money and takes no fee from it. The reference on the payment lets both pages find it on Cardano: once it is 10 blocks deep and pays at least {amount}, the report counts as paid and settled, with no other step. The sanctions check is a list check only: it can’t see where money came from, and the list is only as new as its date.',
  'app.rpay.pay.sent': 'Your wallet signed transaction {tx}, but it isn’t recorded for {licensor} yet.',
  'app.rpay.pay.forget': 'Not in my wallet’s history: pay again',
  'app.rpay.pay.off':
    '{licensor} asked to be paid in {code} on Cardano. Paying that way from this page isn’t switched on here yet: ask them for other payment details.',
  'app.rpay.pay.notUsd': 'This report is in {currency}. Paying in a stablecoin is only for reports in US dollars.',
  'app.rpay.pay.notPar':
    '{licensor}’s Cardano details don’t say that 1 {code} counts as 1 US dollar, so this page can’t offer it.',
  'app.rpay.w.otherNetwork': 'Your wallet is on another Cardano network. Switch it to {network} and try again.',
  'app.rpay.w.sanctioned':
    'Stopped: an address in this payment is on the US sanctions list, or couldn’t be read. Nothing was built or sent.',
  'app.rpay.w.noCoins': 'Your wallet has no coins to pay with.',
  'app.rpay.w.cantBuild': 'Couldn’t build the payment ({why}). Nothing was sent.',
  // ---- the check on Cardano, both sides ----
  'app.rpay.c.checking': 'Checking the payment on Cardano…',
  'app.rpay.c.ok': 'Paid and settled: {amount} in {code}, checked on Cardano (transaction {tx}, {n} blocks deep).',
  'app.rpay.c.unconfirmed': 'The payment is on Cardano but not 10 blocks deep yet. The page checks again.',
  'app.rpay.c.failed': 'That transaction failed on Cardano. It paid nothing.',
  'app.rpay.c.no-ref': 'That transaction carries no VeilCore payment reference.',
  'app.rpay.c.many-refs': 'That transaction carries more than one payment reference, so it counts for none.',
  'app.rpay.c.wrong-ref': 'That transaction’s reference is for another statement.',
  'app.rpay.c.none': 'That transaction paid no {code} to the payout address.',
  'app.rpay.c.short': 'That transaction paid {paid} {code}, less than {amount}. The rest is still owed.',
  'app.rpay.c.not-found': 'Cardano has no such transaction yet (it can take a minute).',
  'app.rpay.c.unreachable': 'Couldn’t reach Cardano. The page tries again.',
  'app.rpay.c.no-relay': 'This site can’t check Cardano yet, so {licensor} confirms the payment by hand.',
  'app.rpay.c.not-tx': 'The payment reference isn’t a Cardano transaction.',
};
