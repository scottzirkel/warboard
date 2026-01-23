import { describe, it, expect } from 'vitest';
import type {
  DbUser,
  DbList,
  DbListWithUser,
  CreateUserInput,
  CreateListInput,
  UpdateListInput,
  CurrentList,
} from '@/types';

describe('Database Schema Types', () => {
  describe('DbUser type', () => {
    it('has required fields', () => {
      const user: DbUser = {
        id: 'cuid123',
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google-oauth-id',
        createdAt: new Date(),
      };

      expect(user.id).toBe('cuid123');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.googleId).toBe('google-oauth-id');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('allows nullable name and googleId', () => {
      const user: DbUser = {
        id: 'cuid123',
        email: 'test@example.com',
        name: null,
        googleId: null,
        createdAt: new Date(),
      };

      expect(user.name).toBeNull();
      expect(user.googleId).toBeNull();
    });
  });

  describe('DbList type', () => {
    it('has required fields', () => {
      const list: DbList = {
        id: 'list123',
        userId: 'user123',
        name: 'My Army List',
        armyId: 'custodes',
        data: '{"name":"My Army List","army":"custodes","units":[]}',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(list.id).toBe('list123');
      expect(list.userId).toBe('user123');
      expect(list.name).toBe('My Army List');
      expect(list.armyId).toBe('custodes');
      expect(typeof list.data).toBe('string');
      expect(list.createdAt).toBeInstanceOf(Date);
      expect(list.updatedAt).toBeInstanceOf(Date);
    });

    it('data field stores JSON string of CurrentList', () => {
      const currentList: CurrentList = {
        name: 'Test List',
        army: 'custodes',
        pointsLimit: 500,
        format: 'standard',
        detachment: 'shield_host',
        units: [],
      };

      const list: DbList = {
        id: 'list123',
        userId: 'user123',
        name: currentList.name,
        armyId: currentList.army,
        data: JSON.stringify(currentList),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const parsedData = JSON.parse(list.data) as CurrentList;
      expect(parsedData.name).toBe('Test List');
      expect(parsedData.army).toBe('custodes');
      expect(parsedData.format).toBe('standard');
    });
  });

  describe('DbListWithUser type', () => {
    it('includes user relation', () => {
      const listWithUser: DbListWithUser = {
        id: 'list123',
        userId: 'user123',
        name: 'My Army List',
        armyId: 'custodes',
        data: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          googleId: null,
          createdAt: new Date(),
        },
      };

      expect(listWithUser.user.id).toBe('user123');
      expect(listWithUser.user.email).toBe('test@example.com');
    });
  });

  describe('CreateUserInput type', () => {
    it('requires email only', () => {
      const input: CreateUserInput = {
        email: 'test@example.com',
      };

      expect(input.email).toBe('test@example.com');
      expect(input.name).toBeUndefined();
      expect(input.googleId).toBeUndefined();
    });

    it('allows optional fields', () => {
      const input: CreateUserInput = {
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google-id-123',
      };

      expect(input.name).toBe('Test User');
      expect(input.googleId).toBe('google-id-123');
    });
  });

  describe('CreateListInput type', () => {
    it('requires all fields with data as CurrentList', () => {
      const input: CreateListInput = {
        userId: 'user123',
        name: 'My List',
        armyId: 'custodes',
        data: {
          name: 'My List',
          army: 'custodes',
          pointsLimit: 500,
          format: 'colosseum',
          detachment: 'shield_host',
          units: [],
        },
      };

      expect(input.userId).toBe('user123');
      expect(input.name).toBe('My List');
      expect(input.armyId).toBe('custodes');
      expect(input.data.format).toBe('colosseum');
    });
  });

  describe('UpdateListInput type', () => {
    it('allows partial updates', () => {
      const input: UpdateListInput = {
        name: 'Updated Name',
      };

      expect(input.name).toBe('Updated Name');
      expect(input.armyId).toBeUndefined();
      expect(input.data).toBeUndefined();
    });

    it('allows updating data', () => {
      const input: UpdateListInput = {
        data: {
          name: 'Updated List',
          army: 'tyranids',
          pointsLimit: 1000,
          format: 'standard',
          detachment: 'invasion_fleet',
          units: [],
        },
      };

      expect(input.data?.army).toBe('tyranids');
    });
  });
});

describe('Database Schema Design', () => {
  it('supports companion app architecture', () => {
    // Schema is designed to support future companion apps sharing users
    // - User table has googleId for SSO across apps
    // - List table has armyId for filtering by faction
    // - Data is stored as JSON for flexibility

    const user: DbUser = {
      id: 'shared-user-id',
      email: 'player@example.com',
      name: 'Player One',
      googleId: 'google-123', // Same Google ID across all apps
      createdAt: new Date(),
    };

    const listFromArmyTracker: DbList = {
      id: 'list-1',
      userId: user.id,
      name: 'Tournament List',
      armyId: 'custodes',
      data: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Same user can have lists in companion apps
    expect(listFromArmyTracker.userId).toBe(user.id);
    expect(user.googleId).toBe('google-123');
  });

  it('supports multiple armies per user', () => {
    const userId = 'user-123';

    const custodesLists: DbList[] = [
      {
        id: 'list-1',
        userId,
        name: 'Custodes 500pt',
        armyId: 'custodes',
        data: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'list-2',
        userId,
        name: 'Custodes 1000pt',
        armyId: 'custodes',
        data: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const tyranidsList: DbList = {
      id: 'list-3',
      userId,
      name: 'Tyranids Horde',
      armyId: 'tyranids',
      data: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // User can have multiple lists for same army
    expect(custodesLists.filter(l => l.armyId === 'custodes')).toHaveLength(2);

    // User can have lists for different armies
    expect(tyranidsList.armyId).toBe('tyranids');
  });
});
