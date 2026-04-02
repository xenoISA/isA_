/**
 * ============================================================================
 * Onboarding State Hook (useOnboardingState.ts)
 * ============================================================================
 *
 * Manages first-time user onboarding state via localStorage.
 * Returns whether the user is new (has not completed onboarding),
 * plus helpers to complete or reset the onboarding flow.
 */

import { useState, useCallback, useEffect } from 'react';

const ONBOARDING_KEY = 'mate_onboarding_complete';

export interface OnboardingState {
  /** True when the user has NOT completed onboarding yet */
  isNewUser: boolean;
  /** Mark onboarding as finished — hides the flow permanently */
  completeOnboarding: () => void;
  /** Reset onboarding — useful from settings to replay the flow */
  resetOnboarding: () => void;
}

export const useOnboardingState = (): OnboardingState => {
  const [isNewUser, setIsNewUser] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ONBOARDING_KEY) !== 'true';
  });

  // Sync with localStorage on mount (handles SSR hydration)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(ONBOARDING_KEY);
    setIsNewUser(stored !== 'true');
  }, []);

  const completeOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
    setIsNewUser(false);
  }, []);

  const resetOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ONBOARDING_KEY);
    }
    setIsNewUser(true);
  }, []);

  return { isNewUser, completeOnboarding, resetOnboarding };
};
