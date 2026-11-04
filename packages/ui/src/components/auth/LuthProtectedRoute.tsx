import React from 'react';
import { AuthLoadingScreen } from './AuthLoadingScreen.js';
import { LuthAuthPage, useLuthAuth, type LuthAuthConfig } from './LuthAuthPage.js';

export interface LuthProtectedRouteProps extends LuthAuthConfig {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

/**
 * Revalidates the canonical Luth session before exposing protected application content.
 * The default unauthenticated view is the integrated Luth-powered Floks authentication page.
 */
export const LuthProtectedRoute: React.FC<LuthProtectedRouteProps> = ({
  ecosystemId,
  applicationId,
  luthUrl,
  children,
  fallback,
  loadingFallback,
}) => {
  const auth = useLuthAuth({ ecosystemId, applicationId, luthUrl });

  if (auth.initializing || (auth.loading && !auth.session.authenticated)) {
    return <>{loadingFallback ?? <AuthLoadingScreen label="VERIFYING SESSION..." />}</>;
  }

  if (!auth.session.authenticated) {
    return <>{fallback ?? <LuthAuthPage ecosystemId={ecosystemId} applicationId={applicationId} luthUrl={luthUrl} />}</>;
  }

  return <>{children}</>;
};

export default LuthProtectedRoute;
