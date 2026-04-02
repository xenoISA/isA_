/**
 * ============================================================================
 * CompanionOnboarding — Conversational onboarding where Mate introduces itself
 * ============================================================================
 *
 * A multi-step conversational flow that feels like chatting with Mate rather
 * than filling out a settings form. Each step renders as a Mate message bubble
 * with an input or option buttons below.
 *
 * Steps:
 *  1. Mate introduces itself
 *  2. Mate asks your name
 *  3. Mate asks about interests / current work
 *  4. Mate asks about communication preferences
 *  5. Mate confirms and offers to get started
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingData {
  name: string;
  interests: string;
  preference: string;
}

interface CompanionOnboardingProps {
  /** Called when the user finishes (or skips) onboarding */
  onComplete: (data?: OnboardingData) => void;
  className?: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// Step copy — kept here so the component stays self-contained
// ---------------------------------------------------------------------------

const STEP_MESSAGES: Record<Step, string | ((data: OnboardingData) => string)> = {
  1: "Hey! I'm Mate, your personal AI companion. I'm here to help you with anything \u2014 from coding to scheduling to creative work.",
  2: 'What should I call you?',
  3: "What are you working on these days? (I'll remember so I can help better)",
  4: 'Any preferences for how we work together? Some people like brief answers, others like detail.',
  5: (data) =>
    `Great, ${data.name || 'friend'}! I'll remember all of this. Ready to get started?`,
};

const PREFERENCE_OPTIONS = ['Brief & direct', 'Detailed & thorough', 'Somewhere in between'];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Mate message bubble — gradient avatar + message text */
const MateBubble: React.FC<{ text: string; animate?: boolean }> = ({ text, animate = false }) => (
  <div
    className={`flex items-start gap-3 max-w-lg transition-opacity duration-500 ${
      animate ? 'animate-fade-in' : ''
    }`}
  >
    {/* Avatar */}
    <div
      className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7c8cf5] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold font-display shadow-lg shadow-[#7c8cf5]/20 flex-shrink-0"
    >
      M
    </div>
    {/* Bubble */}
    <div
      className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed font-display"
      style={{
        background: 'var(--color-neutral-800)',
        border: '1px solid rgba(255,255,255,0.06)',
        color: 'var(--text-primary)',
      }}
    >
      {text}
    </div>
  </div>
);

