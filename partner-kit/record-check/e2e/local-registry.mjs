// A local VeilCore registry for the record-check browser and CLI tests, seeded with test
// records: started from a veilcore-api checkout (REGISTRY_DIR) on its own port with a fresh
// database and lab-results folder, stopped by PID. Nothing here reaches a network.
//
// Seeded (all test data):
//   bound    names its key, a lab report saved; from a key whose name VeilCore's operator
//            checked: a lab report, a custody statement tied to no delivery, and two lab
//            receipts tied to deliveries of the record (one whose sample details match what
//            was sent, one whose seal number doesn't); in a batch dated on preprod
//   older    an older record (no key); a receipt from a key nobody checked, then withdrawn
//            by that key; same batch
//   undated  sealed after the batch: in no batch
// SPDX-License-Identifier: Apache-2.0
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { canonicalise, generateKeypair, signAttestation, signRetraction } from 'veilcore-records';

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const H = (tag, ...hex) => {
  const t = Buffer.alloc(32);
  t.write(tag, 'utf8');
  return createHash('sha256')
    .update(Buffer.concat([t, ...hex.map((h) => Buffer.from(h, 'hex'))]))
    .digest('hex');
};
const committed = (r) => ({
  breedingMethod: r.breedingMethod ?? '',
  bredBy: r.bredBy,
  dateCreated: r.dateCreated,
  loggedAt: r.loggedAt,
  nonce: r.nonce,
  notes: r.notes,
  parents: r.parents ?? [],
  photoFingerprints: r.photoFingerprints ?? [],
  refId: r.refId ?? '',
  strainName: r.strainName,
  ...(r.keyBinding !== undefined ? { keyBinding: r.keyBinding } : {}),
});
const seal = (r) => {
  const content = sha256(canonicalise(committed(r)));
  return {
    ...r,
    recordFingerprint: typeof r.keyBinding === 'string' ? H('veilcore:v1:keyrecord', r.keyBinding, content) : content,
  };
};
const recordId = () => `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`;

const today = () => new Date().toISOString().slice(0, 10);
const inMonths = (n) => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Start the registry and seed it. `dir` is a scratch folder (removed by stop()). Returns
 * the address, the seeded records and links, and stop().
 */
