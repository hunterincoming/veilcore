# Agreements: the test run before mainnet

One full run on the test network (test.veilcore.org, preprod) of everything in
`docs/agreements-live.md`, by Hunter, with two devices: the Mac as the breeder and a phone
as the grower. About an hour. Nothing here touches mainnet.

## 1. Put the new code up (Mac, 15 minutes)

**Registry.** Railway → `veilcore-api-preprod` → Settings → Source → Branch: change
`feat/lab-results` to `license-invites`. It redeploys by itself. Wait until the deployment
is Active, then check it lists the new parts:

```
curl -s https://veilcore-api-preprod-production.up.railway.app/health
```

The `features` list must include `license-invites-v1`, `deals-v1`, `payment-receipts-v1` and `passkey-vault-v1`.

**Sponsor** (the test one, `veilcore-sponsor`; never `veilcore-sponsor-mainnet`):

```
cd ~/Desktop/veilcore
git fetch origin
git checkout main
git pull
npm ci
npm run stage -w sponsor
```

Then run the `railway up …` line it prints, linked to `veilcore-sponsor`. In Railway, check
`veilcore-sponsor` has no `SPONSOR_CIRCUITS` variable: without it, a test sponsor pays for the
agreement calls too.

**Site:**

```
VEILCORE_TEST_REGISTRY=https://veilcore-api-preprod-production.up.railway.app VEILCORE_TEST_SPONSOR=https://veilcore-sponsor-production.up.railway.app npm run deploy:test
```

It refuses, and says why, if the registry or sponsor isn't ready.

## 2. The run

Write down anything that looks wrong or reads badly, with a screenshot. Each side's license page shows its steps with the current one marked, and once it is live, a **Your turn** or **Their turn** line says what happens next: if that line is ever wrong, note it.

