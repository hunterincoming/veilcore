// End-to-end fixture, only in the e2e build (VITE_E2E_FIXTURES=1, package.json e2e:build; App.tsx
// adds the route only then, and every other build leaves this file out). The backup restore drill
// (e2e/backup-restore-drill.spec.ts, docs/runbooks/backup-restore-drill.md) makes most of its
// representative set here, with the app's own code, because a browser test can't put a lab's
// signature, a claim on Midnight or a live license on chain through the pages: those need a lab's
// key on another device and real transactions. The plant itself is logged through the real pages;
// the backup is saved, and restored, through the real pages too.
//
//   /e2e/restore-drill?step=make&plant=VEIL-…   the rest of the set, around a logged plant
//   /e2e/restore-drill?step=licensee            the licensee's side (another browser): the license
//                                                kept, a royalty report and "I paid"
//   /e2e/restore-drill?step=settle               the licensor says it received the money
//   /e2e/restore-drill?step=snapshot             what this browser holds, item by item
//   /e2e/restore-drill?step=deal                 read the whole deal with this browser's keys,
//                                                and send a message (side=licensee: as the licensee)
//
// The result is put in [data-drill-out] as JSON, or the error in [data-drill-error]. All names,
// keys and figures are practice data.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container } from '@mui/material';
import { generateKeypair } from 'veilcore-records';
import {
  addClaim,
  allRecords,
  createRecord,
  getRecord,
  hydrate,
  pairDna,
  setLabOnChain,
  setLabSignature,
} from '../veilcore/records';
import { allKeys, keysFor, setAnchor, setDnaOnChain } from '../veilcore/record-keys';
import { sealAnimalRecord, sealDocumentRecord, sealRecord } from '../veilcore/seal-record';
import {
  allLicenses,
  createLicense,
  getLicense,
  issuerDealsForBackup,
  sealAgreement,
  setOnChain,
  startLicenseSync,
  type LicenseTerms,
} from '../veilcore/licenses';
import { heldLicense, heldLicenses, keepHeldLicense } from '../veilcore/held-licenses';
import { dealParty, readAll, say, sayOnce, type DealParty } from '../veilcore/deal-client';
import { publicOf } from '../veilcore/deal';
import { holderKeyIfAny } from '../veilcore/holder';
import { vaultKeyIfAny } from '../veilcore/vault';
import { loadAttester } from '../veilcore/attester-keys';
import { deviceOnlyRecords } from '../veilcore/outbox';
import { revMarks } from '../veilcore/api-store';
import { identityFromSecret } from '../veilcore/key-binding';
import { makeFieldSet } from '../veilcore/field-set';
import { labRequestFor, readLabSignature, signLabRequest } from '../veilcore/lab-attest';
import { claimsKeyFor } from '../veilcore/claims-key';
import { snapshotOf } from './restore-drill-snapshot';

/** The license's practice keys, fixed so the two browsers open the same deal. */
const DEAL = {
  issuer: '1f'.repeat(32),
  licensee: '2f'.repeat(32),
  commitment: '3f'.repeat(32),
  issuerRecord: '4f'.repeat(32),
  identity: '5f'.repeat(32),
  inviteId: 'LI-DRILL-E2E-0001',
};
const SOY = 'veilcore/schema/variety-similarity/v1';
const STATEMENT = 'S-DRILL-2026-11';

const licenseeParty = (): DealParty => ({
  side: 'licensee',
  mySecret: DEAL.licensee,
  theirPublic: publicOf(DEAL.issuer),
  commitment: DEAL.commitment,
  issuerRecord: DEAL.issuerRecord,
});

const issuerPartyHere = (): DealParty => {
  const l = allLicenses().find((x) => x.onChain?.inviteId === DEAL.inviteId);
  const p = l?.onChain ? dealParty(l.onChain) : undefined;
  if (!p) throw new Error('no license with its deal keys in this browser');
  return p;
};

