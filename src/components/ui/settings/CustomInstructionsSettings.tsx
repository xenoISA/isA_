/**
 * CustomInstructionsSettings — Profile-level custom instructions editor (#197)
 *
 * Connects to PUT/GET /api/v1/users/me/instructions (isA_user #260).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { GATEWAY_ENDPOINTS } from '../../../config/gatewayConfig';
import { useCustomInstructionsStore } from '../../../stores/useCustomInstructionsStore';

const MAX_CHARS = 4000;

export const CustomInstructionsSettings: React.FC = () => {
  const [instructions, setInstructions] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { setInstructions: cacheInstructions } = useCustomInstructionsStore();

  // Fetch current instructions
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${GATEWAY_ENDPOINTS.ACCOUNTS.BASE}/../users/me/instructions`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.instructions || '';
          setInstructions(text);
          setSaved(text);
          cacheInstructions(text);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [cacheInstructions]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${GATEWAY_ENDPOINTS.ACCOUNTS.BASE}/../users/me/instructions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ instructions }),
      });
      if (res.ok) {
        setSaved(instructions);
        cacheInstructions(instructions);
        setMessage({ type: 'success', text: 'Custom instructions saved' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.detail || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }, [instructions]);

  const hasChanges = instructions !== saved;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Custom Instructions</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Tell Mate about yourself and how you'd like it to respond. These instructions apply to all conversations.
        </p>
      </div>

      {loading ? (
        <div className="h-32 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse bg-gray-50 dark:bg-gray-800" />
      ) : (
        <>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value.slice(0, MAX_CHARS))}
            placeholder="e.g., I'm a software engineer working on a TypeScript monorepo. I prefer concise responses with code examples..."
            className="w-full min-h-[160px] p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={6}
          />

          <div className="flex items-center justify-between">
            <span className={`text-xs ${instructions.length >= MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
              {instructions.length}/{MAX_CHARS}
            </span>

            <div className="flex items-center gap-3">
              {message && (
                <span className={`text-sm ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {message.text}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
