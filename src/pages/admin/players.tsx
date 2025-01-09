import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FaTrash, FaUserPlus, FaUsers, FaFileImport, FaExchangeAlt } from 'react-icons/fa'
import { toast, Toaster } from 'react-hot-toast'
import { supabase, supabaseAdmin } from '../../utils/supabase'
import { useAdmin } from '../../hooks/useAdmin'
import CreateTestUserModal from '../../components/admin/modals/CreateTestUserModal'
import BulkCreateTestUsersModal from '../../components/admin/modals/BulkCreateTestUsersModal'
import ImportPlayersModal from '../../components/admin/modals/ImportPlayersModal'
import MergeTestUserModal from '../../components/admin/modals/MergeTestUserModal'

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
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [selectedTestUser, setSelectedTestUser] = useState<Player | null>(null)
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

    const confirmDelete = window.confirm(
      'Are you sure you want to delete all selected players?'
    )
    if (confirmDelete) {
      try {
        const playerIds = Array.from(selectedPlayers)

        // First delete all player_xp records
        const { error: xpError } = await supabaseAdmin
          .from('player_xp')
          .delete()
          .in('player_id', playerIds)

        if (xpError) throw xpError

        // Then delete all selected players
        const { error } = await supabaseAdmin
          .from('players')
          .delete()
          .in('id', playerIds)

        if (error) throw error

        toast.success('Players deleted successfully')
        setSelectedPlayers(new Set())
        await fetchPlayers()
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
        // First delete the player_xp record
        const { error: xpError } = await supabaseAdmin
          .from('player_xp')
          .delete()
          .eq('player_id', playerId)

        if (xpError) throw xpError

        // Then delete the player
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

  const handleRecalculateXP = async () => {
    try {
      // Show confirmation dialog
      if (!window.confirm('Are you sure you want to recalculate XP for all players? This may take a few moments.')) {
        return;
      }

      // Start loading state
      setLoading(true);
      toast.loading('Recalculating XP for all players...');

      const { error } = await supabase
        .rpc('admin_recalculate_all_player_xp');

      if (error) throw error;

      // Refresh the player list
      fetchPlayers();
      
      toast.success('Successfully recalculated XP for all players!');
    } catch (error) {
      console.error('Error recalculating XP:', error);
      toast.error('Failed to recalculate XP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateStreaks = async () => {
    try {
      // Show confirmation dialog
      if (!window.confirm('Are you sure you want to recalculate streaks for all players? This may take a few moments.')) {
        return;
      }

      // Start loading state
      setLoading(true);
      toast.loading('Recalculating streaks for all players...');

      const { error } = await supabase
        .rpc('admin_recalculate_all_player_streaks');

      if (error) throw error;

      // Refresh the player list
      fetchPlayers();
      
      toast.success('Successfully recalculated streaks for all players!');
    } catch (error) {
      console.error('Error recalculating streaks:', error);
      toast.error('Failed to recalculate streaks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Player Management</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRecalculateXP}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              'RECALCULATE XP'
            )}
          </button>
          <button
            onClick={handleRecalculateStreaks}
            disabled={loading}
            className="btn btn-secondary"
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              'RECALCULATE STREAKS'
            )}
          </button>
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
                      {player.is_test_user && (
                        <button
                          className="btn btn-sm btn-primary mr-2"
                          onClick={() => {
                            setSelectedTestUser(player);
                            setShowMergeModal(true);
                          }}
                        >
                          <FaExchangeAlt className="mr-1" /> Merge
                        </button>
                      )}
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

      {selectedTestUser && (
        <MergeTestUserModal
          isOpen={showMergeModal}
          onClose={() => {
            setShowMergeModal(false);
            setSelectedTestUser(null);
          }}
          onMergeCompleted={fetchPlayers}
          testUser={selectedTestUser}
        />
      )}
    </div>
  )
}