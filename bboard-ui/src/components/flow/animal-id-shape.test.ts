// The ID shape hint (AnimalForm idShapeHint): only for the official numberings, only a hint.
import { describe, expect, it } from 'vitest';
import { idShapeHint } from './AnimalForm';
import { animal } from '../../i18n/app/en/animal';

const label = (k: string) => (animal as Record<string, string>)[k] ?? k;

describe('idShapeHint', () => {
  it('a Japan cattle ID must be 10 digits; spaces and dashes are ignored', () => {
    expect(idShapeHint('12345 67890', 'Japan cattle ID (10 digits)', label)).toBeUndefined();
    expect(idShapeHint('123456789', 'Japan cattle ID (10 digits)', label)).toBe('app.animal.idShape.jp');
  });
  it('USDA 840 is 15 digits starting with 840; a microchip is 15 digits', () => {
    expect(idShapeHint('840-003-123456789', 'USDA 840 / AIN tag', label)).toBeUndefined();
    expect(idShapeHint('124003123456789', 'USDA 840 / AIN tag', label)).toBe('app.animal.idShape.usda840');
    expect(idShapeHint('98510000123456', 'Microchip', label)).toBe('app.animal.idShape.microchip');
  });
  it('nothing for other or typed schemes, or an empty ID', () => {
    expect(idShapeHint('A-17', 'Ear tag', label)).toBeUndefined();
    expect(idShapeHint('x', 'my own numbering', label)).toBeUndefined();
    expect(idShapeHint('', 'Japan cattle ID (10 digits)', label)).toBeUndefined();
  });
});
