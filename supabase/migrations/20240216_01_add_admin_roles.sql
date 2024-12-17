-- Drop existing policies if they exist
DO $$ 
BEGIN
    -- Drop admin_roles policies
    BEGIN
        DROP POLICY IF EXISTS "Admins can view all roles" ON admin_roles;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    -- Drop admin_permissions policies
    BEGIN
        DROP POLICY IF EXISTS "Admins can view all permissions" ON admin_permissions;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
END $$;

-- Create admin roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_player_role UNIQUE (player_id)
);

-- Create admin permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_role_id UUID NOT NULL REFERENCES admin_roles(id),
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_role_permission UNIQUE (admin_role_id, permission)
);

-- Add RLS policies
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can view all roles and permissions
CREATE POLICY "Admins can view all roles"
ON admin_roles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_roles ar
        WHERE ar.player_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all permissions"
ON admin_permissions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_roles ar
        WHERE ar.player_id = auth.uid()
    )
);

-- Function to add admin role
CREATE OR REPLACE FUNCTION add_admin_role(
    p_player_id UUID,
    p_permissions TEXT[]
) RETURNS UUID AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Insert or get admin role
    INSERT INTO admin_roles (player_id)
    VALUES (p_player_id)
    ON CONFLICT (player_id) DO UPDATE
    SET updated_at = NOW()
    RETURNING id INTO v_role_id;

    -- Add permissions
    INSERT INTO admin_permissions (admin_role_id, permission)
    SELECT v_role_id, unnest(p_permissions)
    ON CONFLICT (admin_role_id, permission) DO NOTHING;

    RETURN v_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
