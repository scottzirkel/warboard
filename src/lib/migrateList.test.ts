import { describe, it, expect } from 'vitest';
import { migrateList, needsMigration } from './migrateList';

describe('migrateList', () => {
  describe('needsMigration', () => {
    it('returns false for null or invalid data', () => {
      expect(needsMigration(null)).toBe(false);
      expect(needsMigration(undefined)).toBe(false);
      expect(needsMigration('string')).toBe(false);
    });

    it('returns true for old gameFormat field', () => {
      const oldList = {
        name: 'Test',
        detachment: 'shield_host',
        gameFormat: 'standard',
        pointsLimit: 500,
        units: [],
      };
      expect(needsMigration(oldList)).toBe(true);
    });

    it('returns true for missing army field', () => {
      const oldList = {
        name: 'Test',
        detachment: 'shield_host',
        format: 'standard',
        pointsLimit: 500,
        units: [],
      };
      expect(needsMigration(oldList)).toBe(true);
    });

    it('returns true for units with wargear field', () => {
      const oldList = {
        name: 'Test',
        army: 'custodes',
        detachment: 'shield_host',
        format: 'standard',
        pointsLimit: 500,
        units: [{ unitId: 'test', modelCount: 1, wargear: [] }],
      };
      expect(needsMigration(oldList)).toBe(true);
    });

    it('returns false for new format list', () => {
      const newList = {
        name: 'Test',
        army: 'custodes',
        detachment: 'shield_host',
        format: 'standard',
        pointsLimit: 500,
        units: [
          {
            unitId: 'test',
            modelCount: 1,
            enhancement: '',
            currentWounds: null,
            leaderCurrentWounds: null,
            attachedLeader: null,
          },
        ],
      };
      expect(needsMigration(newList)).toBe(false);
    });
  });

  describe('migrateList', () => {
    it('throws for invalid data', () => {
      expect(() => migrateList(null)).toThrow('Invalid list data');
      expect(() => migrateList(undefined)).toThrow('Invalid list data');
    });

    it('migrates gameFormat to format', () => {
      const oldList = {
        name: 'Test',
        detachment: 'shield_host',
        gameFormat: 'colosseum',
        pointsLimit: 500,
        units: [],
      };

      const result = migrateList(oldList);

      expect(result.format).toBe('colosseum');
      expect(result).not.toHaveProperty('gameFormat');
    });

    it('detects custodes army from detachment', () => {
      const oldList = {
        name: 'Test',
        detachment: 'shield_host',
        gameFormat: 'standard',
        pointsLimit: 500,
        units: [],
      };

      const result = migrateList(oldList);

      expect(result.army).toBe('custodes');
    });

    it('detects tyranids army from detachment', () => {
      const oldList = {
        name: 'Test',
        detachment: 'invasion_fleet',
        gameFormat: 'standard',
        pointsLimit: 500,
        units: [],
      };

      const result = migrateList(oldList);

      expect(result.army).toBe('tyranids');
    });

    it('preserves existing army field', () => {
      const oldList = {
        name: 'Test',
        army: 'spacemarines',
        detachment: 'gladius_task_force',
        gameFormat: 'standard',
        pointsLimit: 500,
        units: [],
      };

      const result = migrateList(oldList);

      expect(result.army).toBe('spacemarines');
    });

    it('migrates units with missing fields', () => {
      const oldList = {
        name: 'Test',
        detachment: 'shield_host',
        gameFormat: 'standard',
        pointsLimit: 500,
        units: [
          {
            unitId: 'shield-captain',
            modelCount: 1,
            wargear: [],
            currentWounds: null,
          },
        ],
      };

      const result = migrateList(oldList);

      expect(result.units).toHaveLength(1);
      expect(result.units[0]).toEqual({
        unitId: 'shield-captain',
        modelCount: 1,
        enhancement: '',
        loadout: undefined,
        weaponCounts: undefined,
        currentWounds: null,
        leaderCurrentWounds: null,
        attachedLeader: null,
      });
    });

    it('preserves existing unit fields', () => {
      const oldList = {
        name: 'Test',
        detachment: 'shield_host',
        gameFormat: 'standard',
        pointsLimit: 500,
        units: [
          {
            unitId: 'shield-captain',
            modelCount: 1,
            enhancement: 'auric-mantle',
            loadout: { 'main-weapon': 'spears' },
            weaponCounts: { spears: 1 },
            currentWounds: 3,
            leaderCurrentWounds: null,
            attachedLeader: { unitIndex: 0 },
          },
        ],
      };

      const result = migrateList(oldList);

      expect(result.units[0]).toEqual({
        unitId: 'shield-captain',
        modelCount: 1,
        enhancement: 'auric-mantle',
        loadout: { 'main-weapon': 'spears' },
        weaponCounts: { spears: 1 },
        currentWounds: 3,
        leaderCurrentWounds: null,
        attachedLeader: { unitIndex: 0 },
      });
    });

    it('migrates real-world First_save.json format', () => {
      // This is the actual format from data/lists/First_save.json
      const firstSave = {
        name: 'First save',
        detachment: 'shield_host',
        gameFormat: 'standard',
        pointsLimit: 2000,
        units: [
          {
            unitId: 'shield-captain',
            modelCount: 1,
            enhancement: '',
            wargear: [],
            currentWounds: null,
          },
        ],
        activeKatah: '',
        activeModifiers: [],
        savedAt: '2026-01-22T03:29:43+00:00',
      };

      const result = migrateList(firstSave);

      expect(result.name).toBe('First save');
      expect(result.army).toBe('custodes');
      expect(result.detachment).toBe('shield_host');
      expect(result.format).toBe('standard');
      expect(result.pointsLimit).toBe(2000);
      expect(result.units).toHaveLength(1);
      expect(result.units[0].unitId).toBe('shield-captain');
      expect(result.units[0].enhancement).toBe('');
      expect(result.units[0].attachedLeader).toBeNull();
      expect(result.units[0].leaderCurrentWounds).toBeNull();
    });
  });
});
