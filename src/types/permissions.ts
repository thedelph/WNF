export const PERMISSIONS = {
  MANAGE_GAMES: 'manage_games',
  MANAGE_PLAYERS: 'manage_players',
  MANAGE_TEAMS: 'manage_teams',
  MANAGE_PAYMENTS: 'manage_payments',
  MANAGE_HISTORY: 'manage_history',
  MANAGE_TOKENS: 'manage_tokens',
  MANAGE_ACCOUNTS: 'manage_accounts',
  MANAGE_SLOTS: 'manage_slots',
  MANAGE_ADMINS: 'manage_admins', // Super admin only
  MANAGE_RATINGS: 'manage_ratings' // Super admin only
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  // Optional permissions array - populated when fetched with role_permissions join
  permissions?: Permission[];
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission: Permission;
  created_at: string;
}

export interface AdminRole {
  id: string;
  player_id: string;
  role_id: string | null;
  is_custom_permissions: boolean;
  created_at: string;
  updated_at: string;
  role?: Role;
  role_permissions?: RolePermission[];
  admin_permissions?: {
    permission: Permission;
  }[];
}

// Helper to check if a permission is super admin only
export const isSuperAdminPermission = (permission: Permission): boolean => {
  return permission === PERMISSIONS.MANAGE_ADMINS || permission === PERMISSIONS.MANAGE_RATINGS;
};

// Permission display names
export const PERMISSION_DISPLAY_NAMES: Record<Permission, string> = {
  [PERMISSIONS.MANAGE_GAMES]: 'Game Management',
  [PERMISSIONS.MANAGE_PLAYERS]: 'Player Management',
  [PERMISSIONS.MANAGE_TEAMS]: 'Team Generation',
  [PERMISSIONS.MANAGE_PAYMENTS]: 'Payment Management',
  [PERMISSIONS.MANAGE_HISTORY]: 'Historical Data',
  [PERMISSIONS.MANAGE_TOKENS]: 'Token Management',
  [PERMISSIONS.MANAGE_ACCOUNTS]: 'Account Management',
  [PERMISSIONS.MANAGE_SLOTS]: 'Slot Offers',
  [PERMISSIONS.MANAGE_ADMINS]: 'Admin Management',
  [PERMISSIONS.MANAGE_RATINGS]: 'Player Ratings'
};

// Permission descriptions
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [PERMISSIONS.MANAGE_GAMES]: 'Create, edit, and manage games',
  [PERMISSIONS.MANAGE_PLAYERS]: 'View and manage player profiles',
  [PERMISSIONS.MANAGE_TEAMS]: 'Generate and manage teams',
  [PERMISSIONS.MANAGE_PAYMENTS]: 'Track payments and generate payment links',
  [PERMISSIONS.MANAGE_HISTORY]: 'View and export historical data',
  [PERMISSIONS.MANAGE_TOKENS]: 'Manage player tokens and bonuses',
  [PERMISSIONS.MANAGE_ACCOUNTS]: 'Manage user accounts and settings',
  [PERMISSIONS.MANAGE_SLOTS]: 'Manage slot offers and reservations',
  [PERMISSIONS.MANAGE_ADMINS]: 'Manage admin users and permissions',
  [PERMISSIONS.MANAGE_RATINGS]: 'View and manage player ratings'
};