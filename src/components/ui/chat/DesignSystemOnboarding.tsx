import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  buildDesignSystemProfile,
  normalizeDesignTokens,
  type BrandExtractionInput,
  type DesignSystemProfile,
} from '../../../api/designSystemProfileService';

interface ManualTokenState {
  primary: string;
  secondary: string;
  accent: string;
  heading: string;
  body: string;
  radius: string;
  notes: string;
}

export interface DesignSystemOnboardingProps {
  open: boolean;
  profile: DesignSystemProfile | null;
  isExtracting?: boolean;
  isSaving?: boolean;
  error?: string | null;
  onExtract: (input: BrandExtractionInput) => Promise<DesignSystemProfile>;
  onSave: (profile: DesignSystemProfile) => Promise<unknown>;
  onSkip: () => Promise<unknown>;
}

const DEFAULT_MANUAL_STATE: ManualTokenState = {
  primary: '#111111',
  secondary: '#525252',
  accent: '#f59e0b',
  heading: 'DM Sans',
  body: 'DM Sans',
  radius: '16px',
  notes: '',
};

export function buildManualDesignSystemProfile(manual: ManualTokenState): DesignSystemProfile {
  return buildDesignSystemProfile({
    source: 'manual',
    sourceValue: manual.notes.trim() ? 'manual-notes' : 'manual',
    tokens: normalizeDesignTokens({
      colors: {
        primary: manual.primary,
        secondary: manual.secondary,
        accent: manual.accent,
      },
      fonts: {
        heading: manual.heading,
        body: manual.body,
      },
      borderRadius: manual.radius,
      notes: manual.notes,
    }),
  });
}

const TokenPreview: React.FC<{ profile: DesignSystemProfile }> = ({ profile }) => {
  const { tokens } = profile;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Primary', tokens.colors.primary],
          ['Secondary', tokens.colors.secondary],
          ['Accent', tokens.colors.accent],
        ].map(([label, color]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <div
              className="mb-2 h-12 rounded-lg border border-white/10"
              style={{ background: color }}
            />
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">{label}</div>
            <div className="text-xs text-white/80">{color}</div>
          </div>
        ))}
      </div>

      <div
        className="overflow-hidden rounded-2xl border p-4"
        style={{
          background: tokens.colors.background,
          borderColor: tokens.colors.secondary,
          color: tokens.colors.text,
          borderRadius: tokens.radii.lg,
          fontFamily: tokens.typography.body,
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] opacity-60">Live sample</div>
            <h3
              className="mt-1 text-2xl font-semibold tracking-[-0.03em]"
              style={{ fontFamily: tokens.typography.heading }}
            >
              Launch brief
            </h3>
          </div>
          <div
            className="h-9 w-9 rounded-full"
            style={{ background: tokens.colors.accent }}
          />
        </div>
        <p className="max-w-[32ch] text-sm leading-6 opacity-75">
          Future Design mode outputs will borrow this color rhythm, radius, and type voice.
        </p>
        <button
          type="button"
          className="mt-5 rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            background: tokens.colors.accent,
            color: tokens.colors.background,
            borderRadius: tokens.radii.xl,
          }}
        >
          Generate with this system
        </button>
      </div>
    </div>
  );
};

