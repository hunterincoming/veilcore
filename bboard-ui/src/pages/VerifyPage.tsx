// VerifyPage (/verify/:id) — the public page a stranger reaches from a link or a
// certificate's QR code. It works for a visitor who has never loaded the app.
//
// What it says is split by who stands behind it (attack round D):
//   - checked in this browser: the record's inclusion proof (bound to its fingerprint,
//     path folding to the batch root) and any signed attestations (bound to the
//     fingerprint, signatures verified here). Only these get a tick, and only when the
//     fingerprint came from the link (`?fp=`), not from the registry's answer. Checked
//     against the registry's own value, a lying registry could answer one record's id
//     with another record's fingerprint and borrow its proof and lab signature (round D
//     verification). A link whose fingerprint the registry does not report gets no
//     checks and a warning; an old link without `fp` gets the checks worded as the
//     registry's report, with no ticks;
//   - reported by the registry: everything else — that a record with this fingerprint
//     exists, when the registry first stored it, an anchor, whether a key is vetted, and
//     the facts the holder chose to share. Worded as reports, never as checks.
// The footer says exactly which of those checks ran (round 3: it used to say "nothing on
// this page could be checked" under a line saying a signature was verified here).
// Opened by the plant's own holder (the record is in this browser), the page also shows
// the lab's receipt linked to one of their deliveries (custody.ts); a stranger can't be
// told which signature is a receipt, so for them signatures are only described.
// The registry sends only the facts the holder granted (README "Disclosure"); a ?show=
// in the link can narrow that and never widen it. Genetics are never sent.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import { shortFingerprint } from '../veilcore/commitment';
import { DISCLOSURE_FIELDS, LEGACY_NAME, toDisclosureKey, labelOf } from '../veilcore/disclosure';
import { proofFor, type ProofState } from '../veilcore/proofs';
import { attestationsFor, countsAsSigned, signerLabel, type ResolvedAttestation } from '../veilcore/attesters';
import { ACCENT } from '../config/theme';
import { NETWORK, isTestNetwork, networkLabel } from '../config/network';
import { Fact, FactKey, SharedFacts } from '../components/verify/DisclosedFacts';
import { publicReportLine, withdrawnSignaturesLine } from '../veilcore/saved-report';
import { bindingOf, checkedSummary, linkFingerprint, verifyHeading } from '../veilcore/verify-link';
import { displayName } from '../veilcore/display-name';
import { utcStamp as fmt } from '../veilcore/time';
import { REAL_CHAIN } from '../veilcore/chain/config';
import { VerifierChallengePanel } from '../components/chain/VerifierChallengePanel';
import { useRecords } from '../veilcore/records';
import { useBreederReceipt } from '../components/flow/LabResults';
import { NameCheckText } from '../components/NameCheckText';

const API = import.meta.env.VITE_API_BASE ?? '';

/**
 * A record id as the site makes them: VEIL- and 128 random bits in hex (records.ts). Only
 * an id of that shape is echoed back on the page; anything else in the address bar is
 * "this ID", so a crafted link cannot put its own words on VeilCore's page.
 */
const RECORD_ID = /^VEIL-[0-9A-F]{32}$/i;
const idText = (v: string | undefined): string => (v && RECORD_ID.test(v) ? v : 'this ID');

/**
 * Whether this page checked the batch root's anchor on chain itself. It cannot yet: it
 * reads no chain, so an anchor is always the registry's report. The seal turns teal only
 * when this is true, so today it never does. Checking the record's own inclusion proof,
 * up to the registry's batch root, is not enough for the seal: that root could be anything
 * until its anchor is looked up.
 */
const ANCHOR_CHECKED_ON_CHAIN = false;

