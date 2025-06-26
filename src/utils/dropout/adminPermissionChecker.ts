import { supabase } from '../supabase';
import { Permission, PERMISSIONS } from '../../types/permissions';

/**
 * Checks if a player has a specific admin permission
 * @param playerId Player's ID to check
 * @param permission The permission to check for
 * @returns Whether the player has the permission
 */
export const checkAdminPermission = async (
  playerId: string,
  permission: Permission
): Promise<boolean> => {
  try {
    // First check if player has super admin or admin flags
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('is_admin, is_super_admin')
      .eq('id', playerId)
      .single();

    if (playerError) throw playerError;

    // Super admins have all permissions
    if (playerData?.is_super_admin) return true;

    // Regular admins have all non-super permissions
    if (playerData?.is_admin) {
      return permission !== PERMISSIONS.MANAGE_ADMINS && permission !== PERMISSIONS.MANAGE_RATINGS;
    }

    // Check RBAC permissions
    const { data: adminRole, error: roleError } = await supabase
      .from('admin_roles')
      .select(`
        id,
        role_id,
        role:roles!admin_roles_role_id_fkey (
          id,
          name,
          role_permissions!role_permissions_role_id_fkey (
            permission
          )
        ),
        admin_permissions!admin_permissions_admin_role_id_fkey (
          permission
        )
      `)
      .eq('player_id', playerId)
      .single();

    if (roleError) {
      if (roleError.code === 'PGRST116') return false; // No admin role found
      throw roleError;
    }

    // Check role permissions
    const hasRolePermission = adminRole.role?.role_permissions?.some(
      rp => rp.permission === permission
    ) || false;

    // Check custom permissions
    const hasCustomPermission = adminRole.admin_permissions?.some(
      ap => ap.permission === permission
    ) || false;

    return hasRolePermission || hasCustomPermission;
  } catch (error) {
    console.error('Error checking admin permission:', error);
    return false;
  }
};

/**
 * Legacy function for backward compatibility
 * Checks if a player has admin permissions for managing games
 * @param playerId Player's ID to check
 * @returns Whether the player has admin permissions
 */
export const checkAdminPermissions = async (
  playerId: string
): Promise<boolean> => {
  return checkAdminPermission(playerId, PERMISSIONS.MANAGE_GAMES);
};
