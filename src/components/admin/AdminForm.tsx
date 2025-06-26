import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-toastify'
import { Role } from '../../types/permissions'

interface AdminFormProps {
  roles: Role[]
  onSubmit: (playerId: string, roleId: string | null) => void
  onCancel: () => void
}

const AdminForm: React.FC<AdminFormProps> = ({ roles, onSubmit, onCancel }) => {
  const [players, setPlayers] = useState<any[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [useDefaultAdmin, setUseDefaultAdmin] = useState(true)

  useEffect(() => {
    fetchNonAdminPlayers()
  }, [])

  const fetchNonAdminPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select(`
        id, 
        friendly_name,
        admin_roles!admin_roles_player_id_fkey (id)
      `)
      .order('friendly_name')

    if (error) {
      toast.error('Failed to fetch players')
      return
    }

    // Filter out players who already have admin roles or admin flags
    const nonAdmins = data?.filter(player => 
      !player.admin_roles || player.admin_roles.length === 0
    ) || []

    setPlayers(nonAdmins)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlayer) {
      toast.error('Please select a player')
      return
    }

    if (!useDefaultAdmin && !selectedRole) {
      toast.error('Please select a role')
      return
    }

    try {
      if (useDefaultAdmin) {
        // Traditional admin (is_admin = true)
        const { error } = await supabase
          .from('players')
          .update({ is_admin: true })
          .eq('id', selectedPlayer)

        if (error) throw error
      } else {
        // Role-based admin
        const { data: adminRole, error: roleError } = await supabase
          .from('admin_roles')
          .insert({
            player_id: selectedPlayer,
            role_id: selectedRole
          })
          .select()
          .single()

        if (roleError) throw roleError
      }

      toast.success('Admin added successfully')
      onSubmit(selectedPlayer, useDefaultAdmin ? null : selectedRole)
    } catch (error) {
      toast.error('Failed to add admin')
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 mb-6 p-4 bg-base-200 rounded-lg"
      onSubmit={handleSubmit}
    >
      <div>
        <label className="label">
          <span className="label-text">Select Player</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
        >
          <option value="">Select a player</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.friendly_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">
          <span className="label-text">Admin Type</span>
        </label>
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              className="radio radio-primary"
              checked={useDefaultAdmin}
              onChange={() => setUseDefaultAdmin(true)}
            />
            <span className="ml-2">Full Admin (Traditional)</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              className="radio radio-primary"
              checked={!useDefaultAdmin}
              onChange={() => setUseDefaultAdmin(false)}
            />
            <span className="ml-2">Role-based Admin</span>
          </label>
        </div>
      </div>

      {!useDefaultAdmin && (
        <div>
          <label className="label">
            <span className="label-text">Select Role</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} - {role.description}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary flex-1">
          Add Admin
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost flex-1">
          Cancel
        </button>
      </div>
    </motion.form>
  )
}

export default AdminForm
