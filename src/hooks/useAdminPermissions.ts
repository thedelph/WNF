import { useEffect, useState } from 'react';
import { checkAdminPermissions } from '../utils/dropout/adminPermissionChecker';

/**
 * Hook to check if the current user has admin permissions for managing games
 * @param playerId Player's ID to check
 * @returns Object containing admin status and loading state
 */
export const useAdminPermissions = (playerId?: string) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!playerId) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const hasPermission = await checkAdminPermissions(playerId);
        setIsAdmin(hasPermission);
      } catch (error) {
        console.error('Error checking admin permissions:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [playerId]);

  return { isAdmin, loading };
};
