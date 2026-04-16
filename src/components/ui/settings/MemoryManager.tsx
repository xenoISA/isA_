/**
 * MemoryManager — View, edit, delete memories in settings (#203)
 * Connects to isA_OS memory CRUD API (#386).
 */
import React, { useState, useEffect, useCallback } from 'react';

interface Memory {
  id: string;
  type: 'factual' | 'episodic' | 'semantic' | 'procedural' | 'working';
  content: string;
  created_at?: string;
}

const TYPE_LABELS: Record<string, string> = {
  factual: 'Facts', episodic: 'Episodes', semantic: 'Knowledge',
  procedural: 'How-to', working: 'Active',
};

const TYPE_COLORS: Record<string, string> = {
  factual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  episodic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  semantic: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  procedural: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  working: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export const MemoryManager: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    // Fetch memories from API (placeholder — will connect to #386 when ready)
    setLoading(false);
  }, []);

  const filtered = memories.filter(m =>
    !search || m.content.toLowerCase().includes(search.toLowerCase()) || m.type.includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Memory[]>>((acc, m) => {
    (acc[m.type] ??= []).push(m);
    return acc;
  }, {});

  const handleDelete = useCallback((id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleSaveEdit = useCallback((id: string) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, content: editContent } : m));
    setEditingId(null);
  }, [editContent]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Memory</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Things Mate remembers about you. You can edit or remove any memory.
        </p>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search memories..."
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading memories...</div>
      ) : memories.length === 0 ? (
        <div className="py-12 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-200 dark:text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">No memories yet</p>
          <p className="text-xs text-gray-400 mt-1">Mate will learn about you through conversations</p>
        </div>
      ) : (
        Object.entries(grouped).map(([type, mems]) => (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[type] || TYPE_COLORS.working}`}>
                {TYPE_LABELS[type] || type}
              </span>
              <span className="text-xs text-gray-400">{mems.length}</span>
            </div>
            <div className="space-y-2">
              {mems.map(m => (
                <div key={m.id} className="group flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  {editingId === m.id ? (
                    <div className="flex-1">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full p-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={2}
                      />
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => handleSaveEdit(m.id)} className="text-xs px-2 py-1 bg-blue-500 text-white rounded">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">{m.content}</p>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button onClick={() => { setEditingId(m.id); setEditContent(m.content); }} className="p-1 text-gray-400 hover:text-blue-500" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="p-1 text-gray-400 hover:text-red-500" title="Delete">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
