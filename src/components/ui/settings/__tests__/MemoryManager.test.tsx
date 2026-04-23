import { describe, expect, test } from 'vitest';

import { groupMemoriesByType, resolveMemoryUserId } from '../MemoryManager';
import type { UserMemory } from '../../../../api/memoryService';

function memory(id: string, type: UserMemory['type']): UserMemory {
  return {
    id,
    type,
    content: `${type} memory`,
    raw: {},
  };
}

describe('MemoryManager helpers', () => {
  test('resolves the authenticated memory user id from supported auth shapes', () => {
    expect(resolveMemoryUserId({ sub: 'auth0|abc' })).toBe('auth0|abc');
    expect(resolveMemoryUserId({ auth0_id: 'auth0|legacy' })).toBe('auth0|legacy');
    expect(resolveMemoryUserId({ user_id: 'usr-1' })).toBe('usr-1');
    expect(resolveMemoryUserId({ id: 'fallback-id' })).toBe('fallback-id');
    expect(resolveMemoryUserId({ sub: '   ' })).toBeNull();
    expect(resolveMemoryUserId(null)).toBeNull();
  });

  test('groups every supported memory type for settings display', () => {
    const grouped = groupMemoriesByType([
      memory('fact-1', 'factual'),
      memory('fact-2', 'factual'),
      memory('work-1', 'working'),
    ]);

    expect(grouped.factual).toHaveLength(2);
    expect(grouped.episodic).toHaveLength(0);
    expect(grouped.semantic).toHaveLength(0);
    expect(grouped.procedural).toHaveLength(0);
    expect(grouped.working).toHaveLength(1);
  });
});
