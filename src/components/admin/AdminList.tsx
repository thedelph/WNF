import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../utils/supabase'
import toast from 'react-hot-toast'
import { Role, PERMISSION_DISPLAY_NAMES, PERMISSIONS } from '../../types/permissions'

interface AdminListProps {
  admins: any[]
  roles: Role[]
  onUpdate: () => void
}

const AdminList: React.FC<AdminListProps> = ({ admins, roles, onUpdate }) => {
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({})
  const [expandedPermissions, setExpandedPermissions] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchRolePermissions()
  }, [])

  // Re-fetch when admins change to ensure we have the latest role IDs
  useEffect(() => {
    if (admins.length > 0) {
      fetchRolePermissions()
    }
  }, [admins])

  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role_id, permission')

      if (error) throw error

      const permissionsByRole: Record<string, string[]> = {}
      data?.forEach(rp => {
        if (!permissionsByRole[rp.role_id]) {
          permissionsByRole[rp.role_id] = []
        }
        permissionsByRole[rp.role_id].push(rp.permission)
      })

      setRolePermissions(permissionsByRole)
    } catch (error) {
      console.error('Error fetching role permissions:', error)
    }
  }

  const handleRemoveAdmin = async (admin: any) => {
    try {
      if (admin.admin_roles && admin.admin_roles.length > 0) {
        // Remove from admin_roles table
        const { error } = await supabase
          .from('admin_roles')
          .delete()
          .eq('player_id', admin.id)

        if (error) throw error
      } else if (admin.is_admin && !admin.is_super_admin) {
        // Remove traditional admin flag
        const { error } = await supabase
          .from('players')
          .update({ is_admin: false })
          .eq('id', admin.id)

        if (error) throw error
      }

      toast.success('Admin removed successfully')
      onUpdate()
    } catch (error) {
      toast.error('Failed to remove admin')
    }
  }

  const handleUpdateRole = async (_adminId: string, adminRoleId: string) => {
    try {
      const { error } = await supabase
        .from('admin_roles')
        .update({ role_id: selectedRoleId })
        .eq('id', adminRoleId)

      if (error) throw error

      toast.success('Role updated successfully')
      setEditingAdminId(null)
      onUpdate()
    } catch (error) {
      toast.error('Failed to update role')
    }
  }

  const startEditingRole = (adminId: string, currentRoleId: string) => {
    setEditingAdminId(adminId)
    setSelectedRoleId(currentRoleId)
  }

  const togglePermissions = (adminId: string) => {
    const newExpanded = new Set(expandedPermissions)
    if (newExpanded.has(adminId)) {
      newExpanded.delete(adminId)
    } else {
      newExpanded.add(adminId)
    }
    setExpandedPermissions(newExpanded)
  }

  const getAdminTypeDisplay = (admin: any) => {
    if (admin.is_super_admin) return 'Super Admin'
    if (admin.admin_roles && admin.admin_roles.length > 0) {
      return admin.admin_roles[0].role?.name || 'Role-based Admin'
    }
    if (admin.is_admin) return 'Full Admin'
    return 'Unknown'
  }

  const getAdminTypeBadge = (admin: any) => {
    if (admin.is_super_admin) {
      return (
        <div className="badge badge-error gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Super Admin
        </div>
      )
    }
    if (admin.admin_roles && admin.admin_roles.length > 0) {
      return (
        <div className="badge badge-secondary gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {admin.admin_roles[0].role?.name}
        </div>
      )
    }
    if (admin.is_admin) {
      return (
        <div className="badge badge-primary gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Full Admin
        </div>
      )
    }
    return <div className="badge badge-ghost">Unknown</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      <AnimatePresence>
        {admins.map((admin) => (
          <motion.div
            key={admin.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="card bg-base-100 shadow-xl h-full"
          >
            <div className="card-body flex flex-col h-full">
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex justify-between items-start">
                  <h2 className="card-title text-lg">{admin.friendly_name}</h2>
                  {getAdminTypeBadge(admin)}
                </div>
                
                {admin.admin_roles && admin.admin_roles.length > 0 && admin.admin_roles[0].role?.description && (
                  <p className="text-sm opacity-70">{admin.admin_roles[0].role.description}</p>
                )}
              </div>

              {/* Show permissions section */}
              {(admin.is_super_admin || admin.is_admin || (admin.admin_roles && admin.admin_roles.length > 0)) && (
                <div className="bg-base-200 rounded-lg mb-4">
                  <button 
                    className="flex items-center justify-between w-full text-left text-sm font-medium p-3 hover:bg-base-300 transition-colors rounded-lg"
                    onClick={() => togglePermissions(admin.id)}
                  >
                    <span>View Permissions</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 transition-transform ${expandedPermissions.has(admin.id) ? 'rotate-90' : ''}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {expandedPermissions.has(admin.id) && (
                    <div className="px-3 pb-3">
                      {admin.is_super_admin ? (
                      <div>
                        <p className="text-sm font-medium mb-2">All Permissions</p>
                        <p className="text-xs opacity-70">Super Admins have unrestricted access to all system features.</p>
                      </div>
                    ) : admin.is_admin && !admin.admin_roles?.length ? (
                      <div>
                        <p className="text-sm font-medium mb-2">Full Admin Access</p>
                        <div className="space-y-1">
                          {Object.entries(PERMISSION_DISPLAY_NAMES)
                            .filter(([permission]) => permission !== PERMISSIONS.MANAGE_ADMINS && permission !== PERMISSIONS.MANAGE_RATINGS)
                            .map(([permission, name]) => (
                              <div key={permission} className="flex items-center gap-2 text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{name}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : admin.admin_roles && admin.admin_roles.length > 0 && admin.admin_roles[0].role_id ? (
                      <div>
                        <p className="text-sm font-medium mb-2">Role-based Permissions</p>
                        {rolePermissions[admin.admin_roles[0].role_id] ? (
                          <div className="space-y-1">
                            {rolePermissions[admin.admin_roles[0].role_id].length > 0 ? (
                              rolePermissions[admin.admin_roles[0].role_id].map((permission) => (
                                <div key={permission} className="flex items-center gap-2 text-sm">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>{PERMISSION_DISPLAY_NAMES[permission as keyof typeof PERMISSION_DISPLAY_NAMES] || permission}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs opacity-70">No permissions assigned to this role.</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs opacity-70">Loading permissions...</p>
                        )}
                      </div>
                    ) : null}
                    {!admin.is_super_admin && (
                      <p className="text-xs opacity-50 mt-3">
                        To modify permissions, {admin.admin_roles?.length ? 'edit the role in Role Management' : 'contact a Super Admin'}.
                      </p>
                    )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-auto">
                {editingAdminId === admin.id && admin.admin_roles && admin.admin_roles.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      className="select select-sm w-full"
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateRole(admin.id, admin.admin_roles[0].id)}
                        className="btn btn-primary btn-sm flex-1"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingAdminId(null)}
                        className="btn btn-ghost btn-sm flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  !admin.is_super_admin && (
                    <div className="card-actions justify-end flex-wrap gap-2">
                      {admin.admin_roles && admin.admin_roles.length > 0 && (
                        <button
                          onClick={() => startEditingRole(admin.id, admin.admin_roles[0].role_id)}
                          className="btn btn-outline btn-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Change Role
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveAdmin(admin)}
                        className="btn btn-error btn-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default AdminList
