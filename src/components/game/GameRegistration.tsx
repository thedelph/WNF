import React from 'react';
import { supabase } from '../../utils/supabase';
import { Game } from '../../types/game';
import { LoadingSpinner } from '../LoadingSpinner';

interface GameRegistrationProps {
  game: Game;
  isRegistrationOpen: boolean;
  isRegistrationClosed: boolean;
  isUserRegistered: boolean;
  isProcessingOpen: boolean;
  isProcessingClose: boolean;
  onRegistrationChange: () => Promise<void>;
}

export const GameRegistration: React.FC<GameRegistrationProps> = ({
  game,
  isRegistrationOpen,
  isRegistrationClosed,
  isUserRegistered,
  isProcessingOpen,
  isProcessingClose,
  onRegistrationChange
}) => {
  // Handle player registration/unregistration
  const handleRegistration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !game) return;

      // Get player profile
      const { data: playerProfile, error: profileError } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching player profile:', profileError);
        throw profileError;
      }

      if (!playerProfile) {
        console.error('No player profile found');
        return;
      }

      // Check current registration status
      const { data: existingReg } = await supabase
        .from('game_registrations')
        .select('id, status')
        .eq('game_id', game.id)
        .eq('player_id', playerProfile.id)
        .single();

      if (existingReg) {
        // Unregister
        const { error } = await supabase
          .from('game_registrations')
          .delete()
          .eq('game_id', game.id)
          .eq('player_id', playerProfile.id);

        if (error) throw error;
      } else {
        // Register
        const { error } = await supabase
          .from('game_registrations')
          .insert({
            game_id: game.id,
            player_id: playerProfile.id,
            status: 'registered',
            selection_method: null
          });

        if (error) throw error;
      }

      // Notify parent component to refresh data
      await onRegistrationChange();
    } catch (error) {
      console.error('Error handling registration:', error);
      throw error;
    }
  };

  if (isProcessingOpen || isProcessingClose) {
    return <LoadingSpinner />;
  }

  // Only show registration button when registration is open and not closed
  if (!isRegistrationOpen || isRegistrationClosed) {
    return null;
  }

  return (
    <div className="flex justify-center my-4">
      <button
        onClick={handleRegistration}
        className={`btn ${isUserRegistered ? 'btn-error' : 'btn-primary'} w-48`}
      >
        {isUserRegistered ? 'Unregister' : 'Register Interest'}
      </button>
    </div>
  );
};
