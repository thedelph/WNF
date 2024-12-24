import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { Player } from '../types/game';

export const useUser = () => {
  const { user } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!user) {
        setPlayer(null);
        setLoading(false);
        return;
      }

      try {
        // First fetch the player with admin role info
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select(`
            id,
            friendly_name,
            caps,
            active_bonuses,
            active_penalties,
            current_streak,
            admin_role:admin_roles!left (
              id,
              admin_permissions (
                permission
              )
            )
          `)
          .eq('user_id', user.id)
          .single();

        if (playerError) throw playerError;

        // Process the player data to check for admin permissions
        const isAdmin = playerData?.admin_role?.admin_permissions?.some(
          (p: { permission: string }) => p.permission === 'manage_games'
        ) || false;

        // Create the processed player object
        const processedPlayer: Player = {
          ...playerData,
          isAdmin,
          // Keep admin_role for type safety but it's not used in the UI
          admin_role: playerData.admin_role
        };

        setPlayer(processedPlayer);
      } catch (err) {
        console.error('Error fetching player:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [user]);

  return { player, loading, error };
};
