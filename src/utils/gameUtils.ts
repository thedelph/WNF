import { supabase } from './supabase';

export const deleteGame = async (gameId: string): Promise<{ error: any | null }> => {
  try {
    // Delete in order of dependencies to avoid foreign key conflicts
    
    // 1. Delete game selections first
    const { error: selectionsError } = await supabase
      .from('game_selections')
      .delete()
      .eq('game_id', gameId);

    if (selectionsError) throw selectionsError;

    // 2. Delete game registrations
    const { error: registrationsError } = await supabase
      .from('game_registrations')
      .delete()
      .eq('game_id', gameId);

    if (registrationsError) throw registrationsError;

    // 3. Delete balanced team assignments (if any)
    const { error: teamAssignmentsError } = await supabase
      .from('balanced_team_assignments')
      .delete()
      .eq('game_id', gameId);

    if (teamAssignmentsError) throw teamAssignmentsError;

    // 4. Delete player penalties (if any)
    const { error: penaltiesError } = await supabase
      .from('player_penalties')
      .delete()
      .eq('game_id', gameId);

    if (penaltiesError) throw penaltiesError;

    // 5. Delete registration locks (if any)
    const { error: locksError } = await supabase
      .from('registration_locks')
      .delete()
      .eq('game_id', gameId);

    if (locksError) throw locksError;

    // 6. Finally delete the game
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
