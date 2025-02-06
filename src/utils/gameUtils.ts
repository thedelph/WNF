import { supabase } from './supabase';

export const deleteGame = async (gameId: string): Promise<{ error: any | null }> => {
  try {
    const { data, error } = await supabase
      .rpc('handle_game_deletion', { p_game_id: gameId });

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting game:', error);
    return { error };
  }
};
