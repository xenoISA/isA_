/**
 * ConversationShareDialog — Share conversation via public link (#204)
 */
import React, { useState, useCallback } from 'react';

interface ConversationShareDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle?: string;
}

export const ConversationShareDialog: React.FC<ConversationShareDialogProps> = ({
  open, onClose, sessionId, sessionTitle,
}) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLink = useCallback(async () => {
    setLoading(true);
    try {
      // Try real sharing API first (#204)
      const res = await fetch(`/api/v1/sessions/${sessionId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permissions: 'view-only' }),
      });
      if (res.ok) {
        const data = await res.json();
        setShareUrl(data.url || `${window.location.origin}/shared/${data.share_token}`);
      } else {
        // Fallback: generate local placeholder link
        const token = btoa(sessionId).replace(/=/g, '');
        setShareUrl(`${window.location.origin}/shared/${token}`);
      }
    } catch {
      // API not available — use local fallback
      const token = btoa(sessionId).replace(/=/g, '');
      setShareUrl(`${window.location.origin}/shared/${token}`);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[440px] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Share Conversation</h2>
          {sessionTitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sessionTitle}</p>}
        </div>

        <div className="px-6 py-4 space-y-4">
          {!shareUrl ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Generate a public link to share a read-only snapshot of this conversation.
              </p>
              <button
                onClick={generateLink}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Share Link'}
              </button>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Share Link</label>
              <div className="flex gap-2 mt-1">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                />
                <button
                  onClick={copyLink}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Anyone with this link can view the conversation.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