export const DesignSystemOnboarding: React.FC<DesignSystemOnboardingProps> = ({
  open,
  profile,
  isExtracting = false,
  isSaving = false,
  error,
  onExtract,
  onSave,
  onSkip,
}) => {
  const [source, setSource] = useState<'url' | 'manual'>('url');
  const [url, setUrl] = useState('');
  const [manual, setManual] = useState<ManualTokenState>(DEFAULT_MANUAL_STATE);
  const [draftProfile, setDraftProfile] = useState<DesignSystemProfile | null>(profile);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraftProfile(profile);
    setLocalError(null);
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void onSkip().catch(() => {
          setLocalError('Could not skip setup. Try again.');
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onSkip]);

  const manualPreviewProfile = useMemo(() => buildManualDesignSystemProfile(manual), [manual]);
  const previewProfile = source === 'manual' ? manualPreviewProfile : draftProfile ?? manualPreviewProfile;

  const updateManual = useCallback((field: keyof ManualTokenState, value: string) => {
    setManual((current) => ({ ...current, [field]: value }));
  }, []);

  const handleExtract = useCallback(async () => {
    setLocalError(null);
    try {
      const extracted = await onExtract({ source: 'url', sourceValue: url });
      setDraftProfile(extracted);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not extract brand tokens.');
    }
  }, [onExtract, url]);

  const handleSave = useCallback(async () => {
    setLocalError(null);
    try {
      const nextProfile = source === 'manual'
        ? buildManualDesignSystemProfile(manual)
        : draftProfile ?? await onExtract({ source: 'url', sourceValue: url });
      await onSave(nextProfile);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not save the design system.');
    }
  }, [draftProfile, manual, onExtract, onSave, source, url]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      updateManual('notes', text.slice(0, 6000));
      setSource('manual');
    } catch {
      setLocalError('Could not read that brand file. Paste the guidance manually instead.');
    }
  }, [updateManual]);

  if (!open) return null;

  const message = localError || error;
  const busy = isExtracting || isSaving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="design-system-onboarding-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111] text-white shadow-2xl">
        <div className="hidden w-[32%] flex-col justify-between border-r border-white/10 bg-[#181818] p-8 md:flex">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
              Design mode setup
            </div>
            <h2
              id="design-system-onboarding-title"
              className="text-4xl font-semibold tracking-[-0.05em]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Teach Mate your visual language once.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/55">
              Share a brand source, adjust the tokens, and every future design request starts with
              a profile instead of a blank canvas.
            </p>
          </div>

          <div className="space-y-4 text-sm">
            {['Share source', 'Extract tokens', 'Confirm system'].map((label, index) => (
              <div key={label} className="flex items-center gap-3 text-white/65">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-xs">
                  {index + 1}
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="grid min-h-[640px] flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[1fr_360px]">
          <section className="space-y-6 p-5 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSource('url')}
                className={`rounded-full px-4 py-2 text-sm transition ${source === 'url' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
              >
                URL extraction
              </button>
              <button
                type="button"
                onClick={() => setSource('manual')}
                className={`rounded-full px-4 py-2 text-sm transition ${source === 'manual' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
              >
                Manual fallback
              </button>
            </div>

            {source === 'url' ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-white/75" htmlFor="brand-url">
                  Brand URL
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="brand-url"
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://yourbrand.com"
                    className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-amber-300/60"
                  />
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={busy}
                    className="min-h-12 rounded-2xl bg-amber-300 px-5 text-sm font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isExtracting ? 'Extracting...' : 'Extract tokens'}
                  </button>
                </div>
                <p className="text-xs leading-5 text-white/45">
                  Uses the Creative brand extraction route when configured, then falls back to a
                  deterministic local profile so first-run setup never blocks Design mode.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    ['Primary', 'primary'],
                    ['Secondary', 'secondary'],
                    ['Accent', 'accent'],
                  ].map(([label, field]) => (
                    <label key={field} className="space-y-2 text-sm text-white/70">
                      {label}
                      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
                        <input
                          type="color"
                          value={manual[field as keyof ManualTokenState]}
                          onChange={(event) => updateManual(field as keyof ManualTokenState, event.target.value)}
                          className="h-9 w-10 rounded border-0 bg-transparent"
                        />
                        <input
                          value={manual[field as keyof ManualTokenState]}
                          onChange={(event) => updateManual(field as keyof ManualTokenState, event.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none"
                        />
                      </div>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="space-y-2 text-sm text-white/70">
                    Heading font
                    <input
                      value={manual.heading}
                      onChange={(event) => updateManual('heading', event.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none focus:border-amber-300/60"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/70">
                    Body font
                    <input
                      value={manual.body}
                      onChange={(event) => updateManual('body', event.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none focus:border-amber-300/60"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/70">
                    Radius
                    <input
                      value={manual.radius}
                      onChange={(event) => updateManual('radius', event.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none focus:border-amber-300/60"
                    />
                  </label>
                </div>

                <label className="block space-y-2 text-sm text-white/70">
                  Brand notes or uploaded guidelines
                  <textarea
                    value={manual.notes}
                    onChange={(event) => updateManual('notes', event.target.value)}
                    placeholder="Paste tone, layout rules, typography notes, or component guidance..."
                    className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-amber-300/60"
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center rounded-full border border-dashed border-white/20 px-4 py-2 text-xs text-white/55 transition hover:border-amber-300/50 hover:text-amber-100">
                  Upload guidelines
                  <input
                    type="file"
                    accept=".txt,.md,.json,.css"
                    className="sr-only"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {message}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  void onSkip().catch(() => {
                    setLocalError('Could not skip setup. Try again.');
                  });
                }}
                disabled={busy}
                className="rounded-full px-4 py-2 text-sm text-white/45 transition hover:bg-white/5 hover:text-white/75 disabled:cursor-not-allowed"
              >
                Skip, use defaults
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save design system'}
              </button>
            </div>
          </section>

          <aside className="border-t border-white/10 bg-white/[0.03] p-5 md:border-l md:border-t-0 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">Preview</div>
                <div className="mt-1 text-sm text-white/70">
                  {previewProfile.source === 'url' ? previewProfile.sourceValue || 'URL source' : 'Manual profile'}
                </div>
              </div>
              {previewProfile.screenshotUrl && (
                <a
                  href={previewProfile.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-200 underline-offset-4 hover:underline"
                >
                  screenshot
                </a>
              )}
            </div>
            <TokenPreview profile={previewProfile} />
          </aside>
        </div>
      </div>
    </div>
  );
};
