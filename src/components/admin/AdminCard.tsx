import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-toastify'
import PermissionToggle from './PermissionToggle'

interface AdminCardProps {
  admin: any
  onUpdate: () => void
}

const AdminCard: React.FC<AdminCardProps> = ({ admin, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false)

  const handlePermissionToggle = async (permission: string, enabled: boolean) => {
    try {
      if (enabled) {
        const { error } = await supabase
          .from('admin_permissions')
          .insert({ player_id: admin.id, permission })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('admin_permissions')
          .delete()
          .match({ player_id: admin.id, permission })
        if (error) throw error
      }
      
      toast.success('Permissions updated')
      onUpdate()
    } catch (error) {
      toast.error('Failed to update permissions')
    }
  }

  const handleRemoveAdmin = async () => {
    try {
      const { error } = await supabase
        .from('players')
        .update({ is_admin: false })
        .eq('id', admin.id)

      if (error) throw error
      
      toast.success('Admin removed')
      onUpdate()
    } catch (error) {
      toast.error('Failed to remove admin')
    }
  }

  return (
    <motion.div
      className="card bg-base-100 shadow-xl"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="card-body">
        <h2 className="card-title">{admin.friendly_name}</h2>
        
        <div className="space-y-2">
          <PermissionToggle
            label="Manage Games"
            isEnabled={admin.admin_permissions.some(p => p.permission === 'manage_games')}
            onChange={(enabled) => handlePermissionToggle('manage_games', enabled)}
          />
          <PermissionToggle
            label="Manage Players"
            isEnabled={admin.admin_permissions.some(p => p.permission === 'manage_players')}
            onChange={(enabled) => handlePermissionToggle('manage_players', enabled)}
          />
          <PermissionToggle
            label="Manage Teams"
            isEnabled={admin.admin_permissions.some(p => p.permission === 'manage_teams')}
            onChange={(enabled) => handlePermissionToggle('manage_teams', enabled)}
          />
          <PermissionToggle
            label="Manage Payments"
            isEnabled={admin.admin_permissions.some(p => p.permission === 'manage_payments')}
            onChange={(enabled) => handlePermissionToggle('manage_payments', enabled)}
          />
        </div>

        <div className="card-actions justify-end mt-4">
          <button
            onClick={handleRemoveAdmin}
            className="btn btn-error btn-sm"
          >
            Remove Admin
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default AdminCard