/** User response bubble — right-aligned, accent-tinted */
const UserBubble: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex justify-end">
    <div
      className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed font-display max-w-xs"
      style={{
        background: 'rgba(124,140,245,0.15)',
        border: '1px solid rgba(124,140,245,0.2)',
        color: 'var(--text-primary)',
      }}
    >
      {text}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const CompanionOnboarding: React.FC<CompanionOnboardingProps> = ({
  onComplete,
  className = '',
}) => {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<OnboardingData>({ name: '', interests: '', preference: '' });
  const [inputValue, setInputValue] = useState('');
  // Track which past steps should be shown (for conversation history)
  const [history, setHistory] = useState<{ step: Step; response?: string }[]>([{ step: 1 }]);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when step changes
  useEffect(() => {
    if (step === 2 || step === 3) {
      // Small delay to allow animation
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Scroll to bottom when history changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const advanceStep = useCallback(
    (response: string, nextStep: Step) => {
      setHistory((h) => [
        ...h.map((entry) =>
          entry.step === step && !entry.response ? { ...entry, response } : entry,
        ),
        { step: nextStep },
      ]);
      setStep(nextStep);
      setInputValue('');
    },
    [step],
  );

  // ---------------------------------------------------------------------------
  // Step handlers
  // ---------------------------------------------------------------------------

  const handleStep1Continue = useCallback(() => {
    advanceStep('', 2);
  }, [advanceStep]);

  const handleStep2Submit = useCallback(() => {
    const name = inputValue.trim() || 'friend';
    setData((d) => ({ ...d, name }));
    advanceStep(name, 3);
  }, [inputValue, advanceStep]);

  const handleStep3Submit = useCallback(() => {
    const interests = inputValue.trim();
    setData((d) => ({ ...d, interests }));
    advanceStep(interests || '(skipped)', 4);
  }, [inputValue, advanceStep]);

  const handleStep4Select = useCallback(
    (pref: string) => {
      setData((d) => ({ ...d, preference: pref }));
      advanceStep(pref, 5);
    },
    [advanceStep],
  );

  const handleStep5Finish = useCallback(() => {
    onComplete(data);
  }, [data, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // ---------------------------------------------------------------------------
  // Input submission (Enter key)
  // ---------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (step === 2) handleStep2Submit();
      else if (step === 3) handleStep3Submit();
    },
    [step, handleStep2Submit, handleStep3Submit],
  );

  // ---------------------------------------------------------------------------
  // Resolve step message text
  // ---------------------------------------------------------------------------

  const resolveMessage = (s: Step): string => {
    const msg = STEP_MESSAGES[s];
    return typeof msg === 'function' ? msg(data) : msg;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6 lg:px-8 py-8 md:py-16 ${className}`}
    >
      <div className="w-full max-w-lg mx-auto space-y-5">
        {/* Conversation history */}
        {history.map((entry, i) => (
          <React.Fragment key={`${entry.step}-${i}`}>
            <MateBubble text={resolveMessage(entry.step)} animate={i === history.length - 1} />
            {entry.response && entry.response !== '' && (
              <UserBubble text={entry.response} />
            )}
          </React.Fragment>
        ))}

        {/* Current step interaction */}
        <div className="mt-4 space-y-3">
          {/* Step 1 — Continue button */}
          {step === 1 && (
            <div className="flex items-center gap-2 pl-13">
              <button
                onClick={handleStep1Continue}
                className="px-5 py-2 rounded-full text-sm font-display font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                style={{
                  background: 'linear-gradient(135deg, #7c8cf5, #a78bfa)',
                  color: '#fff',
                }}
              >
                Hey Mate!
              </button>
            </div>
          )}

          {/* Step 2 — Name input */}
          {step === 2 && (
            <div className="flex items-center gap-2 pl-13">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Your name..."
                className="flex-1 px-4 py-2 rounded-full text-sm font-display focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{
                  background: 'var(--color-neutral-800)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={handleStep2Submit}
                className="px-4 py-2 rounded-full text-sm font-display font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                style={{
                  background: 'linear-gradient(135deg, #7c8cf5, #a78bfa)',
                  color: '#fff',
                }}
              >
                Send
              </button>
            </div>
          )}

          {/* Step 3 — Interests input */}
          {step === 3 && (
            <div className="flex items-center gap-2 pl-13">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. building a SaaS app, learning Rust..."
                className="flex-1 px-4 py-2 rounded-full text-sm font-display focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{
                  background: 'var(--color-neutral-800)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={handleStep3Submit}
                className="px-4 py-2 rounded-full text-sm font-display font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                style={{
                  background: 'linear-gradient(135deg, #7c8cf5, #a78bfa)',
                  color: '#fff',
                }}
              >
                Send
              </button>
            </div>
          )}

          {/* Step 4 — Preference option buttons */}
          {step === 4 && (
            <div className="flex flex-wrap gap-2 pl-13">
              {PREFERENCE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleStep4Select(opt)}
                  className="px-4 py-2 rounded-full text-sm font-display cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  style={{
                    background: 'var(--color-neutral-800)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(124,140,245,0.4)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Step 5 — Let's go button */}
          {step === 5 && (
            <div className="flex items-center gap-2 pl-13">
              <button
                onClick={handleStep5Finish}
                className="px-5 py-2 rounded-full text-sm font-display font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                style={{
                  background: 'linear-gradient(135deg, #7c8cf5, #a78bfa)',
                  color: '#fff',
                }}
              >
                Let's go!
              </button>
            </div>
          )}
        </div>

        {/* Skip button — always visible */}
        <div className="pt-4 pl-13">
          <button
            onClick={handleSkip}
            className="text-xs font-display cursor-pointer transition-colors duration-150 focus-visible:outline-none"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            Skip for now
          </button>
        </div>

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
