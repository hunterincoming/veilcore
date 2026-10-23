# A home for the spec that isn't VeilCore (23 Oct 2026)

Today the record format (SPEC.md in veilcore-sdk) is published by VeilCore, Apache-2.0, open
for comment. That is enough to implement it. It is not enough for a seed agency, a herd book or
a culture collection to rely on it for twenty years: they need to know the format can't be
changed or withdrawn by one company. This is the plan for moving it, and why each piece goes
where it does.

## Three layers, three homes

The format already has three layers (SPEC section 3 and 11.6): the domain-blind envelope and
commitment rules, the domain profiles, and the code. They don't need the same kind of home.

### 1. The format itself: a W3C Community Group

The envelope, the canonical serialisation, the commitment, batching and the verifier rules.

Why W3C: our credentials already use W3C's Verifiable Credentials and Data Integrity
(eddsa-jcs-2022), so the people who review this kind of work are there. A Community Group is
the low-cost way in:

- anyone with a W3C account proposes one; it launches once **five people** support it;
- it is **free**, and W3C membership isn't needed;
- participants sign a Contributor License Agreement for their own contributions; a Final
  Specification Agreement (the stronger patent commitment) is voluntary;
- a Community Group report is **not a W3C standard**, but W3C moves CG work to a Working Group
  when there's demand, and the patent commitments carry over.

Source: [W3C Community and Business Groups FAQ](https://w3.org/community/about/faq/).

What we'd move: SPEC sections 1 to 10 and the record-format vectors. VeilCore stays an editor,
one of several. The repository moves to the group's GitHub organisation.

### 2. The profiles: the bodies that already run each domain

A profile says what a plant, an animal or a strain record holds. The people who should own a
profile are the ones who already keep those records:

| Profile | Natural home | Why |
|---|---|---|
| Animal individual (SPEC 11.8) | ICAR, the International Committee for Animal Recording | Sets the guidelines herd books and ID schemes already follow |
| Strain and line (SPEC 11.9, draft) | Biodiversity Information Standards (TDWG), with culture collections | TDWG runs Darwin Core; its process is open: any member can charter an interest group, task groups draft, every standard gets independent review and at least 30 days of public comment ([TDWG process](https://tdwg.org/about/process)) |
| Plant variety, seed lot | Seed certification and plant variety bodies | They decide what a variety record has to say; we'd offer the profile, not ask them to adopt our company |

A profile is published by whoever controls its name (SPEC 11.6): `org.example/profile/...`.
Moving one is renaming it under the new owner. Records already sealed under VeilCore's name
keep checking, because a commitment never depends on fetching a profile.

### 3. The code: LF Decentralized Trust Labs

veilcore-records (TypeScript), the Python and Rust implementations, and the conformance runner.
Anyone can propose a Lab; the Labs stewards review it, and LFDT staff help set it up; it's the
lighter path before a full project
([LF Decentralized Trust Labs](https://www.lfdecentralizedtrust.org/projects/labs)). It gives
the code a neutral owner and a legal home that outlives a company.

## Order, and what each step needs

1. **Now:** publish the registry's code (see [without-veilcore.md](without-veilcore.md)), and
   get one implementation written by someone outside VeilCore. A format moved before anyone
   else has implemented it is still effectively ours.
2. **Five genuine supporters** for the Community Group: people who'd actually review the text,
   not friends clicking a button. Then propose it, with SPEC sections 1 to 10 as the first
   draft.
3. **Profiles**, one conversation at a time, starting with whichever domain has a first user.
4. **The code** to a Lab once the Community Group exists, so spec and code move together.

## What doesn't change

- Records already sealed keep checking: a commitment is SHA-256 over the record's own fields,
  never over a document someone can edit.
- VeilCore keeps building the product on the format, like anyone else can.
- The contracts on Midnight stay where they are; the format doesn't depend on them.
