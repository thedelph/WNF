import { toast } from 'react-hot-toast';
import { checkAdminPermissions } from './adminPermissionChecker';
import { updatePlayerRegistration } from './playerRegistrationHandler';
import { createSlotOffers } from './slotOfferHandler';
import { DropoutResult } from './types';
import { supabase } from '../supabase';

/**
 * Handles a player dropping out of a game themselves
 * @param playerId ID of the player dropping out
 * @param gameId ID of the game to drop out from
 * @returns Success status and any error message
 */
export const handlePlayerSelfDropout = async (
  playerId: string,
  gameId: string
): Promise<DropoutResult> => {
  try {
    console.log(`Starting dropout process for player: ${playerId} in game: ${gameId}`);
    
    // Check if player was selected (not reserve)
    const { data: registration } = await supabase
      .from('game_registrations')
      .select('status')
      .eq('game_id', gameId)
      .eq('player_id', playerId)
      .single();

    if (!registration) {
      throw new Error('Player registration not found');
    }

    // Update player registration status
    const registrationResult = await updatePlayerRegistration(playerId, gameId, 'dropped_out');
    if (!registrationResult.success) {
      throw new Error(registrationResult.error);
    }

    // Only create slot offers if the player was selected (not reserve)
    if (registration.status === 'selected') {
      const slotOfferResult = await createSlotOffers({
        gameId,
        adminId: playerId,
        droppedOutPlayerId: playerId
      });

      if (!slotOfferResult.success) {
        throw new Error(slotOfferResult.error);
      }
      toast.success('You have dropped out of the game. Reserve players will be notified of the open spot.');
    } else {
      toast.success('You have dropped out of the reserve list.');
    }

    return { success: true };
  } catch (error) {
    console.error('Error in handlePlayerSelfDropout:', error);
    toast.error('Failed to drop out. Please try again later.');
    return { success: false, error: error.message };
  }
};

/**
 * Handles an admin dropping out a player and creating slot offers
 * @param gameId ID of the game
 * @param playerId ID of the player to drop out
 * @param now Current date/time
 * @returns Success status and any error message
 */
export const handlePlayerDropoutAndOffers = async (
  gameId: string,
  playerId: string,
  now: Date
): Promise<DropoutResult> => {
  try {
    console.log('Starting dropout and offer process for player:', playerId, 'in game:', gameId);
    
    // Check admin permissions
    const hasPermission = await checkAdminPermissions(playerId);
    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Check if player was selected (not reserve)
    const { data: registration } = await supabase
      .from('game_registrations')
      .select('status')
      .eq('game_id', gameId)
      .eq('player_id', playerId)
      .single();

    if (!registration) {
      throw new Error('Player registration not found');
    }

    // Update player registration status
    const registrationResult = await updatePlayerRegistration(playerId, gameId, 'dropped_out');
    if (!registrationResult.success) {
      throw new Error(registrationResult.error);
    }

    // Only create slot offers if the player was selected (not reserve)
    if (registration.status === 'selected') {
      // Create slot offers for reserve players
      const slotOfferResult = await createSlotOffers({
        gameId,
        adminId: playerId,
        droppedOutPlayerId: playerId
      });

      if (!slotOfferResult.success) {
        throw new Error(slotOfferResult.error);
      }
      toast.success('Player has been dropped out and reserve players have been notified.');
    } else {
      toast.success('Player has been dropped out from the reserve list.');
    }

    return { success: true };
  } catch (error) {
    console.error('Error in handlePlayerDropoutAndOffers:', error);
    toast.error('Failed to process dropout. Please try again later.');
    return { success: false, error: error.message };
  }
};
