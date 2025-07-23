import { supabase } from './supabase';

/**
 * Deletes a game using a proven three-phase approach to avoid PostgreSQL stack depth issues and transaction conflicts.
 * 
 * This approach is based on the successful historical game deletion process and avoids all common pitfalls:
 * 1. Stack depth limits - By removing complex recursive operations
 * 2. Transaction conflicts - By separating operations into distinct phases
 * 3. Permission issues - By using SECURITY DEFINER functions with proper permissions
 * 
 * @param gameId - UUID of the game to delete
 * @returns Object containing error if any occurred
 */
export const deleteGame = async (gameId: string): Promise<{ error: any | null }> => {
  try {
    console.log('Starting game deletion process for game:', gameId);
    
    // PHASE 1: Clear foreign key references first
    console.log('Phase 1: Clearing foreign key references');
    const deleteChildren = [
      // Return any tokens used for this game
      supabase.rpc('return_game_tokens', { game_id: gameId }),
      // Delete all direct references to the game
      supabase.from('game_registrations').delete().eq('game_id', gameId),
      supabase.from('game_selections').delete().eq('game_id', gameId),
      supabase.from('balanced_team_assignments').delete().eq('game_id', gameId),
      supabase.from('player_penalties').delete().eq('game_id', gameId),
      supabase.from('registration_locks').delete().eq('game_id', gameId),
      // Delete additional tables that were missing
      supabase.from('player_status_changes').delete().eq('game_id', gameId),
      supabase.from('reserve_xp_transactions').delete().eq('game_id', gameId),
      supabase.from('slot_offers').delete().eq('game_id', gameId),
      supabase.from('team_announcement_locks').delete().eq('game_id', gameId),
      supabase.from('token_history').delete().eq('game_id', gameId)
    ];
    
    // Wait for all FK references to be deleted
    const results = await Promise.all(deleteChildren);
    console.log('All game child records processed', results);
    
    // PHASE 2: Delete the game itself using direct SQL while disabling triggers
    console.log('Phase 2: Deleting game with triggers disabled');
    const { data: deleteResult, error: deleteGameError } = await supabase
      .rpc('delete_game_without_triggers', { game_id: gameId });
    
    // Check if the deletion was successful
    if (deleteResult !== true) {
      console.log('Game deletion failed:', { deleteResult });
      throw new Error('Game deletion failed');
    }
    
    if (deleteGameError) {
      console.log('Error deleting game:', deleteGameError);
      throw deleteGameError;
    }
    
    console.log('Game deleted successfully');
    
    // PHASE 3: Refresh materialized views
    console.log('Phase 3: Refreshing materialized views');
    const { error: refreshError } = await supabase
      .rpc('refresh_token_status_view');
    
    if (refreshError) {
      console.log('Error refreshing views (non-critical):', refreshError);
      // Don't throw this error - view refresh is not critical
    }

    return { error: null };
  } catch (error) {
    console.error('Error deleting game:', error);
    return { error };
  }
};
