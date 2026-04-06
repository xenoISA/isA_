/**
 * ============================================================================
 * UserPortal - User Profile & Settings Modal
 * ============================================================================
 */

import React, { useState } from 'react';
import { createLogger } from '../../../utils/logger';
import { useUserModule, PRICING_PLANS, formatCredits } from '../../../modules/UserModule';

const log = createLogger('UserPortal');
import { useContextModule } from '../../../modules/ContextModule';
import { useOrganizationModule } from '../../../modules/OrganizationModule';
import { useTranslation } from '../../../hooks/useTranslation';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { PlanType } from '../../../types/userTypes';
import { Modal } from '../../shared/ui/Modal';
import { Avatar } from '../../shared/ui/Avatar';
import { Button, PrimaryButton, SecondaryButton, DangerButton } from '../../shared/ui/Button';
import { buildConsoleEntryUrl } from '../../../config/authSessionConfig';
import CreateOrganizationModal, { CreateOrganizationData } from '../organization/CreateOrganizationModal';

interface UserPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'account' | 'billing' | 'usage' | 'organizations' | 'preferences';

const TAB_CONFIG: { id: TabId; icon: string }[] = [
  { id: 'account', icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z' },
  { id: 'billing', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z' },
  { id: 'usage', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z' },
  { id: 'organizations', icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z' },
  { id: 'preferences', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z' },
];

export const UserPortal: React.FC<UserPortalProps> = ({ isOpen, onClose }) => {
  const userModule = useUserModule();
  const contextModule = useContextModule();
  const organizationModule = useOrganizationModule();
  const { t } = useTranslation();
  const { currentLanguage, availableLanguages, setLanguage } = useLanguageStore();
  const [activeTab, setActiveTab] = useState<TabId>('account');
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  if (!userModule.isAuthenticated || !userModule.authUser) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Sign In Required" size="md">
        <div className="text-center py-6">
          <div className="size-14 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <svg className="size-6 text-white/40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
            </svg>
          </div>
          <p className="text-sm text-white/50 mb-6">Sign in to access your account settings.</p>
          <div className="flex gap-3 justify-center">
            <PrimaryButton onClick={() => { userModule.login(); onClose(); }}>Sign In</PrimaryButton>
            <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          </div>
        </div>
      </Modal>
    );
  }

  const user = userModule.authUser;
  const credits = userModule.credits;
  const totalCredits = userModule.totalCredits;
  const currentPlan = userModule.currentPlan;
  const usagePercentage = totalCredits > 0 ? Math.round(((totalCredits - credits) / totalCredits) * 100) : 0;

  const getPlanLabel = (plan: string) => {
    const map: Record<string, string> = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' };
    return map[plan] || plan;
  };

  const handleUpgrade = async (planType: PlanType) => {
    try {
      setUpgradingPlan(planType);
      const url = await userModule.createCheckout(planType);
      if (url) window.location.href = url;
    } catch (e) {
      log.error('Upgrade failed:', e);
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleLogout = () => { userModule.logout(); onClose(); };

  const handleOpenConsole = () => {
    const consoleUrl = buildConsoleEntryUrl({
      currentOrgId: contextModule.currentOrgId,
      returnTo: typeof window !== 'undefined' ? window.location.href : '',
      requestSso: true,
    });
    window.open(consoleUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCreateOrganization = async (data: CreateOrganizationData) => {
    setCreateLoading(true);
    setCreateError(null);
    try {
      await organizationModule.createOrganization(data);
      setShowCreateOrgModal(false);
      await contextModule.refreshContext();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create organization');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Tab content ──────────────────────────────────────────────────────

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="space-y-5">
            <Section title={t('user.accountInformation')}>
              <dl className="space-y-3">
                <InfoRow label={t('user.userId')} value={user.sub || 'N/A'} mono />
                <InfoRow label={t('user.email')} value={user.email || 'N/A'} />
                <InfoRow label={t('user.name')} value={user.name || 'N/A'} />
                <InfoRow label={t('user.plan')} value={getPlanLabel(currentPlan)} />
                <InfoRow label="Context" value={contextModule.currentOrgId || user.sub || 'N/A'} mono />
              </dl>
            </Section>

            <div className="space-y-2">
              <ActionButton onClick={handleOpenConsole} label="Open Developer Console" icon="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              <ActionButton onClick={() => userModule.refreshUser()} label={userModule.isLoading ? t('user.refreshing') : t('user.refreshAccountData')} disabled={userModule.isLoading} icon="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              <DangerButton onClick={handleLogout} fullWidth icon={
                <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
              }>
                {t('user.signOut')}
              </DangerButton>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-5">
            <Section title="Current Plan">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">{getPlanLabel(currentPlan)}</span>
                <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider bg-white/[0.06] px-2.5 py-1 rounded-full">Active</span>
              </div>
              <p className="text-sm text-white/40 mt-1.5">
                {currentPlan === 'free' ? 'Limited credits with basic features' : 'Premium features with enhanced credits'}
              </p>
            </Section>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/60">Available Plans</h4>
              {PRICING_PLANS.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                const canUpgrade = plan.id !== 'free' && !isCurrent;
                return (
                  <div key={plan.id} className={`p-4 rounded-xl border transition-colors ${isCurrent ? 'border-white/15 bg-white/[0.04]' : 'border-white/[0.06] hover:border-white/10'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{plan.name}</div>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl font-bold text-white tabular-nums">${plan.price}</span>
                          {plan.price > 0 && <span className="text-xs text-white/35">/mo</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white/80 tabular-nums">{plan.credits.toLocaleString()}</div>
                        <div className="text-[11px] text-white/35">credits</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => canUpgrade ? handleUpgrade(plan.id) : undefined}
                      disabled={!canUpgrade || upgradingPlan === plan.id}
                      loading={upgradingPlan === plan.id}
                      fullWidth
                      variant={isCurrent ? 'success' : canUpgrade ? 'primary' : 'ghost'}
                    >
                      {isCurrent ? 'Current Plan' : canUpgrade ? `Upgrade - $${plan.price}/mo` : 'Downgrade'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'usage':
        return (
          <div className="space-y-5">
            <Section title="Usage Statistics">
              <dl className="space-y-3">
                <InfoRow label="Credits Used" value={formatCredits(totalCredits - credits)} />
                <InfoRow label="Credits Remaining" value={formatCredits(credits)} valueClass={credits > 1000 ? 'text-emerald-400' : credits > 100 ? 'text-amber-400' : 'text-red-400'} />
                <InfoRow label="Usage Rate" value={`${usagePercentage}%`} />
              </dl>
              <div className="mt-5">
                <div className="flex justify-between text-[11px] text-white/35 mb-1.5">
                  <span>Usage</span>
                  <span className="tabular-nums">{usagePercentage}%</span>
                </div>
                <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                  <div
                    className="bg-white/40 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
              </div>
              {!userModule.hasCredits && (
                <div className="mt-4 p-3 bg-red-500/[0.08] border border-red-500/15 rounded-lg">
                  <p className="text-red-300 text-sm font-medium">No credits remaining</p>
                  <p className="text-red-300/60 text-xs mt-0.5">Upgrade your plan to continue using AI features</p>
                </div>
              )}
            </Section>
          </div>
        );

      case 'organizations':
        return (
          <div className="space-y-5">
            <Section title="Current Context">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`size-2 rounded-full ${contextModule.contextType === 'organization' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {contextModule.contextType === 'organization' ? 'Organization' : 'Personal'}
                    </div>
                    {contextModule.currentContext?.type === 'organization' && (
                      <div className="text-xs text-white/40">
                        {contextModule.currentContext.organization.name} · {contextModule.currentContext.organization.role}
                      </div>
                    )}
                  </div>
                </div>
                {contextModule.contextType === 'organization' && (
                  <Button onClick={() => contextModule.switchToPersonal()} variant="ghost" size="sm">Switch to Personal</Button>
                )}
              </div>
            </Section>

            <Section
              title="Your Organizations"
              action={
                <Button onClick={() => setShowCreateOrgModal(true)} variant="ghost" size="sm" icon={
                  <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                }>New</Button>
              }
            >
              {contextModule.availableOrganizations.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-white/40">No organizations yet.</p>
                  <p className="text-xs text-white/25 mt-1">Create one to collaborate with your team.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contextModule.availableOrganizations.map((org: any) => (
                    <div key={org.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 bg-amber-600 rounded-md flex items-center justify-center text-white text-xs font-semibold">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{org.name}</div>
                          <div className="text-xs text-white/35">{org.role} · {org.plan} · {org.creditsPool} credits</div>
                        </div>
                      </div>
                      {contextModule.contextType === 'personal' && (
                        <Button onClick={() => contextModule.switchToOrganization(org.id)} variant="ghost" size="sm">Switch</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-5">
            <Section title={t('preferences.language.title')}>
              <p className="text-xs text-white/40 mb-3">{t('preferences.language.description')}</p>
              <div className="space-y-1.5">
                {availableLanguages.map((lang) => {
                  const selected = currentLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`w-full p-3 text-left rounded-lg transition-colors ${
                        selected ? 'bg-white/[0.08] border border-white/15' : 'border border-transparent hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{lang.flag}</span>
                          <div>
                            <div className={`text-sm font-medium ${selected ? 'text-white' : 'text-white/70'}`}>{lang.nativeName}</div>
                            <div className="text-xs text-white/35">{lang.name}</div>
                          </div>
                        </div>
                        {selected && (
                          <svg className="size-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title={t('preferences.theme.title')}>
              <p className="text-xs text-white/40">{t('preferences.theme.description')}</p>
              <div className="text-center py-6 text-xs text-white/25">{t('credits.comingSoon')}</div>
            </Section>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl" className="max-h-[85vh] w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-4">
            <Avatar src={user.picture} alt={user.name || 'User'} size="lg" variant="user" />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-white truncate">{user.name || t('user.unknownUser')}</h2>
              <p className="text-sm text-white/45 truncate">{user.email || t('user.noEmail')}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-semibold text-white tabular-nums">{formatCredits(credits)}</div>
              <div className="text-[11px] text-white/35">{t('credits.creditsLeft')}</div>
            </div>
          </div>

          {userModule.error && (
            <div className="mt-3 p-2.5 bg-red-500/[0.08] border border-red-500/15 rounded-lg">
              <p className="text-red-300 text-xs">{userModule.error}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.08] px-2">
          {TAB_CONFIG.map(({ id, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors relative ${
                activeTab === id ? 'text-white' : 'text-white/40 hover:text-white/60'
              }`}
              aria-label={t(`navigation.${id}`)}
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              <span className="hidden sm:inline">{t(`navigation.${id}`)}</span>
              {activeTab === id && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-white/70 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          {renderContent()}
        </div>
      </Modal>

      <CreateOrganizationModal
        isOpen={showCreateOrgModal}
        isLoading={createLoading}
        error={createError}
        onClose={() => { setShowCreateOrgModal(false); setCreateError(null); }}
        onCreate={handleCreateOrganization}
      />
    </>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-white/80">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean; valueClass?: string }> = ({ label, value, mono, valueClass }) => (
  <div className="flex justify-between items-center">
    <dt className="text-sm text-white/40">{label}</dt>
    <dd className={`text-sm ${mono ? 'font-mono text-xs' : ''} ${valueClass || 'text-white/80'}`}>{value}</dd>
  </div>
);

const ActionButton: React.FC<{ onClick: () => void; label: string; icon: string; disabled?: boolean }> = ({ onClick, label, icon, disabled }) => (
  <Button onClick={onClick} disabled={disabled} fullWidth icon={
    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
    </svg>
  }>
    {label}
  </Button>
);
