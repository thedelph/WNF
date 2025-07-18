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
    <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-8">
      <Toaster position="top-right" />
      <motion.h1
        className="text-4xl font-bold text-primary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Player Management
      </motion.h1>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Player Management</h1>
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input input-bordered w-full sm:w-auto sm:max-w-xs"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSelectAll(!allFilteredSelected)}
            className="btn btn-outline btn-sm sm:btn-md sm:hidden"
          >
            {allFilteredSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={handleRecalculateXP}
            disabled={loading}
            className="btn btn-primary btn-sm sm:btn-md"
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <span className="flex items-center">
                <span className="hidden sm:inline">RECALCULATE </span>XP
              </span>
            )}
          </button>
          <button
            onClick={handleRecalculateStreaks}
            disabled={loading}
            className="btn btn-secondary btn-sm sm:btn-md"
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <span className="flex items-center">
                <span className="hidden sm:inline">RECALCULATE </span>STREAKS
              </span>
            )}
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-error btn-sm sm:btn-md"
            onClick={handleDeleteSelected}
          >
            <FaTrash className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Delete Selected</span>
            <span className="sm:hidden">Delete</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary btn-sm sm:btn-md"
            onClick={() => setShowCreateTestUserModal(true)}
          >
            <FaUserPlus className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Create Test User</span>
            <span className="sm:hidden">Create</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-secondary btn-sm sm:btn-md"
            onClick={() => setShowBulkCreateModal(true)}
          >
            <FaUsers className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Bulk Create Test Users</span>
            <span className="sm:hidden">Bulk</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-accent btn-sm sm:btn-md"
            onClick={() => setShowImportModal(true)}
          >
            <FaFileImport className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0 bg-base-200 rounded-lg shadow-lg">
          <div className="min-w-full px-4 sm:px-0">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="hidden sm:table-cell">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="checkbox checkbox-primary"
                    />
                  </th>
                  <th>Player</th>
                  <th className="hidden sm:table-cell">Caps</th>
                  <th className="hidden sm:table-cell">XP</th>
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
                    <td className="hidden sm:table-cell">
                      <input
                        type="checkbox"
                        checked={selectedPlayers.has(player.id)}
                        onChange={() => handleSelectPlayer(player.id)}
                        className="checkbox checkbox-primary"
                      />
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="checkbox"
                            checked={selectedPlayers.has(player.id)}
                            onChange={() => handleSelectPlayer(player.id)}
                            className="checkbox checkbox-primary checkbox-sm sm:hidden"
                          />
                          <span className="font-medium">{player.friendly_name}</span>
                          {player.is_test_user && (
                            <span className="badge badge-secondary badge-sm">Test User</span>
                          )}
                        </div>
                        <div className="sm:hidden flex gap-2 text-xs text-base-content/70">
                          <span className="badge badge-ghost badge-sm">Caps: {player.caps}</span>
                          <span className="badge badge-ghost badge-sm">XP: {player.xp}</span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">{player.caps}</td>
                    <td className="hidden sm:table-cell">{player.xp}</td>
                    <td>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        <Link
                          to={`/admin/players/${player.id}`}
                          className="btn btn-xs sm:btn-sm btn-info"
                        >
                          Edit
                        </Link>
                        {player.is_test_user && (
                          <button
                            className="btn btn-xs sm:btn-sm btn-primary"
                            onClick={() => {
                              setSelectedTestUser(player);
                              setShowMergeModal(true);
                            }}
                          >
                            <FaExchangeAlt className="hidden sm:inline mr-1" /> Merge
                          </button>
                        )}
                        <button
                          className="btn btn-xs sm:btn-sm btn-error"
                          onClick={() => handleDeleteSinglePlayer(player.id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
            </table>
          </div>
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