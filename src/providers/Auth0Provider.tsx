import React, { useEffect, useState } from 'react';
import { Auth0Provider as Auth0ProviderBase, useAuth0 } from '@auth0/auth0-react';
import { LoginScreen } from '../components/ui/LoginScreen';
import { config } from '../config';
import { getCurrentRelativeUrl } from '../config/authSessionConfig';

interface Auth0ProviderProps {
  children: React.ReactNode;
}

export const Auth0Provider: React.FC<Auth0ProviderProps> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);
  
  // 确保只在客户端运行 - 简化版本，移除有问题的超时逻辑
  useEffect(() => {
    console.log('🔐 Auth0Provider: Initializing client-side detection');
    setIsClient(true);
    console.log('🔐 Auth0Provider: Client-side detection completed');
  }, []);

  // 服务端渲染时显示加载状态
  if (!isClient) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          Initializing...
        </div>
      </div>
    );
  }

  const domain = config.auth0.domain;
  const clientId = config.auth0.clientId;
  const audience = config.auth0.audience;
  const scope = config.auth0.scope;
  // 使用当前域名作为 redirectUri，支持多域名
  const redirectUri = window.location.origin;

  // Auth0 configuration check

  if (!domain || !clientId) {
    console.error('Auth0 configuration missing:', { domain, clientId, audience });
    return (
      <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center text-red-400">
          <h2 className="text-xl font-bold mb-2">Configuration Error</h2>
          <p>Auth0 settings are missing. Please check environment variables.</p>
          <div className="mt-4 text-sm text-gray-400">
            <p>Domain: {domain || 'Missing'}</p>
            <p>Client ID: {clientId ? 'Present' : 'Missing'}</p>
          </div>
          <button
            onClick={() => {
              console.log('🔄 Retrying Auth0 initialization...');
              window.location.reload();
            }}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  console.log('🔐 Auth0Provider: Creating Auth0 provider with config');

  return (
    <Auth0ProviderBase
      domain={domain}
      clientId={clientId}
      onRedirectCallback={(appState) => {
        const rawTarget = typeof appState === 'object' && appState && 'returnTo' in appState
          ? String((appState as { returnTo?: string }).returnTo || '/app')
          : '/app';
        const target = rawTarget.startsWith('/') ? rawTarget : '/app';
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, target);
        }
      }}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience: audience,
        scope: scope
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <AuthGate>{children}</AuthGate>
    </Auth0ProviderBase>
  );
};

/**
 * Auth Gate Component - Handles authentication flow (simplified)
 */
const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, isAuthenticated, loginWithRedirect, error } = useAuth0();

  // Auth0 status check

  // 如果有Auth0错误，显示错误信息
  if (error) {
    console.error('🔐 AuthGate: Auth0 error:', error);
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-red-400">
          <h2 className="text-xl font-bold mb-2">Authentication Error</h2>
          <p className="mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading while Auth0 is initializing
  if (isLoading) {
    console.log('🔐 AuthGate: Auth0 is loading, showing spinner');
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <div>Authenticating...</div>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    console.log('🔐 AuthGate: User not authenticated, showing login screen');
    return (
      <LoginScreen
        onLogin={() =>
          loginWithRedirect({
            appState: {
              returnTo: getCurrentRelativeUrl()
            }
          })
        }
      />
    );
  }

  // Show main app if authenticated
  console.log('🔐 AuthGate: User authenticated, showing main app');
  return <>{children}</>;
};
