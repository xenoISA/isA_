import { beforeEach, describe, expect, test } from 'vitest';
import { ExternalUser } from '../../types/userTypes';
import { useUserStore } from '../useUserStore';

const createUser = (credits: number): ExternalUser => ({
  auth0_id: 'auth0|user-1',
  email: 'user@example.com',
  name: 'Test User',
  credits,
  credits_total: 100,
  plan: 'pro',
  is_active: true,
});

describe('useUserStore optimistic credit consumption', () => {
  beforeEach(() => {
    useUserStore.getState().clearUserState();
  });

  test('restores credits when an optimistic deduction is reverted', () => {
    useUserStore.getState().setExternalUser(createUser(10));

    const pendingId = useUserStore.getState().consumeCreditsOptimistic({
      amount: 2,
      reason: 'chat.send',
    });

    expect(useUserStore.getState().externalUser?.credits).toBe(8);

    useUserStore.getState().revertCreditsOptimistic(pendingId);

    expect(useUserStore.getState().externalUser?.credits).toBe(10);
  });

  test('keeps the deducted credits after backend confirmation and clears the pending rollback', () => {
    useUserStore.getState().setExternalUser(createUser(10));

    const pendingId = useUserStore.getState().consumeCreditsOptimistic({
      amount: 2,
      reason: 'chat.send',
    });

    useUserStore.getState().confirmCreditConsumption(pendingId);
    useUserStore.getState().revertCreditsOptimistic(pendingId);

    expect(useUserStore.getState().externalUser?.credits).toBe(8);
  });

  test('tracks multiple in-flight deductions independently', () => {
    useUserStore.getState().setExternalUser(createUser(10));

    const firstPendingId = useUserStore.getState().consumeCreditsOptimistic({
      amount: 1,
      reason: 'chat.first',
    });
    const secondPendingId = useUserStore.getState().consumeCreditsOptimistic({
      amount: 1,
      reason: 'chat.second',
    });

    expect(firstPendingId).not.toBe(secondPendingId);
    expect(useUserStore.getState().externalUser?.credits).toBe(8);

    useUserStore.getState().confirmCreditConsumption(firstPendingId);
    useUserStore.getState().revertCreditsOptimistic(secondPendingId);

    expect(useUserStore.getState().externalUser?.credits).toBe(9);
  });
});
