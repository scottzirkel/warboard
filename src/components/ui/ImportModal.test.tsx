import { describe, it, expect } from 'vitest';
import { parseNativeFormat } from './ImportModal';

const baseUnit = {
  unitId: 'custodian-guard',
  modelCount: 5,
  enhancement: '',
  loadout: {},
  weaponCounts: {},
};

describe('parseNativeFormat', () => {
  it('preserves non strike-force formats and points limit', () => {
    const list = parseNativeFormat(
      {
        name: 'Incursion List',
        army: 'custodes',
        format: 'incursion',
        pointsLimit: 1000,
        detachment: 'shield-host',
        units: [baseUnit],
      },
      'custodes'
    );

    expect(list.format).toBe('incursion');
    expect(list.pointsLimit).toBe(1000);
  });

  it('falls back to strike-force when format is invalid', () => {
    const list = parseNativeFormat(
      {
        name: 'Unknown',
        army: 'custodes',
        format: 'unknown',
        detachment: 'shield-host',
        units: [baseUnit],
      },
      'custodes'
    );

    expect(list.format).toBe('strike-force');
    expect(list.pointsLimit).toBe(2000);
  });
});
