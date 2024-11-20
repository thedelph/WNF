import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FaTrash, FaUserPlus, FaUsers, FaFileImport } from 'react-icons/fa'
import { toast, Toaster } from 'react-hot-toast'
import { supabase, supabaseAdmin } from '../../utils/supabase'
import { useAdmin } from '../../hooks/useAdmin'
import CreateTestUserModal from '../../components/admin/modals/CreateTestUserModal'
import BulkCreateTestUsersModal from '../../components/admin/modals/BulkCreateTestUsersModal'
import ImportPlayersModal from '../../components/admin/modals/ImportPlayersModal'

type Player = {
  id: string
  friendly_name: string
  caps: number
  xp: number
  is_test_user: boolean
  attack_rating?: number
  defense_rating?: number
}

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateTestUserModal, setShowCreateTestUserModal] = useState(false)
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const { isAdmin } = useAdmin()
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())

  const fetchPlayers = async () => {
    const { data, error } = await supabase.from('players').select('*')

    if (error) {
      console.error('Error fetching players:', error)
      toast.error('Failed to fetch players')
    } else {
      setPlayers(data || [])
    }
    setLoading(false)
  }

  const handleSelectPlayer = (id: string) => {
    const newSelectedPlayers = new Set(selectedPlayers)
    if (newSelectedPlayers.has(id)) {
      newSelectedPlayers.delete(id)
    } else {
      newSelectedPlayers.add(id)
    }
    setSelectedPlayers(newSelectedPlayers)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = filteredPlayers.map(player => player.id)
      setSelectedPlayers(new Set(allFilteredIds))
    } else {
      setSelectedPlayers(new Set())
    }
  }

  const handleDeleteSelected = async () => {
    if (!isAdmin) {
      toast.error('You must be an admin to delete players')
      return
    }

    const confirmDelete = window.confirm('Are you sure you want to delete the selected players?')
    if (confirmDelete) {
      try {
        const { error } = await supabaseAdmin
          .from('players')
          .delete()
          .in('id', Array.from(selectedPlayers))
        
        if (error) throw error
        
        toast.success('Players deleted successfully')
        await fetchPlayers()
        setSelectedPlayers(new Set())
      } catch (error) {
        console.error('Delete error:', error)
        toast.error(`Failed to delete players: ${error.message}`)
      }
    }
  }

  const handleDeleteSinglePlayer = async (playerId: string) => {
    if (!isAdmin) {
      toast.error('You must be an admin to delete players')
      return
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this player?')
    if (confirmDelete) {
      try {
        const { error } = await supabaseAdmin
          .from('players')
          .delete()
          .eq('id', playerId)
        
        if (error) throw error
        
        toast.success('Player deleted successfully')
        await fetchPlayers()
      } catch (error) {
        console.error('Delete error:', error)
        toast.error(`Failed to delete player: ${error.message}`)
      }
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [])

  const filteredPlayers = players.filter((player) =>
    player.friendly_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const allFilteredSelected = filteredPlayers.length > 0 && filteredPlayers.every(player => selectedPlayers.has(player.id))

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Toaster position="top-right" />
      <motion.h1
        className="text-4xl font-bold text-primary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Player Management
      </motion.h1>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input input-bordered w-full max-w-xs"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-error"
          onClick={handleDeleteSelected}
        >
          <FaTrash className="mr-2" /> Delete Selected
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary"
          onClick={() => setShowCreateTestUserModal(true)}
        >
          <FaUserPlus className="mr-2" /> Create Test User
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-secondary"
          onClick={() => setShowBulkCreateModal(true)}
        >
          <FaUsers className="mr-2" /> Bulk Create Test Users
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-accent"
          onClick={() => setShowImportModal(true)}
        >
          <FaFileImport className="mr-2" /> Import CSV
        </motion.button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-base-200 rounded-lg shadow-lg">
          <table className="table w-full">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                </th>
                <th>Friendly Name</th>
                <th>Caps</th>
                <th>XP</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredPlayers.map((player) => (
                  <motion.tr
                    key={player.id}
                    className={player.is_test_user ? 'bg-base-300' : ''}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedPlayers.has(player.id)}
                        onChange={() => handleSelectPlayer(player.id)}
                        className="checkbox checkbox-primary"
                      />
                    </td>
                    <td>
                      {player.friendly_name}
                      {player.is_test_user && (
                        <span className="badge badge-secondary ml-2">Test User</span>
                      )}
                    </td>
                    <td>{player.caps}</td>
                    <td>{player.xp}</td>
                    <td>
                      <Link
                        to={`/admin/players/${player.id}`}
                        className="btn btn-sm btn-info mr-2"
                      >
                        Edit
                      </Link>
                      <button
                        className="btn btn-sm btn-error"
                        onClick={() => handleDeleteSinglePlayer(player.id)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <CreateTestUserModal
        isOpen={showCreateTestUserModal}
        onClose={() => setShowCreateTestUserModal(false)}
        onUserCreated={fetchPlayers}
      />

      <BulkCreateTestUsersModal
        isOpen={showBulkCreateModal}
        onClose={() => setShowBulkCreateModal(false)}
        onUsersCreated={fetchPlayers}
      />

      <ImportPlayersModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onPlayersImported={fetchPlayers}
      />
    </div>
  )
}