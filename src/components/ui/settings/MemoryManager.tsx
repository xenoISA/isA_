import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  filterMemories,
  memoryService,
  MEMORY_TYPES,
  type MemoryType,
  type UserMemory,
} from '../../../api/memoryService';
import { useAuth } from '../../../hooks/useAuth';

const TYPE_LABELS: Record<MemoryType, string> = {
  factual: 'Facts',
  episodic: 'Episodes',
  semantic: 'Knowledge',
  procedural: 'How-to',
  working: 'Active',
};

const TYPE_DESCRIPTIONS: Record<MemoryType, string> = {
  factual: 'Stable facts Mate has learned about you.',
  episodic: 'Events and interactions from past sessions.',
  semantic: 'Concepts, definitions, and domain knowledge.',
  procedural: 'Steps, workflows, and preferred processes.',
  working: 'Short-term context currently being used.',
};

const TYPE_COLORS: Record<MemoryType, string> = {
  factual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  episodic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  semantic: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  procedural: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  working: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

type GroupedMemories = Record<MemoryType, UserMemory[]>;

export function resolveMemoryUserId(authUser: unknown): string | null {
  if (!authUser || typeof authUser !== 'object') return null;

  const record = authUser as Record<string, unknown>;
  const candidate = record.sub ?? record.auth0_id ?? record.user_id ?? record.id;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

export function groupMemoriesByType(memories: UserMemory[]): GroupedMemories {
  return MEMORY_TYPES.reduce<GroupedMemories>((groups, type) => {
    groups[type] = memories.filter((memory) => memory.type === type);
    return groups;
  }, {
    factual: [],
    episodic: [],
    semantic: [],
    procedural: [],
    working: [],
  });
}

function formatMemoryDate(value?: string): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const MemoryManager: React.FC = () => {
  const { authUser, isLoading: authLoading } = useAuth();
  const userId = resolveMemoryUserId(authUser);

  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMemories = async () => {
      if (authLoading) return;

      if (!userId) {
        setMemories([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextMemories = await memoryService.listMemories({ userId });
        if (!cancelled) setMemories(nextMemories);
      } catch (loadError) {
        if (!cancelled) {
          setError(getErrorMessage(loadError, 'Failed to load memories'));
          setMemories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadMemories();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  const filtered = useMemo(() => filterMemories(memories, search), [memories, search]);
  const grouped = useMemo(() => groupMemoriesByType(filtered), [filtered]);
  const allGrouped = useMemo(() => groupMemoriesByType(memories), [memories]);

  const startEditing = useCallback((memory: UserMemory) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
    setError(null);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditContent('');
  }, []);

  const handleDelete = useCallback(async (memory: UserMemory) => {
    if (!userId) return;

    setDeletingId(memory.id);
    setError(null);

    try {
      await memoryService.deleteMemory({
        userId,
        memoryId: memory.id,
        type: memory.type,
      });
      setMemories(prev => prev.filter(item => item.id !== memory.id));
      if (editingId === memory.id) cancelEditing();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Failed to delete memory'));
    } finally {
      setDeletingId(null);
    }
  }, [cancelEditing, editingId, userId]);

  const handleSaveEdit = useCallback(async (memory: UserMemory) => {
    if (!userId) return;

    const nextContent = editContent.trim();
    if (!nextContent) {
      setError('Memory content cannot be empty.');
      return;
    }

    setSavingId(memory.id);
    setError(null);

    try {
      await memoryService.updateMemory({
        userId,
        memoryId: memory.id,
        type: memory.type,
        content: nextContent,
      });
      setMemories(prev => prev.map(item => (
        item.id === memory.id
          ? { ...item, content: nextContent, updated_at: new Date().toISOString() }
          : item
      )));
      cancelEditing();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Failed to update memory'));
    } finally {
      setSavingId(null);
    }
  }, [cancelEditing, editContent, userId]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Memory</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Things Mate remembers about you. You can edit or remove any memory.
        </p>
      </div>

      {!authLoading && !userId ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center dark:border-gray-700 dark:bg-white/5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Sign in to manage memories</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Memory records are scoped to your authenticated user id.
          </p>
        </div>
      ) : null}

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search memories..."
        disabled={!userId || loading}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {userId ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {MEMORY_TYPES.map((type) => (
            <div key={type} className="rounded-xl border border-gray-100 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-900/40">
              <div className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_COLORS[type]}`}>
                {TYPE_LABELS[type]}
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {allGrouped[type].length}
              </div>
              <div className="truncate text-[11px] text-gray-400">{type}</div>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {authLoading || loading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading memories...</div>
      ) : userId && memories.length === 0 ? (
        <div className="py-12 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-200 dark:text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">No memories yet</p>
          <p className="text-xs text-gray-400 mt-1">Mate will learn about you through conversations</p>
        </div>
      ) : userId && filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">No memories match "{search}".</div>
      ) : userId ? (
        MEMORY_TYPES.map((type) => {
          const mems = grouped[type];
          if (mems.length === 0) return null;

          return (
            <div key={type}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type]}`}>
                  {TYPE_LABELS[type]}
                </span>
                <span className="text-xs text-gray-400">{mems.length}</span>
                <span className="hidden text-xs text-gray-400 sm:inline">{TYPE_DESCRIPTIONS[type]}</span>
              </div>
              <div className="space-y-2">
                {mems.map((memory) => {
                  const isEditing = editingId === memory.id;
                  const isSaving = savingId === memory.id;
                  const isDeleting = deletingId === memory.id;
                  const createdAt = formatMemoryDate(memory.created_at ?? memory.updated_at);

                  return (
                    <div key={memory.id} className="group rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-gray-100 hover:bg-gray-50 dark:hover:border-white/10 dark:hover:bg-white/5">
                      {isEditing ? (
                        <div>
                          <textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            className="w-full resize-none rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            rows={3}
                          />
                          <div className="mt-2 flex gap-1">
                            <button
                              onClick={() => void handleSaveEdit(memory)}
                              disabled={isSaving}
                              className="rounded bg-blue-500 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{memory.content}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                              <span>{memory.type}</span>
                              {createdAt ? <span>{createdAt}</span> : null}
                              {memory.tags?.map((tag) => (
                                <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                            <button
                              onClick={() => startEditing(memory)}
                              disabled={isDeleting}
                              className="p-1 text-gray-400 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Edit"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              onClick={() => void handleDelete(memory)}
                              disabled={isDeleting}
                              className="p-1 text-gray-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Delete"
                            >
                              {isDeleting ? (
                                <span className="text-[11px]">...</span>
                              ) : (
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : null}
    </div>
  );
};
