// The one form an anchor (where a batch root was recorded) is taken in from the registry, a stored
// copy or a backup file: the form the registry stores it in (veilcore-api recordAnchor). Its
// fields reach README.txt, every page of an evidence bundle and the record and check pages, so
// one in any other form is junk and dropped whole, never printed and never taken as mainnet
// (review 9 of PR #233, R9-5; review 1 of PR #242, blocker 1: a sentence in the transaction or the
// network reached the declaration).
// SPDX-License-Identifier: Apache-2.0

import { isNumber, isString } from './json';

const HEX64 = /^[0-9a-f]{64}$/;
/** A chain or network name as the registry takes one (veilcore-api server.js NAME). */
const NAME = /^[a-z][a-z0-9-]{0,31}$/;
/** A date and time with a time zone, as the registry takes anchoredAt (veilcore-api server.js ISO_INSTANT). */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * An anchor's fields in the form the registry stores them (veilcore-api recordAnchor: 64 lowercase
 * hex, a short lower-case network name on chain "midnight" (every page calls it a Midnight
 * transaction; review 11, polish 2), a block number of 0 or more, a date and time with a time zone,
 * and a test-network flag that agrees with the network's name), or false. These reach README.txt
 * and every page of a bundle, so one from a doctored backup file that isn't in that form is junk
 * (review 9, R9-5; review 10, polish 3).
 */
export const anchorFormOk = (a: Record<string, unknown>): boolean =>
  a.chain === 'midnight' &&
  isString(a.network) &&
  NAME.test(a.network) &&
  isString(a.txHash) &&
  HEX64.test(a.txHash) &&
  (a.contractAddress === undefined || (isString(a.contractAddress) && HEX64.test(a.contractAddress))) &&
  (a.blockHeight === undefined ||
    (isNumber(a.blockHeight) && Number.isSafeInteger(a.blockHeight) && a.blockHeight >= 0)) &&
  (a.anchoredAt === undefined ||
    (isString(a.anchoredAt) &&
      a.anchoredAt.length <= 40 &&
      ISO_INSTANT.test(a.anchoredAt) &&
      Number.isFinite(Date.parse(a.anchoredAt)))) &&
  (a.testNetwork === undefined || a.testNetwork === (a.network !== 'mainnet'));

/** The anchor when it is an object in the registry's form (anchorFormOk), else null. */
export const anchorInForm = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && anchorFormOk(v as Record<string, unknown>)
    ? (v as Record<string, unknown>)
    : null;

/** A date and time with a time zone, in the form the registry gives one (ISO_INSTANT), or false. */
export const isInstant = (v: unknown): v is string =>
  isString(v) && v.length <= 40 && ISO_INSTANT.test(v) && Number.isFinite(Date.parse(v));

/**
 * A Time Stamping Authority's address as the registry names one: https, a host, an optional port
 * and path, printable ASCII with no spaces, at most 200 characters. It is printed on README.txt and
 * the examiner page, so one in any other form is left out.
 */
export const isTsaUrl = (v: unknown): v is string =>
  isString(v) && v.length <= 200 && /^https:\/\/[A-Za-z0-9.-]+(:[0-9]{1,5})?(\/[\x21-\x7e]*)?$/.test(v);
