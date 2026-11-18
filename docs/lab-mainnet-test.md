# Lab signing on veilcore.org: the first run on mainnet

Lab signing is switched on for veilcore.org but the site does not call it live. The home page
says "Built, not yet tried on the main network." This run is what changes that. Only the
maintainer does it.

Do it after the site deploy that carries the switch. Use a computer and Chrome. Everything here
is real on mainnet, so put "TEST" in every name.

You need three windows:

- your normal window, where you play the lab, and the breeder for steps 1 to 13;
- a private (incognito) window, which is a stranger with no keys;
- a Guest window, which is a second breeder for steps 14 to 17. Click your profile picture at
  the top right of Chrome and choose **Guest** (or **Open Guest profile**). A lab can't receive
  a sample it sent to itself from the same window, so this breeder needs its own. Keep the Guest
  window open until the run is over: closing it throws its records away.

Stop at the first step that fails (see "If a step fails" at the end).

## Steps

1. **Make a test record.** Open https://veilcore.org/new. Under "What do you want to prove?"
   pick **Plants**. Name it `TEST lab signing 1`, use made-up details, and finish.
   **Pass if:** the record is listed under **Your records** at https://veilcore.org/records.

2. **Copy its proof code.** Open the record and copy its **Proof code** (64 letters and
   numbers). Keep it in a note.
   **Pass if:** the note holds 64 characters.

3. **Make the lab's key.** On https://veilcore.org/records press **Set up your lab's
   signature**. (If you don't see that button, press **Breeder or lab? Choose your view**, then
   **I run a lab or receive material** first.)
   Name: `TEST Lab (Hunter)`. Role: **Laboratory**. The form fills **Scheme** with
   "ISO/IEC 17025": clear it, and leave the other accreditation fields empty. Press **Create my
   key**. It then asks you to save your backup: press **Save backup file** in the panel that
   opens.
   **Pass if:** the box shows your key and closes with **Continue** or **Done**, with no error.

4. **Open the lab's tools.** Open https://veilcore.org/lab/results (or press **Sign lab
   results** on the records page).
   **Pass if:** the page is titled **Sign lab results** and shows the tabs **One result** and a
   spreadsheet tab. It must not say "Lab results are on the test network only."

5. **Check what is not offered.** Open the list **What kind of result**.
   **Pass if:** "Viability test before or after a kill step" is NOT in the list. (That kind
   stays on the test network.)

