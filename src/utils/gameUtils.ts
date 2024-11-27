import { supabase } from './supabase';

export const deleteGame = async (gameId: string): Promise<{ error: any | null }> => {
  try {
    // With ON DELETE CASCADE, we only need to delete the game
    // and related records will be automatically deleted
    const { error: gameError } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (gameError) throw gameError;

    return { error: null };
  } catch (error) {
    console.error('Error deleting game:', error);
    return { error };
  }
};
