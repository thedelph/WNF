# Add RBAC System Migration

**Date**: 2025-06-26  
**Author**: System

## Summary

This migration adds a Role-Based Access Control (RBAC) system to provide granular admin permissions management.

## Changes

### New Tables

1. **roles**
   ```sql
   CREATE TABLE public.roles (
       id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
       name text UNIQUE NOT NULL,
       description text,
       is_system boolean DEFAULT false,
       created_at timestamp with time zone DEFAULT now(),
       updated_at timestamp with time zone DEFAULT now()
   );
   ```

2. **role_permissions**
   ```sql
   CREATE TABLE public.role_permissions (
       id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
       role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
       permission text NOT NULL,
       created_at timestamp with time zone DEFAULT now(),
       UNIQUE(role_id, permission)
   );
   ```

### Modified Tables

1. **admin_roles**
   - Added `role_id` (uuid) - Reference to assigned role
   - Added `is_custom_permissions` (boolean) - Flag for custom permission overrides

### Indexes

- `idx_role_permissions_role_id` on role_permissions(role_id)
- `idx_admin_roles_role_id` on admin_roles(role_id)

### RLS Policies

#### roles table
- **View**: All authenticated users
- **Insert/Update**: Super admins only
- **Delete**: Super admins only (non-system roles)

#### role_permissions table
- **View**: All authenticated users
- **All operations**: Super admins only

#### admin_roles table (updated)
- **View**: All authenticated users
- **All operations**: Super admins only

### Initial Data

Created 5 system roles with appropriate permissions:
- Super Admin (all 10 permissions)
- Full Admin (8 permissions, excluding manage_admins and manage_ratings)
- Treasurer (manage_payments only)
- Team Manager (manage_games, manage_teams)
- Player Manager (manage_players, manage_tokens)

### Triggers

- `update_roles_updated_at` trigger for automatic timestamp updates

## Rollback

```sql
-- Drop new columns
ALTER TABLE admin_roles DROP COLUMN IF EXISTS role_id;
ALTER TABLE admin_roles DROP COLUMN IF EXISTS is_custom_permissions;

-- Drop new tables
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS roles;

-- Drop indexes
DROP INDEX IF EXISTS idx_role_permissions_role_id;
DROP INDEX IF EXISTS idx_admin_roles_role_id;
```

## Notes

- Maintains backward compatibility with existing is_admin and is_super_admin flags
- Existing admins automatically assigned Full Admin role during migration
- Super admins automatically assigned Super Admin role