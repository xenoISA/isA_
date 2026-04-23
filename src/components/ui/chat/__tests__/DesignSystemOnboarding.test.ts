import { describe, expect, test, vi } from 'vitest';

import { buildManualDesignSystemProfile } from '../DesignSystemOnboarding';

describe('DesignSystemOnboarding helpers', () => {
  test('builds a manual design profile from editable onboarding fields', () => {
    vi.setSystemTime(new Date('2026-04-23T08:00:00.000Z'));

    const profile = buildManualDesignSystemProfile({
      primary: '#101828',
      secondary: '#667085',
      accent: '#f97316',
      heading: 'Fraunces',
      body: 'DM Sans',
      radius: '18px',
      notes: 'Editorial, warm, confident.',
    });

    expect(profile.source).toBe('manual');
    expect(profile.sourceValue).toBe('manual-notes');
    expect(profile.completedAt).toBe('2026-04-23T08:00:00.000Z');
    expect(profile.tokens.colors.primary).toBe('#101828');
    expect(profile.tokens.colors.accent).toBe('#f97316');
    expect(profile.tokens.typography.heading).toBe('Fraunces');
    expect(profile.tokens.radii.lg).toBe('18px');
  });
});
