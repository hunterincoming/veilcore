// A record's date, as every page shows it: its inclusion proof (checked here) and the
// registry's anchor looked up on Midnight (veilcore/chain/anchor-lookup.ts). The plant
// page's status card, its "Date on Midnight" section and its History use useRecordDate,
// and the check page uses useAnchorCheck on its own proof, so they all read one answer.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { proofFor, type ProofState } from '../../veilcore/proofs';
import { lookUpAnchor } from '../../veilcore/chain/anchor-lookup';
import type { AnchorState } from './anchor-words';

/** Parts of one page asking at once share one request; a later visit asks again. */
const PROOF_TTL_MS = 15_000;
const proofs = new Map<string, { at: number; p: Promise<ProofState> }>();

/** The record's inclusion proof, checked against its fingerprint (proofs.ts). */
export const recordProof = (fingerprint?: string): Promise<ProofState> => {
  if (!fingerprint) return Promise.resolve({ status: 'none' });
  const hit = proofs.get(fingerprint);
  if (hit && Date.now() - hit.at < PROOF_TTL_MS) return hit.p;
  const p = proofFor(fingerprint);
  proofs.set(fingerprint, { at: Date.now(), p });
  return p;
};

/** The proof's anchor, looked up on Midnight: undefined when there is no transaction to look up. */
export const useAnchorCheck = (proof: ProofState | 'checking' | undefined): AnchorState | undefined => {
  const [anchor, setAnchor] = useState<AnchorState | undefined>(undefined);
  useEffect(() => {
    const reported = proof !== undefined && proof !== 'checking' && proof.status === 'anchor-reported';
    const lookup = reported ? lookUpAnchor(proof.proof) : undefined;
    if (!lookup) {
      setAnchor(undefined);
      return;
    }
    let live = true;
    setAnchor('checking');
    void lookup.then((r) => live && setAnchor(r));
    return () => {
      live = false;
    };
  }, [proof]);
  return anchor;
};

/** A record's proof and its anchor's look-up, for the holder's own pages. */
export const useRecordDate = (
  fingerprint?: string,
): { proof: ProofState | 'checking'; anchor: AnchorState | undefined } => {
  const [proof, setProof] = useState<ProofState | 'checking'>('checking');
  useEffect(() => {
    let live = true;
    setProof('checking');
    void recordProof(fingerprint).then((p) => live && setProof(p));
    return () => {
      live = false;
    };
  }, [fingerprint]);
  return { proof, anchor: useAnchorCheck(proof) };
};
