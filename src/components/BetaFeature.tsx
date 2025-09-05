import React from 'react';
import { useBetaTester } from '../hooks/useBetaTester';
import { useAdmin } from '../hooks/useAdmin';
import { FaFlask, FaLock } from 'react-icons/fa';

interface BetaFeatureProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showMessage?: boolean;
  allowAdmins?: boolean;
}

/**
 * BetaFeature component for gating features to beta testers only
 * 
 * @param children - The content to show to beta testers
 * @param fallback - Optional content to show to non-beta testers (defaults to nothing)
 * @param showMessage - Whether to show a "Beta feature" message when feature is hidden
 * @param allowAdmins - Whether to allow admins to see the feature regardless of beta status
 */
const BetaFeature: React.FC<BetaFeatureProps> = ({ 
  children, 
  fallback = null,
  showMessage = true,
  allowAdmins = true 
}) => {
  const { isBetaTester, loading: betaLoading } = useBetaTester();
  const { isAdmin, loading: adminLoading } = useAdmin();

  if (betaLoading || (allowAdmins && adminLoading)) {
    return null;
  }

  const hasAccess = isBetaTester || (allowAdmins && isAdmin);

  if (!hasAccess) {
    if (showMessage && fallback === null) {
      return (
        <div className="alert alert-warning shadow-lg">
          <div>
            <FaLock className="flex-shrink-0" />
            <div>
              <h3 className="font-bold">Beta Feature</h3>
              <div className="text-sm">This feature is currently in beta testing and only available to selected users.</div>
            </div>
          </div>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return (
    <div className="relative">
      {isBetaTester && !isAdmin && (
        <div className="absolute top-0 right-0 z-10">
          <span className="badge badge-warning badge-sm gap-1">
            <FaFlask className="text-xs" />
            Beta
          </span>
        </div>
      )}
      {children}
    </div>
  );
};

export default BetaFeature;