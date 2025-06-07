import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { toast } from 'react-hot-toast';

interface UseGameRegistrationProps {
  gameId: string | undefined;
  isUserRegistered: boolean;
  onRegistrationChange: () => Promise<void>;
  useToken: boolean;
  setUseToken: (value: boolean) => void;
}

export const useGameRegistration = ({
  gameId,
  isUserRegistered,
  onRegistrationChange,
  useToken,
  setUseToken
}: UseGameRegistrationProps) => {
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegistration = async () => {
    if (!gameId) return;
    setIsRegistering(true);

    try {
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to register');
        return;
      }

      // Get player profile using user_id
      const { data: playerProfile, error: profileError } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching player profile:', profileError);
        toast.error('Error fetching player profile');
        return;
      }

      if (!playerProfile) {
        console.error('No player profile found');
        return;
      }

      if (isUserRegistered) {
        // Unregister
        const { error } = await supabase
          .from('game_registrations')
          .delete()
          .match({ 
            game_id: gameId,
            player_id: playerProfile.id 
          });

        if (error) {
          console.error('Error unregistering:', error);
          toast.error('Failed to unregister from game');
        } else {
          toast.success('Successfully unregistered from game');
          setUseToken(false); // Reset token usage on unregister
        }
      } else {
        // Verify token availability if trying to use one
        if (useToken) {
          const { data, error: tokenCheckError } = await supabase
            .rpc('check_player_token', { p_player_id: playerProfile.id });

          if (tokenCheckError) {
            console.error('Error checking token availability:', tokenCheckError);
            toast.error('Failed to check token availability');
            return;
          }

          const hasToken = !!data?.[0]?.has_token;
          if (!hasToken) {
            console.error('No token available for player:', playerProfile.id);
            toast.error('No priority token available');
            return;
          }
        }

        // Register
        if (useToken) {
          // First try to use the token
          const { data: tokenUsed, error: tokenError } = await supabase
            .rpc('use_player_token', { 
              p_player_id: playerProfile.id,
              p_game_id: gameId
            });

          if (tokenError) {
            console.error('Error using token:', tokenError);
            toast.error('Failed to use token');
            return;
          }

          if (!tokenUsed) {
            console.error('Failed to use token for player:', playerProfile.id);
            toast.error('Failed to use token');
            return;
          }
        }

        // Then create the registration
        const { error: registrationError } = await supabase
          .from('game_registrations')
          .insert({
            game_id: gameId,
            player_id: playerProfile.id,
            status: 'registered',
            using_token: useToken
          });

        if (registrationError) {
          console.error('Error registering:', registrationError);
          toast.error(`Failed to register for game: ${registrationError.message}`);
        } else {
          toast.success(`Successfully registered for game${useToken ? ' using token' : ''}`);
        }
      }

      // Notify parent component to refresh data
      await onRegistrationChange();
    } catch (error) {
      console.error('Error handling registration:', error);
      toast.error('Failed to update registration');
    } finally {
      setIsRegistering(false);
    }
  };

  return {
    isRegistering,
    handleRegistration
  };
};