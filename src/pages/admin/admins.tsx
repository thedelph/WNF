import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAdmin } from '../../hooks/useAdmin'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-toastify'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import FormContainer from '../../components/common/containers/FormContainer'
import AdminList from '../../components/admin/AdminList'
import AdminForm from '../../components/admin/AdminForm'
import { Role, PERMISSIONS, Permission } from '../../types/permissions'
import { useViewAs } from '../../context/ViewAsContext'

const AdminManagement: React.FC = () => {
  const { user } = useAuth()
  const { isSuperAdmin, loading: adminLoading } = useAdmin()
  const { setViewAsAdmin } = useViewAs()
  const navigate = useNavigate()
  const [admins, setAdmins] = useState<any[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isAddingAdmin, setIsAddingAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showViewAsModal, setShowViewAsModal] = useState(false)
  const [selectedViewAsAdmin, setSelectedViewAsAdmin] = useState<string | null>(null)

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins()
      fetchRoles()
    }
  }, [isSuperAdmin])

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions!role_permissions_role_id_fkey (
          permission
        )
      `)
      .order('name')

    if (error) {
      toast.error('Failed to fetch roles')
      return
    }

    // Transform data to include permissions array
    const rolesWithPermissions = (data || []).map(role => ({
      ...role,
      permissions: role.role_permissions?.map((rp: any) => rp.permission) || []
    }))

    setRoles(rolesWithPermissions)
  }

  const fetchAdmins = async () => {
    // First fetch all players who are admins or have admin roles
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select(`
        id,
        user_id,
        friendly_name,
        is_admin,
        is_super_admin
      `)
      .or('is_admin.eq.true,is_super_admin.eq.true')
      .order('friendly_name')

    if (playersError) {
      toast.error('Failed to fetch admin players')
      return
    }

    // Then fetch all admin roles with their associated players
    const { data: adminRolesData, error: rolesError } = await supabase
      .from('admin_roles')
      .select(`
        id,
        role_id,
        player_id,
        player:players!admin_roles_player_id_fkey (
          id,
          user_id,
          friendly_name,
          is_admin,
          is_super_admin
        ),
        role:roles!admin_roles_role_id_fkey (
          id,
          name,
          description
        )
      `)

    if (rolesError) {
      toast.error('Failed to fetch admin roles')
      return
    }

    // Combine the data
    const adminMap = new Map()
    
    // Add traditional admins
    playersData?.forEach(player => {
      adminMap.set(player.id, {
        ...player,
        admin_roles: []
      })
    })

    // Add role-based admins
    adminRolesData?.forEach(adminRole => {
      if (adminRole.player) {
        if (!adminMap.has(adminRole.player.id)) {
          adminMap.set(adminRole.player.id, {
            ...adminRole.player,
            admin_roles: []
          })
        }
        const admin = adminMap.get(adminRole.player.id)
        admin.admin_roles.push({
          id: adminRole.id,
          role_id: adminRole.role_id,
          role: adminRole.role
        })
      }
    })

    const combinedAdmins = Array.from(adminMap.values()).sort((a, b) => 
      a.friendly_name.localeCompare(b.friendly_name)
    )
    
    setAdmins(combinedAdmins)
  }

  // Calculate admin statistics
  const adminStats = useMemo(() => {
    const superAdmins = admins.filter(a => a.is_super_admin).length
    const fullAdmins = admins.filter(a => a.is_admin && !a.is_super_admin && (!a.admin_roles || a.admin_roles.length === 0)).length
    const roleBasedAdmins = admins.filter(a => a.admin_roles && a.admin_roles.length > 0).length
    const totalAdmins = admins.length
    
    return { superAdmins, fullAdmins, roleBasedAdmins, totalAdmins }
  }, [admins])

  // Filter admins based on search query
  const filteredAdmins = useMemo(() => {
    if (!searchQuery) return admins
    
    const query = searchQuery.toLowerCase()
    return admins.filter(admin => {
      const nameMatch = admin.friendly_name.toLowerCase().includes(query)
      const roleMatch = admin.admin_roles?.[0]?.role?.name?.toLowerCase().includes(query)
      const typeMatch = (
        (admin.is_super_admin && 'super admin'.includes(query)) ||
        (admin.is_admin && !admin.is_super_admin && !admin.admin_roles?.length && 'full admin'.includes(query)) ||
        (admin.admin_roles?.length > 0 && 'role'.includes(query))
      )
      
      return nameMatch || roleMatch || typeMatch
    })
  }, [admins, searchQuery])

  const handleViewAs = async () => {
    if (!selectedViewAsAdmin) {
      toast.error('Please select an admin to view as')
      return
    }

    const admin = admins.find(a => a.id === selectedViewAsAdmin)
    if (!admin) {
      toast.error('Admin not found')
      return
    }

    // Calculate permissions for the selected admin
    let permissions: Permission[] = []
    
    if (admin.is_super_admin) {
      // Super admin has all permissions
      permissions = Object.values(PERMISSIONS)
    } else if (admin.is_admin && !admin.admin_roles?.length) {
      // Traditional admin has all non-super permissions
      permissions = Object.values(PERMISSIONS).filter(
        p => p !== PERMISSIONS.MANAGE_ADMINS && p !== PERMISSIONS.MANAGE_RATINGS
      )
    } else if (admin.admin_roles?.length > 0) {
      // Role-based admin - collect permissions from roles
      const rolePermissions = new Set<Permission>()
      
      admin.admin_roles.forEach((adminRole: any) => {
        // Get permissions from role_permissions table
        const rolePerms = roles.find(r => r.id === adminRole.role_id)?.permissions || []
        rolePerms.forEach(p => rolePermissions.add(p as Permission))
      })
      
      permissions = Array.from(rolePermissions)
    }

    // Fetch additional user data
    const { data: playerData } = await supabase
      .from('players')
      .select('user_id, is_beta_tester')
      .eq('id', admin.id)
      .single()

    // Set the view as admin context
    setViewAsAdmin({
      id: admin.id,
      user_id: playerData?.user_id || '',
      friendly_name: admin.friendly_name,
      is_admin: admin.is_admin,
      is_super_admin: admin.is_super_admin,
      is_beta_tester: playerData?.is_beta_tester || false,
      permissions,
      roleName: admin.admin_roles?.[0]?.role?.name
    })

    // Close modal and navigate to admin portal
    setShowViewAsModal(false)
    navigate('/admin')
    toast.success(`Now viewing as ${admin.friendly_name}`)
  }

  if (adminLoading) {
    return <div className="text-center mt-8">Loading...</div>
  }

  if (!isSuperAdmin) {
    return <div className="text-center mt-8">Access denied. Super admin only.</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-base-100"
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl font-bold mb-8">Admin Management</h1>
          {/* Admin Stats Header */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="stat bg-base-200 rounded-lg p-4 shadow-sm">
              <div className="stat-title text-sm">Total Admins</div>
              <div className="stat-value text-3xl">{adminStats.totalAdmins}</div>
              <div className="stat-desc">All admin users</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4 shadow-sm">
              <div className="stat-title text-sm">Super Admins</div>
              <div className="stat-value text-3xl text-error">{adminStats.superAdmins}</div>
              <div className="stat-desc">Full system access</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4 shadow-sm">
              <div className="stat-title text-sm">Full Admins</div>
              <div className="stat-value text-3xl text-primary">{adminStats.fullAdmins}</div>
              <div className="stat-desc">Traditional admins</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4 shadow-sm">
              <div className="stat-title text-sm">Role-based</div>
              <div className="stat-value text-3xl text-secondary">{adminStats.roleBasedAdmins}</div>
              <div className="stat-desc">Limited permissions</div>
            </div>
          </div>

          {/* Info Alert */}
          <div className="alert alert-info shadow-lg mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="flex-1">
              <h3 className="font-bold">Role-Based Admin System</h3>
              <div className="text-sm">
                You can now assign specific roles with limited permissions to admins. 
                Create and manage roles to control what each admin can access.
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-base-200 rounded-lg p-4 mb-8">
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
              <div className="flex flex-col sm:flex-row gap-3">
                {!isAddingAdmin ? (
                  <button
                    onClick={() => setIsAddingAdmin(true)}
                    className="btn btn-primary"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Admin
                  </button>
                ) : null}
                <Link 
                  to="/admin/roles" 
                  className="btn btn-secondary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Manage Roles
                </Link>
                <button
                  onClick={() => setShowViewAsModal(true)}
                  className="btn btn-accent"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View As
                </button>
              </div>

              {/* Search Box */}
              <fieldset className="fieldset w-full sm:w-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search admins..."
                    className="input w-full sm:w-80 pr-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </fieldset>
            </div>
          </div>

          {/* Role Information */}
          <div className="divider">Available Roles ({roles.length})</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {roles.map(role => (
              <div key={role.id} className="badge badge-lg badge-outline">
                {role.name}
                {role.description && (
                  <div className="tooltip tooltip-bottom ml-1" data-tip={role.description}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Admin Form */}
          {isAddingAdmin && (
            <AdminForm
              roles={roles}
              onSubmit={async (playerId, roleId) => {
                await fetchAdmins()
                setIsAddingAdmin(false)
              }}
              onCancel={() => setIsAddingAdmin(false)}
            />
          )}

          {/* Admin List */}
          <div>
            {filteredAdmins.length === 0 && searchQuery && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No admins found matching "{searchQuery}"
              </div>
            )}
            <AdminList
              admins={filteredAdmins}
              roles={roles}
              onUpdate={fetchAdmins}
            />
          </div>
        </motion.div>

        {/* View As Modal */}
        {showViewAsModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <h3 className="font-bold text-lg mb-4">View As Admin</h3>
              <p className="text-sm text-base-content/70 mb-6">
                Select an admin to emulate their permissions and see what they would see in the admin portal.
                You will be redirected to the admin portal with their permissions.
              </p>
              
              <fieldset className="fieldset mb-6">
                <legend className="fieldset-legend">Select Admin</legend>
                <select
                  className="select w-full"
                  value={selectedViewAsAdmin || ''}
                  onChange={(e) => setSelectedViewAsAdmin(e.target.value || null)}
                >
                  <option value="">Choose an admin...</option>
                  {filteredAdmins.map(admin => {
                    let adminType = ''
                    if (admin.is_super_admin) {
                      adminType = ' (Super Admin)'
                    } else if (admin.is_admin && !admin.admin_roles?.length) {
                      adminType = ' (Full Admin)'
                    } else if (admin.admin_roles?.length > 0) {
                      adminType = ` (${admin.admin_roles[0]?.role?.name || 'Role-based'})`
                    }

                    return (
                      <option key={admin.id} value={admin.id}>
                        {admin.friendly_name}{adminType}
                      </option>
                    )
                  })}
                </select>
              </fieldset>

              {selectedViewAsAdmin && (
                <div className="alert alert-warning mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>You will be viewing the admin portal with this user's permissions. An indicator will show you're in "View As" mode.</span>
                </div>
              )}

              <div className="modal-action">
                <button 
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowViewAsModal(false)
                    setSelectedViewAsAdmin(null)
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleViewAs}
                  disabled={!selectedViewAsAdmin}
                >
                  View As Selected Admin
                </button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => {
              setShowViewAsModal(false)
              setSelectedViewAsAdmin(null)
            }}></div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default AdminManagement
