# Role-Based Access Control (RBAC) System

## Overview

The WNF application now supports granular permission management through a Role-Based Access Control system. This allows super administrators to assign specific roles with limited permissions to admin users, rather than granting full admin access.

## Database Schema

### Tables

1. **roles**
   - `id` (uuid, primary key)
   - `name` (text, unique)
   - `description` (text)
   - `is_system` (boolean) - Prevents deletion of built-in roles
   - `created_at`, `updated_at` (timestamps)

2. **role_permissions**
   - `id` (uuid, primary key)
   - `role_id` (uuid, foreign key to roles)
   - `permission` (text)
   - `created_at` (timestamp)
   - Unique constraint on (role_id, permission)

3. **admin_roles** (modified)
   - Added `role_id` (uuid, foreign key to roles)
   - Added `is_custom_permissions` (boolean)

## Default Roles

The system includes 5 built-in roles:

1. **Super Admin** - Full system access including role management
2. **Full Admin** - Access to all features except role and ratings management
3. **Treasurer** - Access to payment management only
4. **Team Manager** - Access to game and team management
5. **Player Manager** - Access to player and token management

## Available Permissions

- `manage_games` - Create, edit, and manage games
- `manage_players` - View and manage player profiles
- `manage_teams` - Generate and manage teams
- `manage_payments` - Track payments and generate payment links
- `manage_history` - View and export historical data
- `manage_tokens` - Manage player tokens and bonuses
- `manage_accounts` - Manage user accounts and settings
- `manage_slots` - Manage slot offers and reservations
- `manage_admins` - Manage admin users and permissions (super admin only)
- `manage_ratings` - View and manage player ratings (super admin only)

## UI Components

### Role Management Page (`/admin/roles`)
- Create, edit, and delete custom roles
- Assign/remove permissions from roles
- Protected system roles cannot be deleted
- Only accessible by super admins

### Admin Management Page (`/admin/admins`)
- Enhanced with statistics header showing admin distribution
- Role assignment when adding new admins
- Search functionality by name, role, or admin type
- Visual badges for different admin types
- "View Permissions" expandable section showing granted permissions

### Admin Portal
- Dynamically shows only sections users have permission to access
- Each admin card checks for specific permissions

## Implementation Details

### Permission Checking

```typescript
// In components
const { hasPermission } = useAdmin();

if (!hasPermission(PERMISSIONS.MANAGE_PAYMENTS)) {
  return <AccessDenied />;
}
```

### Backward Compatibility

The system maintains full backward compatibility:
- `is_admin = true` continues to grant all non-super-admin permissions
- `is_super_admin = true` continues to grant all permissions
- Existing admins retain their access levels

### Technical Notes

1. **Custom Expandable Sections**: The View Permissions feature uses custom expandable sections instead of DaisyUI's collapse component due to rendering issues with dynamic content.

2. **Admin Fetching**: Uses a two-query approach (players + admin_roles) combined in memory to properly handle all admin types.

3. **Responsive Design**: Admin cards use a responsive grid (1/2/3/4 columns) based on screen size.

## Security

- Row-level security (RLS) policies protect all admin tables
- Only super admins can manage roles and permissions
- Permission checks occur at both UI and database levels
- Audit trail potential through timestamps

## Usage Example

To grant payment management access only:

1. Navigate to Admin Portal → Admin Management
2. Click "Add New Admin"
3. Select the user and choose "Role-based Admin"
4. Select "Treasurer" role
5. The user will only see Payment Management in their admin portal