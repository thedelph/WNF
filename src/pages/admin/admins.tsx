import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAdmin } from '../../hooks/useAdmin'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-toastify'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import FormContainer from '../../components/common/containers/FormContainer'
import AdminList from '../../components/admin/AdminList'
import AdminForm from '../../components/admin/AdminForm'
import { Role } from '../../types/permissions'

const AdminManagement: React.FC = () => {
  const { user } = useAuth()
  const { isSuperAdmin, loading: adminLoading } = useAdmin()
  const [admins, setAdmins] = useState<any[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isAddingAdmin, setIsAddingAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins()
      fetchRoles()
    }
  }, [isSuperAdmin])

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to fetch roles')
      return
    }

    setRoles(data || [])
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
              </div>

              {/* Search Box */}
              <div className="form-control w-full sm:w-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search admins..."
                    className="input input-bordered w-full sm:w-80 pr-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
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
              <div className="text-center py-8 text-gray-500">
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
      </div>
    </motion.div>
  )
}

export default AdminManagement
