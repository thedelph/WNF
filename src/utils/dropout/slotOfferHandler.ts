import { supabase, supabaseAdmin } from '../supabase';
import { toast } from 'react-hot-toast';
import { SlotOfferCreationParams } from './types';
import { calculateEligiblePlayers } from './eligibilityCalculator';

/**
 * Creates slot offers for eligible reserve players
 * @param params Parameters for creating slot offers
 * @returns Success status and any error message
 */
export const createSlotOffers = async (
  params: SlotOfferCreationParams
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { gameId, adminId, droppedOutPlayerId } = params;

    // Get game data
    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (!game) {
      throw new Error('Game not found');
    }

    console.log('Creating slot offers with params:', {
      gameId,
      adminId,
      droppedOutPlayerId,
      game
    });

    // Call the database function to create slot offers
    const { error: slotOfferError } = await supabaseAdmin
      .rpc('create_slot_offers_for_game', {
        p_game_id: gameId,
        p_admin_id: adminId,
        p_dropped_out_player_id: droppedOutPlayerId
      });

    if (slotOfferError) {
      console.error('Error creating slot offers:', slotOfferError);
      throw slotOfferError;
    }

    console.log('Successfully created slot offers');
    return { success: true };
  } catch (error) {
    console.error('Error in createSlotOffers:', error);
    return { success: false, error: error.message };
  }
};