type VerifyResult = {
  found: boolean;
  id?: string;
  cultivar?: string;
  recordFingerprint?: string;
  /** The holder saved a lab report fingerprint themselves. Not a lab's confirmation. */
  dnaPairedByHolder?: boolean;
  /**
   * Older field. From a current registry it means attestedByVettedLab; from an older one
   * it meant any valid signature, so it is never read as "a lab" on its own.
   */
  attested?: boolean;
  /** A valid, unretracted signed attestation exists. Says nothing about who signed. */
  signedAttestation?: boolean;
  /** One of them is from a key the registry operator has checked. */
  attestedByVettedLab?: boolean;
  /** The record's fingerprint is in a batch whose root is anchored on a ledger. */
  anchored?: boolean;
  /** Where the batch root was anchored, when it was. The network says whether it is a test one. */
  anchor?: { network?: string; txHash?: string } | null;
  /** The holder's own statement of when it was logged. The app stores it as epoch ms. */
  loggedAtClaimedByHolder?: string | number | null;
  /** When the registry first received the record. The registry's word, not a ledger's. */
  registryFirstSeen?: string | null;
  /** The facts the holder granted, in the registry's older names. Always sent by a current registry. */
  disclosed?: string[];
  /** Keys the link asked for that the holder has not granted (older names). */
  notGranted?: string[];
  priorPossession?: boolean;
  sealedAt?: number | string;
  /** null when the endpoint did not check descent — not the same as false. */
  lineageIntact?: boolean | null;
  lineageNote?: string;
  /** Keys the caller asked for that the server declines to answer. */
  unavailable?: string[];
  unavailableReason?: string;
  parents?: string[];
  breedingMethod?: string | null;
  /** The registry's report that the record names its own key (key-binding.ts). */
  keyBound?: boolean;
  /**
   * The saved lab report's pairing fingerprint (commitment.ts pairingFingerprintOfSha), when
   * the holder shares whether one is saved and the registry sends it. Not the file's SHA-256.
   */
  dnaPairingFingerprint?: string | null;
  /** The saved lab report file's SHA-256, as it is now, when the record keeps it (round 6). */
  dnaFileSha256?: string | null;
};

/**
 * The fields this page reads. Anything absent renders as not disclosed, which is
 * the same as the holder choosing not to show it, so only `found` has to be there.
 */
const isVerifyResult = (v: unknown): v is VerifyResult => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  if (typeof r.found !== 'boolean') return false;
  const str = (x: unknown) => x === undefined || x === null || typeof x === 'string';
  const num = (x: unknown) => x === undefined || typeof x === 'number';
  const bool = (x: unknown) => x === undefined || typeof x === 'boolean';
  return (
    str(r.id) &&
    str(r.cultivar) &&
    str(r.recordFingerprint) &&
    str(r.breedingMethod) &&
    bool(r.dnaPairedByHolder) &&
    bool(r.attested) &&
    bool(r.signedAttestation) &&
    bool(r.attestedByVettedLab) &&
    bool(r.anchored) &&
    bool(r.priorPossession) &&
    // The app writes loggedAt as a number, so the registry echoes a number. Accepting
    // only a string made this guard reject every record the app had made, and the page
    // said "No record found" for a record that exists.
    (str(r.loggedAtClaimedByHolder) || num(r.loggedAtClaimedByHolder)) &&
    str(r.registryFirstSeen) &&
    // null is a valid answer here and means "not checked". Requiring a boolean made
    // the guard reject a well-formed response, and the page then reported no record
    // for a record that exists.
    (r.lineageIntact === null || bool(r.lineageIntact)) &&
    (r.sealedAt === undefined || typeof r.sealedAt === 'number' || typeof r.sealedAt === 'string') &&
    (r.disclosed === undefined || Array.isArray(r.disclosed)) &&
    (r.parents === undefined || Array.isArray(r.parents)) &&
    (r.unavailable === undefined || Array.isArray(r.unavailable)) &&
    (r.notGranted === undefined || Array.isArray(r.notGranted)) &&
    (r.anchor === undefined || r.anchor === null || (typeof r.anchor === 'object' && !Array.isArray(r.anchor))) &&
    str(r.lineageNote) &&
    str(r.unavailableReason) &&
    bool(r.keyBound) &&
    str(r.dnaPairingFingerprint) &&
    str(r.dnaFileSha256)
  );
};

/**
 * The facts the holder shared, in the registry's older names. A current registry always
 * sends `disclosed`. An older one, which answered everything when the link had no
 * ?show=, did not; for it the shared set is read from which granted fields are present,
 * so a missing field is still "not shared" and never "no".
 */
const sharedOf = (r: VerifyResult): string[] => {
  const names = new Set((r.disclosed ?? []).filter((k): k is string => typeof k === 'string'));
  if (r.disclosed === undefined) {
    if (r.priorPossession !== undefined) names.add('own');
    if (r.dnaPairedByHolder !== undefined) names.add('dna');
    if (r.lineageIntact !== undefined || r.lineageNote !== undefined) names.add('lineage');
    if (r.sealedAt !== undefined) names.add('sealed');
    if (r.parents !== undefined) names.add('parents');
    if (r.breedingMethod !== undefined) names.add('method');
  }
  return DISCLOSURE_FIELDS.map((f) => LEGACY_NAME[f.key]).filter((k) => names.has(k));
};

