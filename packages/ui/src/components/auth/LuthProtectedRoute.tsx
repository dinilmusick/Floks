import React from 'react';
import { LuthAuthPage, type LuthAuthConfig } from './LuthAuthPage.js';

export interface LuthProtectedRouteProps extends LuthAuthConfig {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

/** Protects application content using the same canonical Luth session lifecycle as LuthAuthPage. */
export const LuthProtectedRoute: React.FC<LuthProtectedRouteProps> = ({
  ecosystemId,
  applicationId,
  luthUrl,
  children,
  fallback,
  loadingFallback,
}) => (
  <LuthAuthPage
    ecosystemId={ecosystemId}
    applicationId={applicationId}
    luthUrl={luthUrl}
    authenticatedContent={children}
    unauthenticatedContent={fallback}
    loadingContent={loadingFallback}
  />
);

export default LuthProtectedRoute;