/** The rest of the set, around the plant logged through the pages. */
const make = async (plantId: string) => {
  await hydrate();
  const plant = getRecord(plantId);
  if (!plant) throw new Error(`no plant ${plantId} here`);
  const child = createRecord(
    await sealRecord({
      strainName: 'Drill Pippin F1 (test data)',
      bredBy: 'Practice Breeder',
      dateCreated: '2026-10-01',
      notes: 'a child plant naming its parent',
      parents: [{ recordId: plant.id, name: plant.strainName }],
      breedingMethod: 'open pollination',
      photoFingerprints: [],
      refId: 'DR-002',
      taxon: '',
    }),
  );
  const animal = createRecord(
    await sealAnimalRecord({
      name: 'Drill Ewe (test data)',
      species: 'Ovis aries',
      breed: 'Practice breed',
      individualId: 'UK-0000-DRILL',
      idScheme: 'practice',
      sex: 'female',
      dateOfBirth: '2025-04-02',
      parents: [],
      breeder: 'Practice Breeder',
      herd: 'Practice flock',
      notes: 'an animal record for the restore drill',
      photoFingerprints: [],
    }),
  );
  const fieldSet = await makeFieldSet(SOY, [9437n, 5103n, 287n, 12n, 201900123n, 1n]);
  const doc = createRecord(
    await sealDocumentRecord({
      title: 'Drill similarity certificate (test data)',
      type: 'certificate-of-analysis',
      issuer: 'Practice Lab',
      reference: 'SB-DRILL-1',
      issued: '2026-11-01',
      files: [{ name: 'certificate.pdf', sha256: 'cd'.repeat(32), size: 2048 }],
      about: [{ name: plant.strainName, recordId: plant.id }],
      holder: 'Practice Breeder',
      notes: 'a document with numbers, signed by a lab',
      fieldSet,
    }),
  );
  const local = createRecord({
    ...(await sealDocumentRecord({
      deviceOnly: true,
      title: 'Drill permit kept on this device (test data)',
      type: 'permit',
      issuer: 'Practice Authority',
      reference: 'P-DRILL-1',
      issued: '2026-11-02',
      files: [{ name: 'permit.pdf', sha256: 'ce'.repeat(32), size: 1024 }],
      about: [],
      holder: 'Practice Breeder',
      notes: 'kept on this device only',
    })),
    deviceOnly: true,
  });
  // A lab's signature on the document's numbers, checked as the page checks one, and a claim.
  const lab = await generateKeypair();
  const req = await labRequestFor(doc as never);
  const sig = readLabSignature(
    JSON.stringify(signLabRequest({ secretN: claimsKeyFor(lab.privateKey).secret, name: 'Practice Lab' }, req)),
    req.commitment,
  );
  setLabSignature(doc.id, { ...sig, about: plant.recordFingerprint });
  setLabOnChain(doc.id, { contract: 'c1'.repeat(32), txId: 'e1'.repeat(32), blockHeight: 101 });
  addClaim(doc.id, {
    kind: 'range',
    contract: 'c1'.repeat(32),
    txId: 'e2'.repeat(32),
    blockHeight: 102,
    record: req.commitment,
    keyBinding: doc.keyBinding,
    schema: SOY,
    slot: 0,
    op: 'at-least',
    bound: '9000',
  });
  // The plant's DNA report pairing, its date stamp (the key on chain) and the pairing on chain.
  pairDna(plant.id, 'f0'.repeat(32), 'drill-report.vcf', { fileSha256: 'f1'.repeat(32) });
  const identity = identityFromSecret(keysFor(plant.id)!.recordSecret);
  setAnchor(plant.id, {
    identity,
    network: 'preview',
    contractAddress: '7b'.repeat(32),
    txId: '7c'.repeat(32),
    txHash: '7d'.repeat(32),
    blockHeight: 4242,
    anchoredAt: Date.UTC(2026, 10, 2),
  });
  setDnaOnChain(plant.id, {
    fingerprint: 'f0'.repeat(32),
    salt: '8a'.repeat(32),
    binding: '8b'.repeat(32),
    identity,
    status: 'paired',
    txId: '8c'.repeat(32),
    blockHeight: 4300,
    at: Date.UTC(2026, 10, 3),
  });
  // A license on the plant, live on chain, and its terms sent over the deal's channel.
  const terms = {
    licensee: 'Practice Grower',
    startDate: '2026-11-01',
    endDate: '2027-10-31',
    extraTerms: '',
    rights: 'propagate',
    territory: 'Practice County',
    royaltyType: 'percent',
    royaltyAmount: '5',
    unitBasis: 'per-unit-sold',
    sublicensable: false,
    exclusive: false,
  } as unknown as LicenseTerms;
  const sealed = await sealAgreement('license', terms, plant.recordFingerprint);
  const lic = createLicense({
    type: 'license',
    recordId: plant.id,
    recordFingerprint: plant.recordFingerprint,
    terms,
    ...sealed,
  });
  setOnChain(lic.id, () => ({
    inviteId: DEAL.inviteId,
    acceptToken: 'a1'.repeat(16),
    issuerToken: 'a2'.repeat(16),
    identity: DEAL.identity,
    label: 'Practice Grower',
    invitedAt: Date.UTC(2026, 10, 1),
    issuerNonce: publicOf(DEAL.issuer),
    partySecret: DEAL.issuer,
    commitment: DEAL.commitment,
    issuerRecord: DEAL.issuerRecord,
    licenseeNonce: publicOf(DEAL.licensee),
    termsSentAt: Date.UTC(2026, 10, 1),
    issueTx: 'a3'.repeat(32),
    issuedAt: Date.UTC(2026, 10, 1),
    activateTx: 'a4'.repeat(32),
    activatedAt: Date.UTC(2026, 10, 2),
  }));
  const l = getLicense(lic.id)!;
  await say(issuerPartyHere(), {
    type: 'terms',
    agreementType: l.type,
    terms: l.terms as unknown as Record<string, unknown>,
    recordFingerprint: l.recordFingerprint,
    agreementSalt: l.agreementSalt!,
    agreementFingerprint: l.agreementFingerprint,
  });
  return { child: child.id, animal: animal.id, doc: doc.id, local: local.id, licenseId: lic.id, identity };
};

