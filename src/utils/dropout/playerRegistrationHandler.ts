import { supabase } from '../supabase';
import { PlayerRegistrationStatus } from './types';

/**
 * Updates a player's registration status
 * @param playerId Player's ID
 * @param gameId Game's ID
 * @param status New status to set
 * @returns Success status and any error
 */
export const updatePlayerRegistration = async (
  playerId: string,
  gameId: string,
  status: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check player's current status
    const { data: playerRegistration, error: statusError } = await supabase
      .from('game_registrations')
      .select('status')
      .eq('player_id', playerId)
      .eq('game_id', gameId)
      .maybeSingle();

    if (statusError) {
      console.error('Error checking player status:', statusError);
      throw statusError;
    }

    // If no registration found, create a new one
    if (!playerRegistration) {
      const { error: insertError } = await supabase
        .from('game_registrations')
        .insert([{
          player_id: playerId,
          game_id: gameId,
          status: status
        }]);

      if (insertError) {
        console.error('Error inserting player status:', insertError);
        throw insertError;
      }
    } else if (playerRegistration.status === status) {
      console.log(`Player already has status: ${status}`);
      return { success: true };
    } else {
      // Update existing registration
      const { error: updateError } = await supabase
        .from('game_registrations')
        .update({ status: status })
        .eq('player_id', playerId)
        .eq('game_id', gameId);

      if (updateError) {
        console.error('Error updating player status:', updateError);
        throw updateError;
      }
    }

    console.log(`Successfully updated player status to ${status}`);
    return { success: true };
  } catch (error) {
    console.error('Error in updatePlayerRegistration:', error);
    return { success: false, error: error.message };
  }
};
