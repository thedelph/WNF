import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { PERMISSIONS, PERMISSION_DISPLAY_NAMES, PERMISSION_DESCRIPTIONS, Role } from '../../types/permissions';

const RoleManagement: React.FC = () => {
  const { isSuperAdmin, loading: adminLoading } = useAdmin();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!adminLoading && isSuperAdmin) {
      fetchRoles();
    }
  }, [adminLoading, isSuperAdmin]);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          is_system,
          created_at,
          updated_at,
          role_permissions!role_permissions_role_id_fkey (
            permission
          )
        `)
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;

      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }

    try {
      // Create the role
      const { data: newRole, error: roleError } = await supabase
        .from('roles')
        .insert({
          name: newRoleName,
          description: newRoleDescription || null,
          is_system: false
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Add permissions
      if (selectedPermissions.size > 0) {
        const permissionsToInsert = Array.from(selectedPermissions).map(permission => ({
          role_id: newRole.id,
          permission
        }));

        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert);

        if (permError) throw permError;
      }

      toast.success('Role created successfully');
      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setSelectedPermissions(new Set());
      fetchRoles();
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    }
  };

  const handleUpdateRolePermissions = async (roleId: string) => {
    try {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (selectedPermissions.size > 0) {
        const permissionsToInsert = Array.from(selectedPermissions).map(permission => ({
          role_id: roleId,
          permission
        }));

        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert);

        if (insertError) throw insertError;
      }

      toast.success('Role permissions updated successfully');
      setEditingRole(null);
      setSelectedPermissions(new Set());
      fetchRoles();
    } catch (error) {
      console.error('Error updating role permissions:', error);
      toast.error('Failed to update role permissions');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This will remove it from all admins who have it.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const startEditingRole = (role: Role) => {
    setEditingRole(role);
    const permissions = (role as any).role_permissions?.map((rp: any) => rp.permission) || [];
    setSelectedPermissions(new Set(permissions));
  };

  if (adminLoading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  if (!isSuperAdmin) {
    return <div className="text-center mt-8">Access denied. Super admin only.</div>;
  }

  if (loading) {
    return <div className="text-center mt-8">Loading roles...</div>;
  }

  return (
    <div className="container mx-auto mt-8 p-4">
      <motion.h1 
        className="text-3xl font-bold mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Role Management
      </motion.h1>

      <div className="mb-6">
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create New Role
        </button>
      </div>

      <div className="grid gap-6">
        {roles.map((role) => (
          <motion.div
            key={role.id}
            className="card bg-base-100 shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="card-title">
                    {role.name}
                    {role.is_system && <span className="badge badge-info ml-2">System</span>}
                  </h2>
                  {role.description && <p className="text-gray-600">{role.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => startEditingRole(role)}
                  >
                    Edit Permissions
                  </button>
                  {!role.is_system && (
                    <button
                      className="btn btn-sm btn-error"
                      onClick={() => handleDeleteRole(role.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-semibold mb-2">Permissions:</h3>
                <div className="flex flex-wrap gap-2">
                  {(role as any).role_permissions?.map((rp: any) => (
                    <span key={rp.permission} className="badge badge-primary">
                      {PERMISSION_DISPLAY_NAMES[rp.permission as keyof typeof PERMISSION_DISPLAY_NAMES] || rp.permission}
                    </span>
                  )) || <span className="text-gray-500">No permissions assigned</span>}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Create New Role</h3>
            
            <fieldset className="fieldset mb-4">
              <legend className="fieldset-legend">Role Name</legend>
              <input
                type="text"
                className="input"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g., Finance Manager"
              />
            </fieldset>

            <fieldset className="fieldset mb-4">
              <legend className="fieldset-legend">Description (optional)</legend>
              <textarea
                className="textarea textarea-bordered"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Describe this role's responsibilities"
                rows={3}
              />
            </fieldset>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Permissions</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(PERMISSIONS).map(([key, permission]) => (
                  <label key={permission} className="flex items-start cursor-pointer p-2 hover:bg-base-200 rounded">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary mt-1"
                      checked={selectedPermissions.has(permission)}
                      onChange={(e) => {
                        const newPermissions = new Set(selectedPermissions);
                        if (e.target.checked) {
                          newPermissions.add(permission);
                        } else {
                          newPermissions.delete(permission);
                        }
                        setSelectedPermissions(newPermissions);
                      }}
                    />
                    <div className="ml-3">
                      <div className="font-medium">{PERMISSION_DISPLAY_NAMES[permission]}</div>
                      <div className="text-sm text-gray-600">{PERMISSION_DESCRIPTIONS[permission]}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => {
                setShowCreateModal(false);
                setNewRoleName('');
                setNewRoleDescription('');
                setSelectedPermissions(new Set());
              }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateRole}>
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Permissions Modal */}
      {editingRole && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Edit Permissions for {editingRole.name}</h3>
            
            <div className="mb-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.entries(PERMISSIONS).map(([key, permission]) => (
                  <label key={permission} className="flex items-start cursor-pointer p-2 hover:bg-base-200 rounded">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary mt-1"
                      checked={selectedPermissions.has(permission)}
                      onChange={(e) => {
                        const newPermissions = new Set(selectedPermissions);
                        if (e.target.checked) {
                          newPermissions.add(permission);
                        } else {
                          newPermissions.delete(permission);
                        }
                        setSelectedPermissions(newPermissions);
                      }}
                    />
                    <div className="ml-3">
                      <div className="font-medium">{PERMISSION_DISPLAY_NAMES[permission]}</div>
                      <div className="text-sm text-gray-600">{PERMISSION_DESCRIPTIONS[permission]}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => {
                setEditingRole(null);
                setSelectedPermissions(new Set());
              }}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleUpdateRolePermissions(editingRole.id)}
              >
                Update Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;