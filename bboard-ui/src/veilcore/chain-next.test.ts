// Where a record's page sends the holder for the next step of a production chain, and what the
// document form accepts from its address (docs/document-chain.md).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { KIND_SCHEMA_ID, chainNextHref, chainNextOf, kindFromQuery } from './document-kind';

describe('the next step of a chain, from a record', () => {
  it('a plant or a strain starts a grow batch', () => {
    expect(chainNextOf({}, true)).toBe('grow-batch');
  });
  it('a grow batch leads to a harvest lot, a harvest lot to its lab report', () => {
    expect(chainNextOf({ fieldSchema: KIND_SCHEMA_ID['grow-batch'] }, false)).toBe('harvest-lot');
    expect(chainNextOf({ fieldSchema: KIND_SCHEMA_ID['harvest-lot'] }, false)).toBe('report');
  });
  it('any other document, an animal or a dating record offers none', () => {
    expect(chainNextOf({}, false)).toBeUndefined();
    expect(chainNextOf({ fieldSchema: 'a'.repeat(64) }, false)).toBeUndefined();
    expect(chainNextOf(undefined, false)).toBeUndefined();
  });
});

describe('the link to the document form', () => {
  it('carries the kind and the record it is about, and nothing else', () => {
    expect(chainNextHref('grow-batch', 'VEIL-1')).toBe('/documents/new?kind=grow-batch&about=VEIL-1');
    expect(chainNextHref('harvest-lot', 'VEIL-2')).toBe('/documents/new?kind=harvest-lot&about=VEIL-2');
    expect(chainNextHref('report', 'VEIL-3')).toBe('/documents/new?about=VEIL-3');
  });
  it('escapes the record id', () => {
    expect(chainNextHref('report', 'a b&kind=grow-batch')).toBe('/documents/new?about=a%20b%26kind%3Dgrow-batch');
  });
});

describe('the kind the form takes from its address', () => {
  it('accepts only the two chain kinds', () => {
    expect(kindFromQuery('grow-batch')).toBe('grow-batch');
    expect(kindFromQuery('harvest-lot')).toBe('harvest-lot');
    for (const v of [null, '', 'report', 'coa', 'Grow-Batch', '__proto__', 'grow-batch ']) {
      expect(kindFromQuery(v)).toBeUndefined();
    }
  });
});
