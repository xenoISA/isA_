import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Spotlight page — loaded inside the Electron spotlight window.
 * A minimal floating chat input for quick Mate interactions.
 */
export default function SpotlightPage() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Resize the spotlight window when response appears
  useEffect(() => {
    if (!electronAPI) return;
    const height = response ? 280 : 72;
    electronAPI.send('spotlight:resize', height);
  }, [response, electronAPI]);

  // Escape to hide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        electronAPI?.send('spotlight:hide');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [electronAPI]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setResponse('');

    try {
      // Use the gateway endpoint directly for a quick response
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:9080';
      const res = await fetch(`${gatewayUrl}/api/v1/mate/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim(), quick: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setResponse(data.response || data.content || 'No response');
      } else {
        setResponse('Could not reach Mate. Is the backend running?');
      }
    } catch {
      setResponse('Could not connect. Make sure the isA_ backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const handleOpenMain = () => {
    electronAPI?.send('spotlight:open-main');
  };

  return (
    <div
      ref={containerRef}
      style={{
        background: 'transparent',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        WebkitAppRegion: 'no-drag' as any,
      }}
    >
      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'rgba(20, 20, 24, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        <span style={{ fontSize: 18, opacity: 0.5 }}>✦</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Mate anything..."
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: '#e4e4e7',
            fontSize: 16,
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}
        />
        {isLoading && (
          <span style={{ fontSize: 12, color: '#71717a', animation: 'pulse 1.5s infinite' }}>
            thinking...
          </span>
        )}
      </form>

      {/* Response area */}
      {response && (
        <div
          style={{
            background: 'rgba(20, 20, 24, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 20px',
            marginTop: 8,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          <p style={{
            color: '#d4d4d8',
            fontSize: 14,
            lineHeight: 1.6,
            margin: 0,
            maxHeight: 140,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
          }}>
            {response}
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 12,
            gap: 8,
          }}>
            <button
              onClick={handleOpenMain}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#a1a1aa',
                fontSize: 12,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              Open in isA_ →
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: transparent !important; overflow: hidden; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
