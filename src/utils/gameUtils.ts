import { supabase } from './supabase';

export const deleteGame = async (gameId: string): Promise<{ error: any | null }> => {
  try {
    const { data, error } = await supabase
      .rpc('delete_game_and_update_streaks', { p_game_id: gameId });

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting game:', error);
    return { error };
  }
};