const licensee = async () => {
  keepHeldLicense({
    inviteId: DEAL.inviteId,
    secret: '9f'.repeat(32),
    commitment: DEAL.commitment,
    identity: DEAL.identity,
    issuerRecord: DEAL.issuerRecord,
    licenseeNonce: publicOf(DEAL.licensee),
    partySecret: DEAL.licensee,
    issuerNonce: publicOf(DEAL.issuer),
    label: 'Practice Breeder',
    acceptedAt: Date.UTC(2026, 10, 1),
    activateTx: 'a4'.repeat(32),
    activatedAt: Date.UTC(2026, 10, 2),
  });
  const p = licenseeParty();
  await sayOnce(p, {
    type: 'statement',
    statementId: STATEMENT,
    periodFrom: '2026-11-01',
    periodTo: '2026-11-30',
    basis: 'sales',
    quantity: '1000.00',
    currency: 'USD',
    amountOwed: '50.00',
  });
  const statement = (await readAll(p)).find((e) => e.type === 'statement')!;
  await sayOnce(p, {
    type: 'paid',
    statementId: STATEMENT,
    statementSig: statement.signature,
    amount: '50.00',
    currency: 'USD',
    method: 'bank transfer',
    payTo: 'Practice Bank 0001',
    reference: 'DRILL-E2E',
    paidOn: '2026-12-05',
  });
  return { held: heldLicenses().length };
};

const settle = async () => {
  await hydrate();
  startLicenseSync();
  const p = await until(() => issuerPartyHere());
  const statement = (await readAll(p)).find((e) => e.type === 'statement');
  if (!statement) throw new Error('no royalty report in the deal yet');
  await sayOnce(p, {
    type: 'received',
    statementId: STATEMENT,
    statementSig: statement.signature,
    amount: '50.00',
    currency: 'USD',
  });
  return { types: (await readAll(p)).map((e) => e.type) };
};

/** Try `f` until it returns, for a few seconds: the license sync is under way. */
const until = async <T,>(f: () => T, ms = 8000): Promise<T> => {
  const end = Date.now() + ms;
  for (;;) {
    try {
      return f();
    } catch (e) {
      if (Date.now() > end) throw e;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
};

const snapshot = async () => {
  await hydrate();
  startLicenseSync();
  // The license sync is started, not awaited: give it the time a page gives it.
  await new Promise((r) => setTimeout(r, 1500));
  return {
    records: allRecords().length,
    keys: allKeys().length,
    snapshot: snapshotOf({
      holderKey: holderKeyIfAny(),
      vaultKey: vaultKeyIfAny(),
      keys: allKeys(),
      records: allRecords(),
      licenses: allLicenses(),
      issuerDeals: issuerDealsForBackup(),
      held: heldLicenses(),
      lab: loadAttester(),
      deviceOnly: Object.keys(deviceOnlyRecords()),
      revs: revMarks(),
    }),
  };
};

/** With this browser's own keys (restored from the file): read the deal, and still write to it. */
const dealStep = async (side: string | null) => {
  if (side === 'licensee') {
    const h = heldLicense(DEAL.inviteId);
    if (!h?.partySecret || !h.issuerNonce) throw new Error('no held license with its secret here');
    const p: DealParty = { ...licenseeParty(), mySecret: h.partySecret, theirPublic: h.issuerNonce };
    const before = (await readAll(p)).map((e) => e.type);
    await sayOnce(p, {
      type: 'statement',
      statementId: 'S-DRILL-2026-12',
      periodFrom: '2026-12-01',
      periodTo: '2026-12-31',
      basis: 'sales',
      quantity: '400.00',
      currency: 'USD',
      amountOwed: '20.00',
    });
    return { before, after: (await readAll(p)).map((e) => e.type) };
  }
  await hydrate();
  startLicenseSync();
  const p = await until(() => issuerPartyHere());
  const before = (await readAll(p)).map((e) => e.type);
  await sayOnce(p, { type: 'payout', method: 'bank transfer', account: 'Practice Bank 0002', currency: 'USD' });
  return { before, after: (await readAll(p)).map((e) => e.type) };
};

export const RestoreDrillFixture: React.FC = () => {
  const [params] = useSearchParams();
  const [out, setOut] = useState<unknown>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const step = params.get('step');
    const run =
      step === 'make'
        ? () => make(params.get('plant') ?? '')
        : step === 'licensee'
          ? licensee
          : step === 'settle'
            ? settle
            : step === 'snapshot'
              ? snapshot
              : step === 'deal'
                ? () => dealStep(params.get('side'))
                : () => Promise.reject(new Error(`no step ${String(step)}`));
    run().then(setOut, (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [params]);
  return (
    <Container sx={{ py: 2 }}>
      {out !== undefined && <pre data-drill-out="">{JSON.stringify(out)}</pre>}
      {error !== undefined && <pre data-drill-error="">{error}</pre>}
    </Container>
  );
};