/** Most signatures given a line each; the rest are counted. */
const SIGNATURE_LINES = 5;

/** What a signature is, in plain words (its type is the signer's own statement). */
export const signatureKind = (a: ResolvedAttestation): string =>
  a.type === 'chain-of-custody'
    ? 'Lab’s receipt for a sample'
    : a.type === 'laboratory-report'
      ? `Lab report (file SHA-256 ${a.documentHash.slice(0, 8)}…${a.documentHash.slice(-6)})`
      : 'Signed statement';

const labelsOf = (keys: readonly unknown[]): string =>
  keys
    .map((k) => (typeof k === 'string' ? toDisclosureKey(k) : undefined))
    .map((k, i) => (k ? labelOf(k) : String(keys[i])))
    .join('; ');

export const VerifyPage: React.FC = () => {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const show = params.get('show');
  // The fingerprint the link was made for. It is not sent to the registry: it is what
  // the registry's answer is checked against.
  const fp = params.get('fp');

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [proof, setProof] = useState<ProofState | 'checking'>('checking');
  const [atts, setAtts] = useState<ResolvedAttestation[] | null>(null);
  // The holder's own plant, when this browser has it loaded: its linked lab receipt.
  const own = useRecords().find((r) => r.id === id.toUpperCase() && !r.receivedFrom);
  const receipt = useBreederReceipt(own, !!own);

  useEffect(() => {
    let cancelled = false;
    // ?show= is passed on so a link made to show less still shows less. It cannot add
    // anything: the registry answers only what the holder granted.
    const url = `${API}/verify/${encodeURIComponent(id)}${show !== null ? `?show=${encodeURIComponent(show)}` : ''}`;
    fetch(url)
      .then((r): Promise<unknown> => r.json())
      .then((data) => {
        if (!cancelled) {
          // A shareable link is opened by someone who has no other way to check what
          // they are being shown. A body that is not a verdict is treated as no
          // record rather than rendered with blank fields, because a page that looks
          // like a verification and is not one is worse than an error.
          setResult(isVerifyResult(data) ? data : null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ found: false });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, show]);

  // The two things this page can check for itself. With a fingerprint in the link they
  // are checked against it (and the registry must report the same one); an old link is
  // checked against the registry's value and shown as its report; on a mismatch nothing
  // is checked.
  const binding = bindingOf(linkFingerprint(fp), result?.found ? result.recordFingerprint : undefined);
  const bound = binding.kind === 'bound';
  const fingerprint = binding.kind === 'mismatch' ? undefined : binding.fingerprint;
  useEffect(() => {
    let live = true;
    setProof('checking');
    setAtts(null);
    if (!fingerprint) {
      setProof({ status: 'none' });
      setAtts([]);
      return;
    }
    void proofFor(fingerprint).then((p) => live && setProof(p));
    void attestationsFor(fingerprint).then((a) => live && setAtts(a));
    return () => {
      live = false;
    };
  }, [fingerprint]);

  // A tick (and the teal mark) only for a check against the link's own fingerprint.
  const checked = bound && proof !== 'checking' && proof.status !== 'none';
  // Before the link's fingerprint is known to match, say whose fingerprint was used.
  const forWhom = bound ? '' : 'For the fingerprint the registry reports: ';
  const reportedNetwork =
    proof !== 'checking' && proof.status === 'anchor-reported'
      ? proof.proof.anchor?.network
      : typeof result?.anchor?.network === 'string'
        ? result.anchor.network
        : undefined;
  const signed = (atts ?? []).filter(countsAsSigned);
  // Round 5: what each signature is, said on its own line and counted the same way in the
  // footer: a lab's receipt, a lab report, or some other signed statement.
  const withdrawnLine = withdrawnSignaturesLine(atts ?? []);
  const badSigs = (atts ?? []).filter((a) => !a.signatureValid).length;
  // Round 6: which file is saved comes from the registry as it is now; the link's `rs` is
  // only a hint from when the link was made (saved-report.ts publicReportLine).
  const labReport = publicReportLine({
    paired: result?.dnaPairedByHolder,
    linkSha: params.get('rs'),
    pairingFingerprint: result?.dnaPairingFingerprint,
    fileSha: result?.dnaFileSha256,
    atts: atts ?? [],
    bound,
  });
  // A verified signature against the link's own fingerprint is a check this browser made;
  // whether its name was matched is said in words on its line (round 5).
  const ticked = checked || (bound && signed.length > 0);
  // The seal: only for an anchor checked on chain by this page (none today).
  const seal = checked && ANCHOR_CHECKED_ON_CHAIN;
  const name = displayName(result?.cultivar);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* IDs, fingerprints and hashes are long unbroken strings: they wrap, the page never scrolls sideways. */}
      <Container component="main" maxWidth="sm" sx={{ py: { xs: 5, md: 8 }, overflowWrap: 'anywhere' }}>
        <Stack
          component={RouterLink}
          to="/"
          aria-label="VeilCore home"
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            mx: 'auto',
            width: 'fit-content',
            minHeight: 44,
            textDecoration: 'none',
            color: 'text.primary',
          }}
        >
          <Box
            aria-hidden="true"
            sx={{ width: 12, height: 12, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 14px ${ACCENT}` }}
          />
          <Typography variant="h6" component="span" sx={{ letterSpacing: '0.3em', fontWeight: 600 }}>
            VEILCORE
          </Typography>
        </Stack>
        {/* One line for a stranger who arrived from a QR code or a shared link. */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', mb: 4, maxWidth: 460, mx: 'auto' }}
        >
          This page checks a VeilCore record: a fingerprint of a description of genetic material, dated once it&apos;s
          anchored, published without the genetics. Checking is free and needs no account.{' '}
          <Box component={RouterLink} to="/" sx={{ color: ACCENT, whiteSpace: 'nowrap' }}>
            What is VeilCore?
          </Box>
        </Typography>

        {loading ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={28} sx={{ color: ACCENT }} aria-label="Checking the record" />
          </Paper>
        ) : !result?.found ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" component="h1" sx={{ mb: 1, overflowWrap: 'anywhere' }}>
              No record found for {idText(id)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This verification link doesn&apos;t match any record in the registry. Check the link is complete and
              unmodified.
            </Typography>
            <Box component={RouterLink} to="/" sx={{ display: 'inline-block', mt: 2, py: 1, color: ACCENT }}>
              Go to veilcore.org
            </Box>
          </Paper>
        ) : binding.kind === 'mismatch' ? (
          // The link names a record the registry does not answer for. Its answer is about
          // some other record (or none), so nothing on it is checked or shown as this one.
          <Paper sx={{ p: { xs: 3, md: 4 } }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
              <VerifiedIcon data-checked="no" aria-hidden="true" sx={{ color: 'text.disabled', fontSize: 30 }} />
              <Typography variant="h6" component="h1" sx={{ color: 'error.main', lineHeight: 1.4 }}>
                This link&apos;s fingerprint doesn&apos;t match the record: nothing checked
              </Typography>
            </Stack>
            <Alert severity="error" variant="outlined" data-mismatch="yes">
              <Typography variant="subtitle2" component="p" sx={{ mb: 0.5 }}>
                Do not rely on this page.
              </Typography>
              <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                {binding.linked
                  ? `This link was made for the record with fingerprint ${shortFingerprint(binding.linked)}, `
                  : 'This link carries a fingerprint that is not valid (it should be 64 hexadecimal characters); it may have been cut short or changed, '}
                but the registry reports{' '}
                {binding.reported ? `fingerprint ${shortFingerprint(binding.reported)}` : 'no fingerprint'} for{' '}
                {idText(id)}. Its answer is not about the record the link names, so this page has checked nothing and
                shows none of it. Ask whoever gave you the link for the record itself.
              </Typography>
            </Alert>
            <Divider sx={{ my: 2 }} />
            {/* Only a well-formed fingerprint (64 hex characters) is shown; anything else
                in the link is never echoed. */}
            {binding.linked && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
                Fingerprint in the link: {binding.linked}
              </Typography>
            )}
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Chip
                size="small"
                variant="outlined"
                label="The registry's answer does not match this link — nothing on this page was checked"
                sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
              />
            </Box>
          </Paper>
        ) : (
          <Paper sx={{ p: { xs: 3, md: 4 } }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
              {/* Teal only when this page checked the batch root's anchor on chain
                  (ANCHOR_CHECKED_ON_CHAIN), which it cannot do yet, so the mark is grey.
                  The lines below still tick what this browser did check. */}
              <VerifiedIcon
                aria-hidden="true"
                data-checked={seal ? 'yes' : 'no'}
                sx={{ color: seal ? ACCENT : 'text.disabled', fontSize: 30 }}
              />
              <Box>
                <Typography
                  variant="h6"
                  component="h1"
                  sx={{ color: seal ? ACCENT : 'text.primary', lineHeight: 1.4, display: 'block' }}
                >
                  {verifyHeading({
                    sealed: !!result.recordFingerprint,
                    bound,
                    proof: proof === 'checking' ? 'checking' : proof.status,
                  })}
                </Typography>
              </Box>
            </Stack>

            {/* The holder's own words, labelled as such: never a heading next to the mark,
                cleaned of symbols and control characters, and capped (display-name.ts). */}
            {name && (
              <Typography
                variant="body1"
                sx={{ mb: RECORD_ID.test(result.id ?? '') ? 0.5 : 2, overflowWrap: 'anywhere' }}
                data-holder-name=""
              >
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  Name, as the holder typed it:{' '}
                </Box>
                {name}
              </Typography>
            )}
            {RECORD_ID.test(result.id ?? '') && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, overflowWrap: 'anywhere' }}>
                Record ID: {result.id}
              </Typography>
            )}

            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1.25}>
              <FactKey />
              {!result.recordFingerprint ? (
                <Fact ok={false}>
                  This record carries no commitment, so nothing about it can be checked. It exists in the registry and
                  that is all.
                </Fact>
              ) : bound ? (
                <Fact ok={false}>
                  This link was made for fingerprint {shortFingerprint(result.recordFingerprint)}, and the registry
                  reports the same fingerprint for this record
                  {result.registryFirstSeen ? `, first stored on ${fmt(result.registryFirstSeen)}` : ''}. The fields it
                  covers are not shared, so this page cannot recompute it.
                </Fact>
              ) : (
                <>
                  <Fact ok={false}>
                    The registry reports a record with fingerprint {shortFingerprint(result.recordFingerprint)}
                    {result.registryFirstSeen ? `, first stored on ${fmt(result.registryFirstSeen)}` : ''}. The fields
                    it covers are not shared, so this page cannot recompute it.
                  </Fact>
                  <Fact ok={false}>
                    This link does not name the record&apos;s fingerprint, so this page cannot tell whether the registry
                    answered with this record&apos;s fingerprint or another&apos;s. Nothing below is ticked. A link made
                    now from the record ends in ?fp=…; ask the holder for one.
                  </Fact>
                </>
              )}

              {result.recordFingerprint &&
                (proof === 'checking' ? null : proof.status === 'none' ? (
                  <Fact ok={false}>
                    Not dated yet, as far as this page can tell: there is no proof here that the record is in a dated
                    batch, so there is no public date stamp to check.
                  </Fact>
                ) : (
                  <>
                    {bound ? (
                      <Fact>
                        Checked in this browser: this fingerprint is in batch {proof.proof.batchId}, and its path folds
                        to the batch root {proof.proof.root.slice(0, 16)}….
                      </Fact>
                    ) : (
                      <Fact ok={false}>
                        {forWhom}it is in batch {proof.proof.batchId}, and its path folds to the batch root{' '}
                        {proof.proof.root.slice(0, 16)}…. Checked here, but against the registry&apos;s own fingerprint.
                      </Fact>
                    )}
                    {proof.status === 'anchor-reported' ? (
                      <Fact ok={false}>
                        The registry reports that root was recorded on {networkLabel(reportedNetwork ?? NETWORK)}
                        {proof.proof.anchor?.txHash ? ` in transaction ${proof.proof.anchor.txHash}` : ''}. This page
                        has not looked it up; do that before relying on the date.
                        {isTestNetwork(reportedNetwork ?? NETWORK)
                          ? ' A test network can be reset and its dates carry no evidential weight.'
                          : ''}
                      </Fact>
                    ) : (
                      <Fact ok={false}>The batch has not been anchored on Midnight yet.</Fact>
                    )}
                  </>
                ))}

              {/* Base data: shown whatever the holder shared. Signatures are checked here;
                  who holds a key is the registry operator's word. Ticked only against the
                  link's own fingerprint. One line per signature, saying what it is. */}
              {result.recordFingerprint && atts !== null && (
                <>
                  {signed.slice(0, SIGNATURE_LINES).map((a) => {
                    const label = signerLabel(a, 'Signed by');
                    return (
                      <Fact key={a.attestationId} status={bound ? 'checked' : 'reported'}>
                        {forWhom}
                        {signatureKind(a)}, signature verified in this browser. {label.lead}.
                        <NameCheckText label={label} />
                        {!label.checked &&
                          ' Anyone can register a key under any name, so the name doesn’t show who signed.'}
                      </Fact>
                    );
                  })}
                  {signed.length > SIGNATURE_LINES && (
                    <Fact status={bound ? 'checked' : 'reported'}>
                      {forWhom}And {signed.length - SIGNATURE_LINES} more signatures, each verified in this browser.
                    </Fact>
                  )}
                  {signed.length === 0 &&
                    (result.signedAttestation === true ||
                    result.attestedByVettedLab === true ||
                    result.attested === true ? (
                      <Fact status="failed">
                        The registry reports a signed attestation, but none could be verified in this browser.
                      </Fact>
                    ) : (
                      <Fact ok={false}>No lab&apos;s receipt or lab report has been signed about this record.</Fact>
                    ))}
                  {withdrawnLine && <Fact ok={false}>{withdrawnLine}</Fact>}
                  {badSigs > 0 && (
                    <Fact status="failed">
                      {badSigs === 1
                        ? 'One signature the registry reports doesn’t verify in this browser, so it is not counted.'
                        : `${badSigs} signatures the registry reports don’t verify in this browser, so they are not counted.`}
                    </Fact>
                  )}
                </>
              )}

              {/* The holder's own plant: the lab receipt linked to one of their deliveries. */}
              {own && receipt?.kind === 'signed' && (
                <Fact ok={false}>
                  {signerLabel(receipt.by).lead}, linked to your delivery {receipt.transferId}.
                  <NameCheckText label={signerLabel(receipt.by)} /> You see this because the plant is in this browser;
                  someone you send the link to sees only the signature line above.
                </Fact>
              )}

              <Divider sx={{ my: 0.5 }} />
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
                Shared by the holder · reported by the registry
              </Typography>
              <SharedFacts
                data={{
                  disclosed: sharedOf(result),
                  anchored: result.anchored,
                  priorPossession: result.priorPossession,
                  anchorNetwork: reportedNetwork,
                  dnaPairedByHolder: result.dnaPairedByHolder,
                  lineageIntact: result.lineageIntact,
                  sealedAt: result.sealedAt ?? result.loggedAtClaimedByHolder ?? undefined,
                  registryFirstSeen: result.registryFirstSeen,
                  parents: result.parents,
                  breedingMethod: result.breedingMethod,
                  labReport,
                }}
              />

              {result.notGranted && result.notGranted.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  This link asked for {labelsOf(result.notGranted)}, which the holder has not chosen to share.
                </Typography>
              )}
              {result.unavailable && result.unavailable.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  This link asked for facts about the holder rather than this record ({result.unavailable.join(', ')}).
                  The registry never answers those.
                </Typography>
              )}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">
              Fingerprint {shortFingerprint(result.recordFingerprint ?? '')} · only the facts above were sent · no
              genetics disclosed
            </Typography>

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Chip
                size="small"
                variant="outlined"
                data-ticked={ticked ? 'yes' : 'no'}
                label={checkedSummary({
                  bound,
                  proofChecked: proof !== 'checking' && proof.status !== 'none',
                  signaturesChecked: signed.length,
                  signatureKinds: signed.map(signatureKind),
                })}
                sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
              />
            </Box>
          </Paper>
        )}
        {/* Real-chain builds: the holder's link may name the record's on-chain identity
            (?chain=…&anchorTx=…), and for a record that names its key, what ties the two
            (&ks=…&cd=…). The panel matches the key to the link's fingerprint (only when the
            registry reports the same one), then checks the proof on chain. */}
        {REAL_CHAIN && result?.found && params.get('chain') && (
          <VerifierChallengePanel
            claim={{
              identity: params.get('chain') ?? '',
              txId: params.get('anchorTx') ?? undefined,
              keySalt: params.get('ks'),
              contentHash: params.get('cd'),
              fingerprint: bound ? binding.fingerprint : undefined,
              keyBound: result.keyBound === true,
            }}
            recordId={id}
          />
        )}
      </Container>
    </Box>
  );
};