| # | Who | Do | You should see |
|---|---|---|---|
| 1 | Mac | test.veilcore.org: date a plant, save and check the backup, set up proof you hold it on its page | Its date, then "proof set up" |
| 2 | Mac | On the plant's page: License → **Clone license**. Type who it's for and 2.50 a cutting. Check the territory and the governing law (filled in from the browser). **Edit details** → Royalty on offspring (%) 2, Yearly minimum 1000. Read "The deal in one paragraph", **Save as draft**. Open it, **Make a link for them**, send it to the phone | Every value in the paragraph (quarterly, due 30 days, payment 14 days after, own bank fees, records 3 years); a link |
| 3 | Phone | Open the link, **Accept**, then **Save backup** (save and check it; it comes back to the license) | Step 3 of 4: "Making your code, this takes a few seconds.", then a 6-digit code |
| 4 | Both | Read the codes to each other | The same 6 digits on both screens |
| 5 | Mac | Tick "They read me this same code", **Issue it** | "Issued on Midnight" in a few minutes. "Post the issue notice again" only re-posts the notice; if it fails, a red message says why |
| 6 | Phone | Read the paragraph and the terms, tick "I agree", **Agree and activate** | "Your license is live", the terms, Royalties |
| 7 | Mac | Refresh the license | Live, "They signed their agreement…". No practice Royalties box on the page |
| 8 | Mac | Royalties: **Add how you get paid**: account holder and bank details, **Send**. Then **Add invoice details** (legal name, address, tax number), **Send** | "Where payment goes" on both; the phone says "… sets where you pay. VeilCore never touches the money." |
| 9 | Phone | The Royalties card shows the next due date in big type and "Accepted, not paid yet $0.00". **Write the royalty report**: 40 cuttings, 0 offspring sales; attach any small CSV as the sales report; **Send the report** | The total ($100.00) shows as you type; "Report 1 · Waiting for an answer" on both |
| 10 | Phone | On report 1: **Send a reminder** | "Reminder sent today" on the phone; on the Mac report 1 shows "You sent a reminder…" from the phone, worded only from the dates |
| 11 | Mac | Report 1: **Check the file they sent** with the same CSV (AirDrop or email it), then with another file; then **Ask to fix**, reason "We counted 44", **Send: ask to fix** | "It's the exact file…", then "That's not the file…"; "Asked to fix" on both; no Accept button any more |
| 12 | Phone | **Send a corrected report**: the reason shows at the top; 44 cuttings, **Send the corrected report** | "Report 2 (corrects report 1)"; report 1 shows "Replaced by report 2" |
| 13 | Mac | Report 2: **Accept** | "Accepted, to pay" on both; nothing offers to change the answer |
| 14 | Phone | **Pay report 2**: $110.00 in big type, the bank details and the payment reference (your initials, a dash, 4 characters) each with a copy button, who pays bank fees. **I paid** (today's date filled in) | "Paid, waiting for confirmation"; the pay screen and its button are gone |
| 15 | Mac | Report 2: **Confirm I received $110.00**, then **Download the invoice** and open it | "Receipt confirmed" on both; the invoice shows the lines, the reference, the bank details and "Issued by … VeilCore doesn't check tax content." |
| 16 | Mac | **Change how you get paid** to a second account, **Send** | The phone shows the new details under "Where payment goes" |
| 17 | Phone | **Write the royalty report** for the next period (or the same period again for the test): 4 cuttings, **More** → tax withheld 1.00, **Send the report**. Mac: **Accept** | Report 3; "Tax withheld: $1.00. To pay: $9.00." |
| 18 | Phone | **Pay report 3** | "… changed how they get paid on …", Before and Now side by side, **I paid** greyed out until you tick "I confirmed these details with … by phone or another way" |
| 19 | Phone | Tick it, **I paid**. Mac: **Confirm I received $9.00** | "Receipt confirmed" on both |
| 20 | Either | **Timeline**, then **Records and credentials** → **Download all reports and payments (CSV)**, **Add the due dates to your calendar** | Every step with its date; a CSV with three rows; a calendar file that opens on the phone |
| 21 | Mac | **Records and credentials**: **Send them a license credential** and **Send a payment credential** | On the phone, **Records and credentials** lists both to download |
| 22 | Phone | Date the phone's own plant of these genetics and set up proof you hold it, then on the license: name it | "Their record: …" on the Mac |
| 23 | Mac | **Put it on their record** | "proposed" |
| 24 | Phone | **Accept it, as agreed** | "in force on Midnight" on both |
| 25 | Mac (new private window) | Open the plant's check link, **Make a link for them** under "Check someone holds a license", send it to the phone | A link |
| 26 | Phone | Open it, **Prove it** | "Done" |
| 27 | Mac (private window) | Wait | "Checked on Midnight: a live license from this record" |
| 28 | Mac | Plant page → Family on Midnight: put a second plant of yours on chain as its parent | The parent listed |
| 29 | Phone (private tab) | Open the license link from step 2 again | "This phone or browser doesn't have the copy that accepted this link…" and a **Restore a backup** button (not the red warning) |
| 30 | Mac | License: **Revoke on chain**, give a reason, **Yes, revoke it** | "No longer on Midnight" on both within a minute or two |
| 31 | Both | Repeat 25 and 26 | The phone says its license is no longer live, and nothing is sent |
| 32 | Phone | Backup page: **Make a passkey copy** (Face ID) | "Passkey copy up to date" |
| 33 | Phone | Private tab on the same phone: Restore → **Use my passkey** | Everything back, "From your passkey copy saved …" |

**Optional: paying on Midnight (needs a computer with Lace or 1AM on preprod, with some
test NIGHT from the faucet, as the licensee).** Make a second license as in steps 2 to 7, with
the computer as the licensee: **Clone license**, then **Edit details** → Currency **NIGHT** (only
on the test network), 2 per cutting.

| # | Who | Do | You should see |
|---|---|---|---|
| 34 | Mac (licensor) | Royalties: **Add how you get paid** → **On Midnight (NIGHT)** → **Use my Lace address** (or paste yours) → **Send** | "Where payment goes: on Midnight, in NIGHT · mn_addr_preprod1…" on both |
| 35 | Computer (licensee) | **Write the royalty report**: 3 cuttings | Total 6.00 NIGHT |
| 36 | Mac | **Accept** | "Pay report 1" on the computer |
| 37 | Computer | **Pay 6 NIGHT with Lace**, approve in the wallet | "Paid, waiting for confirmation" |
| 38 | Mac | Wait a minute | "Checked on Midnight: 6 NIGHT reached your address in transaction …" Then **Confirm I received …** |

The report's currency is the terms' currency: NIGHT payment works only when the terms say NIGHT
(the page says so when they don't). If step 38 says the transaction paid no NIGHT to your address when Lace shows it did, screenshot
it: that's the token-format check to adjust (docs/agreements-live.md, item 11).

Optional, on a computer: paste a downloaded credential into a W3C verifier that supports
`eddsa-jcs-2022` (for example the Digital Bazaar or Spruce playgrounds) to see it check out
without VeilCore.

**Handing a license on (needs a third browser for the new holder: a private window on the
Mac works, a second phone is better).** Do this before step 30, or on a fresh license made as
in steps 2 to 7, because a revoked license can't be handed on.

| # | Who | Do | You should see |
|---|---|---|---|
| 39 | Phone (holder) | On the live license: **Hand this license on to someone else**, name "Second Grower", a note, **Ask the licensor** | "You asked the licensor…" |
| 40 | Mac | Refresh the license | "They ask to hand this license on to Second Grower" with the note |
| 41 | Mac | **Hand this license on to someone new** → **Make a link**, send it to the new holder | A link |
| 42 | New holder | Open it, **Accept**, **Save backup** | A 6-digit code |
| 43 | Mac + new holder | Read the codes to each other; Mac ticks "They read me this same code", **Send them the terms, and ask … to hand it on** | The terms on the new holder's screen |
| 44 | Phone | **Hand it on to Second Grower**, **Yes, hand it on** | "You handed this license on… still yours until the licensor approves" |
| 45 | Mac | Wait a minute | Still "Waiting for … to agree to the terms". **There must be no Approve button yet.** If there is, stop and screenshot it |
| 46 | New holder | Read the terms, tick "I agree", **Agree** | "Waiting for the current holder to hand it on and the licensor to approve" |
| 47 | Mac | Wait, then **Approve the hand-on** | "Handed on. The license is now Second Grower's." |
| 48 | All three | Refresh | Phone: "You handed this license on"; new holder: "Your license is live" with the terms and Royalties; Mac: the license with Second Grower |
| 49 | Mac | **Download a pack for a lender or buyer**, open `summary.txt` in the zip | Second Grower's deal only, every signature checked |

**Other languages (any device).** Language menu → 日本語, then Español, Deutsch, Français. Open a
license page, the terms form and the Royalties box in each.

| # | Who | Do | You should see |
|---|---|---|---|
| 50 | Any | Each language: the terms form with its presets, a license page, Royalties (a report, the pay screen), a hand-on screen | No English left over, no `app.lic…` text, nothing cut off on the phone |

## 3. After

Send Claude the notes and screenshots. When the run is clean, the
mainnet switch is two reviewed lines (`AGREEMENTS_LIVE` in `bboard-ui/src/config/copy.ts`,
`MAINNET_AGREEMENTS` in `sponsor/src/policy.ts`) and merging `license-invites` into the
registry's main.