6. **Sign one result.** Tab **One result**. What kind of result: **Pathogen or viroid test**.
   **Proof code the sender gave for this sample**: paste the code from step 2. Sample ID
   `TEST-1`. Your accession number `TEST-1`. Method or SOP `TEST`. Method version `1`. Tested
   for `HLVd`. Sample type `TEST` (the form won't sign without one). Result **Not detected**.
   Date tested: today. Press **Sign this result**.
   **Pass if:** it says **Signed and kept** and **Your lab's name is on it.**

7. **Keep the file.** Press **Download the result file**.
   **Pass if:** a file is saved to your computer.

8. **Check the file as a stranger.** In the private window open
   https://veilcore.org/check-lab-result, press **Choose the result file** and pick the file.
   **Pass if:** the result is shown with "Not detected" and HLVd, and there is no "This result
   can't be used".

9. **Look up the lab's name.** Still in the private window, press **Find the lab's name**.
   **Pass if:** it shows `TEST Lab (Hunter)`, marked "name not checked".

10. **Confirm it is private.** In your normal window open the test record, press **Show
    someone**, then **Get the link**. Open that link in the private window.
    **Pass if:** the page shows no lab name, no result and no "HLVd". If it has a lab line at
    all, it is only "The holder hasn't shown any lab signatures here."

11. **Open the result's record.** In your normal window open
    https://veilcore.org/check-lab-result and choose the same file. You signed it in this
    window, so the page doesn't offer **Add it as a record you hold**: it says "You signed this
    result: it is in your records." Press **Open the record**.
    **Pass if:** the page says "You signed this result: it is in your records.", and the record
    opens and shows the lab's signature.

12. **Publish the signature.** On that record press **Publish it on Midnight**. This is a real
    mainnet transaction; VeilCore's fee service pays. It can take a few minutes.
    **Pass if:** it says "Published on Midnight in block …". Write the block number down.

13. **Show the result to a stranger on purpose.** On the same record, under **Prove one
    number**, pick **Detected (1 yes, 0 no)**, **It is at most…** and the limit `0`. Before you
    press the button, the screen says "This proves: Not detected." Prove it, press **Copy the
    link that proves this**, and open the link in the private window.
    A result signed minutes ago shows "waiting for a batch" and "Don't rely on it" until its
    batch is dated on Midnight (minutes, up to about an hour). Wait until the page shows the
    batch's date before you judge this step; reload the link to look again.
    **Pass if:** the page's claim reads "Not detected" (with "As proved on Midnight: Detected
    (1 yes, 0 no) is at most 0" under it), it says "Proved on Midnight", and it names
    `TEST Lab (Hunter)`. Keep this link in your note: step 18 uses it again.

14. **Send a test sample to the lab.** In the Guest window open https://veilcore.org/new, pick
    **Plants**, name it `TEST lab signing 2`, use made-up details, and finish. Save the backup
    when it asks. Open the record and press **Send it to a lab or breeder**. Under "Who are you
    sending it to" type `TEST Lab`. Leave the sample's label and seal out. Press **Make a code
    for the lab**, copy the code (it starts with `TR-`) into your note, then press **Done**.
    **Pass if:** the note holds a code that starts with `TR-`.

15. **Sign the lab's receipt.** In your normal window open https://veilcore.org/records. In the
    box "Someone sent you a code or link?" paste the code, press **Go**, then **Receive it**.
    (If it says "Save a backup and check it first, then use the code. Nothing was received
    yet.", save and check a backup as it asks, then enter the code again.) Tick **I physically
    received this material.** The page then asks **Seal intact?**: choose **No seal** (this test
    sample has none). Press **Sign with my key**.
    **Pass if:** a record for the received sample opens, with no "Nothing was signed" and no
    "was not recorded".

16. **Confirm the receipt's signature is hidden.** In the Guest window open
    `TEST lab signing 2` and press **Show someone**. Turn on **Whether a DNA report is saved**.
    Under **Lab signatures** there is a line "Receipt for a sample, signed …" with the switch
    "Show that a key named “TEST Lab (Hunter)” (name not checked) signed this on your check
    link". Leave that switch OFF. Press **Get the link** and open the link in the private window.
    Even with the switch off, the page says that a lab received a sample from this record and
    whether what arrived matches what was sent ("A lab's receipt for a sample from this record,
    as the registry reports it. The holder hasn't shown which lab signed it."). That is expected:
    it doesn't name the lab.
    **Pass if:** the page says "The holder hasn't shown any lab signatures here. A lab's
    receipts and reports are private unless the holder chooses to show them." and
    `TEST Lab (Hunter)` is nowhere on the page.

17. **Share it, and confirm it shows.** In the Guest window, on the same **Show someone**
    screen, turn that switch ON and press **Get the link** again. Open the new link in the
    private window.
    **Pass if:** the page now says "Lab's receipt for a sample, signature verified in this
    browser" and names `TEST Lab (Hunter)` (name not checked). The sentence "The holder hasn't
    shown any lab signatures here" is gone.

18. **Last: withdraw the TEST result.** The result from step 6 is permanent, so mark it. In your
    normal window open https://veilcore.org/lab/results, tab **One result**. What kind of
    result: **Withdrawal of an earlier result**. Under **The result to withdraw** pick the line
    that starts `TEST-1 · TEST-1`. Fill the rest as in step 6: the proof code from step 2,
    Sample ID `TEST-1`, accession number `TEST-1-W`, Method or SOP `TEST`, Method version `1`,
    date tested today. Press **Sign this result**. Then check as a stranger, in the private
    window, both ways: (a) open https://veilcore.org/check-lab-result, choose the file from
    step 7 and press **Find the lab's name**; (b) open the link from step 13 again.
    **Pass if:** signing says **Signed and kept** with no "withdrawing it failed", and both
    (a) and (b) say "This lab no longer stands behind this result." Neither shows
    `TEST Lab (Hunter)` as standing behind it any more.

What stays on mainnet after the run, all named TEST: the two test records, the result (now
shown as withdrawn), its withdrawal, the signature published in step 12, and the lab's receipt
from step 15. Nothing is deleted; the withdrawal is what tells a stranger not to rely on it.

## If a step fails

Stop. Take a screenshot of the page and note the step number. Do not retry more than once: each
try is real. Lab signing can be switched off again for mainnet by listing `'mainnet'` in
`LAB_SIGNING_OFF` (`bboard-ui/src/config/network.ts`) and deploying the site.

## After all 18 steps pass

One reviewed change, then a normal site deploy:

1. `bboard-ui/src/config/copy.ts`: set `LAB_SIGNING_RUN_ON_MAINNET = true`, with the date and
   the block from step 12 in its comment.
2. `bboard-ui/src/i18n/copy-truth.test.ts`: change `expect(signedRun).toBe('false')` to `'true'`.
3. `docs/lab-signing.md` and `README.md`: say it has worked on veilcore.org, with the date.
4. The SDK's `EVIDENCE.md` ("What is running, and where"): move lab-signed numbers to the live
   list there, then copy the file into this repo as usual.

After that deploy the home page's "What works, and where" row says "Yes" for veilcore.org, in
all five languages.
