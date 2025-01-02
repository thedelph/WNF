import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { toast } from 'react-hot-toast';

interface UseGameRegistrationProps {
  gameId: string | undefined;
  isUserRegistered: boolean;
  onRegistrationChange: () => Promise<void>;
}

export const useGameRegistration = ({
  gameId,
  isUserRegistered,
  onRegistrationChange
}: UseGameRegistrationProps) => {
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegistration = async () => {
    if (!gameId) return;
    
    try {
      setIsRegistering(true);

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
        toast.error('No player profile found');
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
        }
      } else {
        // Register
        const { error } = await supabase
          .from('game_registrations')
          .insert({
            game_id: gameId,
            player_id: playerProfile.id,
            status: 'registered'
          });

        if (error) {
          console.error('Error registering:', error);
          toast.error('Failed to register for game');
        } else {
          toast.success('Successfully registered for game');
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