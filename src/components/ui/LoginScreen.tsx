import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { GlassInput } from '../shared/ui/GlassInput';

interface LoginScreenProps {
  mode: 'login' | 'signup' | 'verify';
  isLoading?: boolean;
  error?: string | null;
  onLogin: (email: string, password: string) => void;
  onSignup: (email: string, password: string, name?: string) => void;
  onVerify: (code: string) => void;
  onSwitchMode: (mode: 'login' | 'signup' | 'verify') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  mode,
  isLoading = false,
  error = null,
  onLogin,
  onSignup,
  onVerify,
  onSwitchMode
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const primaryActionText = useMemo(() => {
    if (mode === 'signup') return t('auth.signUp');
    if (mode === 'verify') return t('auth.verify');
    return t('auth.signInToContinue');
  }, [mode, t]);

  const secondaryActionText = useMemo(() => {
    if (mode === 'signup') return t('auth.signIn');
    return t('auth.createAccount');
  }, [mode, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup') {
      onSignup(email.trim(), password, name.trim() || undefined);
    } else if (mode === 'verify') {
      onVerify(code.trim());
    } else {
      onLogin(email.trim(), password);
    }
  };

  const isDisabled = isLoading || (mode === 'verify' ? !code.trim() : !email.trim() || !password);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-[#0a0a0a]">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Gradient accent — top-right corner glow */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-600/8 rounded-full blur-[120px]" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full px-6">
        <div className="w-full max-w-sm">

          {/* Logo mark */}
          <div className="flex justify-center mb-8">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-bold text-lg tracking-tight">is</span>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
              {mode === 'signup' ? 'Create your account' : mode === 'verify' ? 'Verify your email' : 'Welcome back'}
            </h1>
            <p className="text-sm text-gray-400">
              {mode === 'signup'
                ? 'Start building with your AI companion'
                : mode === 'verify'
                  ? 'Enter the code sent to your email'
                  : 'Sign in to continue to isA'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode !== 'verify' && (
              <>
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">Name</label>
                    <GlassInput
                      value={name}
                      onChange={setName}
                      placeholder="Your name"
                      type="text"
                      disabled={isLoading}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">Email</label>
                  <GlassInput
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    type="email"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">Password</label>
                  <GlassInput
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter your password"
                    type="password"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            {mode === 'verify' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">Verification code</label>
                <GlassInput
                  value={code}
                  onChange={setCode}
                  placeholder="Enter 6-digit code"
                  type="text"
                  disabled={isLoading}
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}

            {/* Primary action */}
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full h-11 bg-white text-black text-sm font-medium rounded-lg transition-all duration-150 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Please wait...</span>
                </span>
              ) : (
                primaryActionText
              )}
            </button>
          </form>

          {/* Divider */}
          {mode !== 'verify' && (
            <div className="mt-6 pt-6 border-t border-white/8 text-center">
              <button
                onClick={() => onSwitchMode(mode === 'signup' ? 'login' : 'signup')}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                <span className="text-white font-medium">
                  {secondaryActionText}
                </span>
              </button>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-gray-600 mt-8">
            Secured with end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  );
};
