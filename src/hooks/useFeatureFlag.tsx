import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useViewAs } from '../context/ViewAsContext';
import { supabase } from '../utils/supabase';

interface FeatureFlagStatus {
  isEnabled: boolean;
  loading: boolean;
  error: Error | null;
}

export const useFeatureFlag = (flagName: string): FeatureFlagStatus => {
  const { user } = useAuth();
  const { viewAsUser, isViewingAs } = useViewAs();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkFeatureFlag = async () => {
      try {
        if (!flagName) {
          setIsEnabled(false);
          setLoading(false);
          return;
        }

        // Fetch the feature flag
        const { data: flagData, error: flagError } = await supabase
          .from('feature_flags')
          .select('*')
          .eq('name', flagName)
          .eq('is_active', true)
          .single();

        if (flagError || !flagData) {
          setIsEnabled(false);
          setLoading(false);
          return;
        }

        // Determine which user to check - ViewAs user or actual user
        const effectiveUserId = isViewingAs && viewAsUser ? viewAsUser.user_id : user?.id;

        // If no user, check if flag is enabled for production
        if (!effectiveUserId) {
          setIsEnabled(flagData.enabled_for?.includes('production') || false);
          setLoading(false);
          return;
        }

        // Check if user is specifically targeted
        if (flagData.enabled_user_ids?.includes(effectiveUserId)) {
          setIsEnabled(true);
          setLoading(false);
          return;
        }

        // If viewing as, use the viewAsUser data directly
        let playerData;
        if (isViewingAs && viewAsUser) {
          playerData = {
            id: viewAsUser.id,
            is_beta_tester: viewAsUser.is_beta_tester,
            is_admin: viewAsUser.is_admin,
            is_super_admin: viewAsUser.is_super_admin
          };
        } else {
          // Fetch user data to check roles
          const { data, error: playerError } = await supabase
            .from('players')
            .select('id, is_beta_tester, is_admin, is_super_admin')
            .eq('user_id', effectiveUserId)
            .single();

          if (playerError || !data) {
            // User not found in players table, check if production is enabled
            setIsEnabled(flagData.enabled_for?.includes('production') || false);
            setLoading(false);
            return;
          }
          playerData = data;
        }


        // Check enabled_for array based on user roles
        const enabledFor = flagData.enabled_for || [];
        
        if (playerData.is_super_admin && enabledFor.includes('super_admin')) {
          setIsEnabled(true);
          setLoading(false);
          return;
        }

        if (playerData.is_admin && enabledFor.includes('admin')) {
          setIsEnabled(true);
          setLoading(false);
          return;
        }

        if (playerData.is_beta_tester && enabledFor.includes('beta')) {
          setIsEnabled(true);
          setLoading(false);
          return;
        }

        if (enabledFor.includes('production')) {
          // Check rollout percentage for gradual rollouts
          if (flagData.rollout_percentage && flagData.rollout_percentage > 0) {
            // Use a deterministic hash based on user ID to ensure consistent behavior
            const hash = await hashUserId(playerData.id);
            const userPercentage = (hash % 100) + 1; // 1-100
            setIsEnabled(userPercentage <= flagData.rollout_percentage);
          } else {
            setIsEnabled(true);
          }
        } else {
          setIsEnabled(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to check feature flag'));
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkFeatureFlag();
  }, [user, flagName, isViewingAs, viewAsUser]);

  return { isEnabled, loading, error };
};

// Simple deterministic hash function for user ID
async function hashUserId(userId: string): Promise<number> {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Hook to fetch all feature flags (for admin use)
export const useFeatureFlags = () => {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFlags(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch feature flags'));
      } finally {
        setLoading(false);
      }
    };

    fetchFlags();
  }, []);

  const refetch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlags(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch feature flags'));
    } finally {
      setLoading(false);
    }
  };

  return { flags, loading, error, refetch };
};