export const startRegistry = async ({ registryDir, port = 8920, dir }) => {
  const work = mkdtempSync(path.join(dir, 'reg-'));
  const lab = path.join(work, 'lab-results');
  mkdirSync(lab);
  const OPERATOR = randomBytes(24).toString('hex');
  const CONTRACT = '7a'.repeat(32);
  const child = spawn(process.execPath, ['server.js'], {
    cwd: registryDir,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      PORT: String(port),
      DB_PATH: path.join(work, 'registry.db'),
      LAB_RESULTS_DIR: lab,
      VEILCORE_OTS: 'off',
      VEILCORE_OPERATOR_TOKEN: OPERATOR,
      VEILCORE_ANCHOR_NETWORK: 'preprod',
      VEILCORE_ANCHOR_CONTRACT: CONTRACT,
      PUBLIC_BASE: `http://127.0.0.1:${port}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  const stop = () => {
    // By PID: the registry this started, nothing else.
    if (child.exitCode === null && child.pid !== undefined) process.kill(child.pid, 'SIGTERM');
    rmSync(work, { recursive: true, force: true });
  };
  try {
    for (let i = 0; ; i++) {
      if (child.exitCode !== null) throw new Error(`the registry exited: ${log}`);
      try {
        const h = await fetch(`${base}/health`);
        if (h.ok) break;
      } catch {
        /* not up yet */
      }
      if (i > 150) throw new Error(`the registry did not start: ${log}`);
      await new Promise((r) => setTimeout(r, 200));
    }

    const call = async (method, p, body, headers = {}) => {
      const res = await fetch(`${base}${p}`, {
        method,
        // A client address of its own per call: seeding makes more writes than one address may in a minute.
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': `10.${[...randomBytes(3)].join('.')}`,
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`${method} ${p}: ${res.status} ${text}`);
      return JSON.parse(text);
    };
    const op = { 'x-operator-token': OPERATOR };
    const HOLDER = randomBytes(32).toString('hex');
    const holder = { 'x-holder-key': HOLDER };

    const SECRET = randomBytes(32).toString('hex');
    const KEY = H('veilcore:v1:commit', SECRET);
    const KEY_SALT = H('veilcore:v1:keysalt', SECRET);
    const LAB_SHA = sha256(`Test lab report ${Date.now()}`);
    const bound = seal({
      id: recordId(),
      nonce: randomBytes(32).toString('hex'),
      strainName: 'Partner check test record',
      bredBy: 'E2E',
      dateCreated: '2026-10-01',
      notes: 'Test data.',
      loggedAt: Date.now() - 60_000,
      keyBinding: H('veilcore:v1:keybind', KEY, KEY_SALT),
      licenseIds: [],
      dnaFingerprint: H('veilcore:v1:commit', LAB_SHA),
      dnaFileSha256: LAB_SHA,
    });
    const older = seal({
      id: recordId(),
      nonce: randomBytes(32).toString('hex'),
      strainName: 'Older partner check test record',
      bredBy: 'E2E',
      dateCreated: '2026-09-01',
      notes: '',
      loggedAt: Date.now() - 120_000,
      licenseIds: [],
    });
    await call('PUT', '/api/records', [bound, older], holder);
    await call('PUT', `/api/records/${bound.id}/disclosure`, { show: ['existence', 'attestation-status'] }, holder);

    // A lab whose name VeilCore's operator checked, and one nobody checked.
    const register = async (kp, displayName) => {
      const issuedAt = Date.now();
      const payload = canonicalise({
        type: 'veilcore/attester-registration/v1',
        publicKey: kp.publicKey,
        displayName,
        role: 'laboratory',
        issuedAt,
      });
      const key = await crypto.subtle.importKey(
        'pkcs8',
        Buffer.from(kp.privateKey, 'hex'),
        { name: 'Ed25519' },
        false,
        ['sign'],
      );
      const signature = Buffer.from(
        await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(payload)),
      ).toString('hex');
      await call('POST', '/attesters', {
        publicKey: kp.publicKey,
        displayName,
        role: 'laboratory',
        issuedAt,
        signature,
      });
    };
    const checkedLab = await generateKeypair();
    const otherLab = await generateKeypair();
    await register(checkedLab, 'Test Lab (checked)');
    await register(otherLab, 'Test Lab (unchecked)');
    await call(
      'POST',
      `/attesters/${checkedLab.publicKey}/vetting`,
      {
        vetted: true,
        check: {
          source: 'licence-listing',
          sourceUrl: 'https://cannabis.example.gov/licensees',
          licenceNo: 'TL-1',
          emailDomain: 'testlab.example',
          checkedAt: today(),
          checkedBy: 'HR',
          expiresAt: inMonths(11),
        },
      },
      op,
    );
    const sign = (kp, a) =>
      signAttestation(
        {
          hashAlgorithm: 'sha256',
          issuedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
          attester: { publicKey: kp.publicKey },
          ...a,
        },
        kp.privateKey,
      );
    await call(
      'POST',
      '/attestations',
      await sign(checkedLab, {
        attestationId: `att_r_${randomBytes(4).toString('hex')}`,
        type: 'chain-of-custody',
        subjectCommitment: bound.recordFingerprint,
        documentHash: sha256('sample'),
      }),
    );
    await call(
      'POST',
      '/attestations',
      await sign(checkedLab, {
        attestationId: `att_l_${randomBytes(4).toString('hex')}`,
        type: 'laboratory-report',
        subjectCommitment: bound.recordFingerprint,
        documentHash: LAB_SHA,
      }),
    );
    // Deliveries of `bound` to a lab, each with the sample details the breeder wrote, the
    // lab's arrival details, and the lab's receipt over both (its id carries their digest,
    // as the site signs it), attached to the delivery.
    const deliver = async (sample, arrival) => {
      const labHolder = { 'x-holder-key': randomBytes(32).toString('hex') };
      const offer = await call(
        'POST',
        '/transfers',
        { sourceRecord: bound.id, toHandle: 'lab@e2e.test', sample },
        holder,
      );
      const claim = await call(
        'POST',
        `/transfers/${offer.transferId}/claim`,
        { claimCode: offer.claimCode },
        labHolder,
      );
      const got = (await call('GET', '/api/records', undefined, labHolder)).find((r) => r.id === claim.recordId);
      const received = seal(got);
      await call('PUT', '/api/records', [received], labHolder);
      await call('POST', `/transfers/${offer.transferId}/custody`, { arrival }, labHolder);
      const digest = sha256(
        canonicalise({ format: 'veilcore/sample-custody/v1', transferId: offer.transferId, sample, arrival }),
      );
      const attestationId = `att_d_${randomBytes(4).toString('hex')}_sc1_${digest}`;
      await call(
        'POST',
        '/attestations',
        await sign(checkedLab, {
          attestationId,
          type: 'chain-of-custody',
          subjectCommitment: bound.recordFingerprint,
          documentHash: received.recordFingerprint,
        }),
      );
      await call('POST', `/transfers/${offer.transferId}/receipt`, { attestationId }, labHolder);
      return attestationId;
    };
    const arrivedOn = today();
    const receiptMatching = await deliver(
      { sampleId: 'E2E-1', sealNumber: '4471' },
      { sampleId: 'E2E-1', sealNumber: '4471', sealIntact: 'yes', arrivedOn },
    );
    const receiptSealDiffers = await deliver(
      { sampleId: 'E2E-2', sealNumber: '5500' },
      { sampleId: 'E2E-2', sealNumber: '5505', sealIntact: 'yes', arrivedOn },
    );

    const withdrawnId = `att_w_${randomBytes(4).toString('hex')}`;
    await call(
      'POST',
      '/attestations',
      await sign(otherLab, {
        attestationId: withdrawnId,
        type: 'chain-of-custody',
        subjectCommitment: older.recordFingerprint,
        documentHash: sha256('sample 2'),
      }),
    );
    const retraction = await signRetraction(
      {
        attestationId: withdrawnId,
        attesterPublicKey: otherLab.publicKey,
        reason: 'sample-compromised',
        retractedAt: new Date().toISOString(),
      },
      otherLab.privateKey,
    );
    await call('POST', `/attestations/${withdrawnId}/retract`, retraction);

    const sealed = await call('POST', '/batches/seal', undefined, op);
    const TX = randomBytes(32).toString('hex');
    await call(
      'POST',
      `/batches/${sealed.batchId}/anchor`,
      {
        network: 'preprod',
        contractAddress: CONTRACT,
        txHash: TX,
        blockHeight: 4242,
        anchoredAt: new Date().toISOString(),
      },
      op,
    );

    // Sealed after the batch: in none.
    const undated = seal({
      id: recordId(),
      nonce: randomBytes(32).toString('hex'),
      strainName: 'Undated partner check test record',
      bredBy: 'E2E',
      dateCreated: '2026-10-14',
      notes: '',
      loggedAt: Date.now(),
      licenseIds: [],
    });
    await call('PUT', '/api/records', [bound, older, undated], holder);

    const link = (r, extra = '') => `https://veilcore.org/verify/${r.id}?fp=${r.recordFingerprint}${extra}`;
    return {
      base,
      stop,
      log: () => log,
      batchId: sealed.batchId,
      txId: TX,
      records: { bound, older, undated },
      receipts: { matching: receiptMatching, sealDiffers: receiptSealDiffers },
      fields: { bound: committed(bound) },
      links: {
        bound: link(bound),
        boundWithKey: link(bound, `&chain=${KEY}&ks=${KEY_SALT}&cd=${sha256(canonicalise(committed(bound)))}`),
        older: link(older),
        undated: link(undated),
        // The bound record's id with the older record's fingerprint: a link someone edited.
        tampered: `https://veilcore.org/verify/${bound.id}?fp=${older.recordFingerprint}`,
        missing: `https://veilcore.org/verify/${recordId()}?fp=${'ab'.repeat(32)}`,
        bareId: bound.id,
      },
    };
  } catch (e) {
    stop();
    throw e;
  }
};
