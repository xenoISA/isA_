import { useCallback, useEffect, useState } from 'react';

import {
  buildDesignSystemProfile,
  extractDesignSystemProfile,
  loadDesignSystemProfile,
  saveDesignSystemProfile,
  type BrandExtractionInput,
  type DesignSystemProfile,
  type SaveDesignSystemProfileResult,
} from '../api/designSystemProfileService';

export interface UseDesignSystemProfileResult {
  profile: DesignSystemProfile | null;
  isLoading: boolean;
  isExtracting: boolean;
  isSaving: boolean;
  error: string | null;
  extractProfile: (input: BrandExtractionInput) => Promise<DesignSystemProfile>;
  saveProfile: (profile: DesignSystemProfile) => Promise<SaveDesignSystemProfileResult>;
  skipOnboarding: () => Promise<SaveDesignSystemProfileResult>;
}

export function useDesignSystemProfile(enabled = true): UseDesignSystemProfileResult {
  const [profile, setProfile] = useState<DesignSystemProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const loadedProfile = await loadDesignSystemProfile();
        if (!cancelled) setProfile(loadedProfile);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load design profile.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const extractProfile = useCallback(async (input: BrandExtractionInput) => {
    setIsExtracting(true);
    setError(null);
    try {
      const extractedProfile = await extractDesignSystemProfile(input);
      return extractedProfile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract brand tokens.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const saveProfile = useCallback(async (nextProfile: DesignSystemProfile) => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await saveDesignSystemProfile(nextProfile);
      setProfile(nextProfile);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save design profile.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const skipOnboarding = useCallback(async () => {
    const defaultProfile = buildDesignSystemProfile({
      source: 'defaults',
      skipped: true,
    });
    return saveProfile(defaultProfile);
  }, [saveProfile]);

  return {
    profile,
    isLoading,
    isExtracting,
    isSaving,
    error,
    extractProfile,
    saveProfile,
    skipOnboarding,
  };
}
