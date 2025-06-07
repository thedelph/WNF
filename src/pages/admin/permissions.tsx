import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAdmin } from '../../hooks/useAdmin'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-toastify'
import { motion } from 'framer-motion'
import AdminPermissionsCard from '../../components/admin/permissions/AdminPermissionsCard'

const AdminPermissions: React.FC = () => {
  const { user } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [admins, setAdmins] = useState<any[]>([])

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('admin_roles')
      .select(`
        id,
        player_id,
        is_super_admin,
        players (
          id,
          friendly_name
        ),
        admin_permissions (
          permission
        )
      `)

    if (error) {
      toast.error('Failed to fetch admins')
      return
    }

    setAdmins(data)
  }

  const handlePermissionToggle = async (adminId: string, permission: string, enabled: boolean) => {
    try {
      if (enabled) {
        const { error } = await supabase
          .from('admin_permissions')
          .insert({
            admin_role_id: adminId,
            permission
          })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('admin_permissions')
          .delete()
          .match({ admin_role_id: adminId, permission })
        if (error) throw error
      }

      toast.success('Permission updated successfully')
      fetchAdmins()
    } catch (error) {
      toast.error('Failed to update permission')
    }
  }

  if (adminLoading) {
    return <div className="text-center mt-8">Loading...</div>
  }

  if (!isAdmin) {
    return <div className="text-center mt-8">Access denied. Super admin only.</div>
  }

  return (
    <div className="container mx-auto mt-8 p-4">
      <motion.h1 
        className="text-3xl font-bold mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Admin Permissions
      </motion.h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {admins.map((admin) => (
          <AdminPermissionsCard
            key={admin.id}
            adminId={admin.id}
            adminName={admin.players.friendly_name}
            permissions={[
              { permission: 'manage_games', enabled: admin.admin_permissions.some(p => p.permission === 'manage_games') },
              { permission: 'manage_players', enabled: admin.admin_permissions.some(p => p.permission === 'manage_players') },
              { permission: 'manage_teams', enabled: admin.admin_permissions.some(p => p.permission === 'manage_teams') },
              { permission: 'manage_payments', enabled: admin.admin_permissions.some(p => p.permission === 'manage_payments') },
              { permission: 'manage_history', enabled: admin.admin_permissions.some(p => p.permission === 'manage_history') }
            ]}
            onPermissionToggle={(permission, enabled) => 
              handlePermissionToggle(admin.id, permission, enabled)
            }
          />
        ))}
      </div>
    </div>
  )
}

export default AdminPermissions
