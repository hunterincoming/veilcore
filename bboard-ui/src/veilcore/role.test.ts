// The lab door (/for-labs) and the header's view menu: what they do with the view (role.ts).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { labDoorStep, pageAfterRole } from './role';

describe('the lab door', () => {
  it('keeps a view that already has the lab tools', () => {
    expect(labDoorStep('lab', false)).toBe('keep');
    expect(labDoorStep('both', true)).toBe('keep');
  });

  it('gives the lab view to someone with no records of their own', () => {
    expect(labDoorStep(null, false)).toBe('lab');
    expect(labDoorStep('breeder', false)).toBe('lab');
  });

  it('asks a breeder with records before adding the lab tools', () => {
    expect(labDoorStep(null, true)).toBe('ask');
    expect(labDoorStep('breeder', true)).toBe('ask');
  });
});

describe('the page after a view is chosen', () => {
  it('takes a lab off the record wizard to its own home', () => {
    expect(pageAfterRole('lab', '/new')).toBe('/records');
  });

  it('leaves everyone else where they are', () => {
    expect(pageAfterRole('both', '/new')).toBeNull();
    expect(pageAfterRole('breeder', '/new')).toBeNull();
    expect(pageAfterRole('lab', '/records')).toBeNull();
    expect(pageAfterRole('lab', '/record/abc')).toBeNull();
  });
});
