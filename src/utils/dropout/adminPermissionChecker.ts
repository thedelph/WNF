import { supabase } from '../supabase';

/**
 * Checks if a player has admin permissions for managing games
 * @param playerId Player's ID to check
 * @returns Whether the player has admin permissions
 */
export const checkAdminPermissions = async (
  playerId: string
): Promise<boolean> => {
  try {
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_permissions')
      .select(`
        id,
        permission,
        admin_role:admin_roles!admin_permissions_admin_role_id_fkey (
          player_id
        )
      `)
      .eq('permission', 'manage_games')
      .eq('admin_role.player_id', playerId)
      .single();

    if (adminError) {
      console.error('Error checking admin permissions:', adminError);
      throw adminError;
    }

    return !!adminCheck;
  } catch (error) {
    console.error('Error in checkAdminPermissions:', error);
    return false;
  }
};
