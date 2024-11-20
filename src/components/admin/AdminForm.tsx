import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-toastify'

interface AdminFormProps {
  onSubmit: (playerId: string) => void
  onCancel: () => void
}

const AdminForm: React.FC<AdminFormProps> = ({ onSubmit, onCancel }) => {
  const [players, setPlayers] = useState<any[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState('')

  useEffect(() => {
    fetchNonAdminPlayers()
  }, [])

  const fetchNonAdminPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('id, friendly_name')
      .eq('is_admin', false)
      .eq('is_super_admin', false)
      .order('friendly_name')

    if (error) {
      toast.error('Failed to fetch players')
      return
    }

    setPlayers(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlayer) {
      toast.error('Please select a player')
      return
    }

    try {
      const { error } = await supabase
        .from('players')
        .update({ is_admin: true })
        .eq('id', selectedPlayer)

      if (error) throw error

      toast.success('Admin added successfully')
      onSubmit(selectedPlayer)
    } catch (error) {
      toast.error('Failed to add admin')
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 mb-6"
      onSubmit={handleSubmit}
    >
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
