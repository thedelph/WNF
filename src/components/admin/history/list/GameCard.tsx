'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BiUser } from 'react-icons/bi'
import { FiEdit, FiTrash2 } from 'react-icons/fi'
import { FaCalendar, FaClock, FaMapMarkerAlt } from 'react-icons/fa'
import { supabaseAdmin } from '../../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { Game } from '../../../../types/game'
import EditGameModal from './EditGameModal'
import { formatDate, formatTime } from '../../../../utils/dateUtils'

interface Props {
  game: Game
  onGameDeleted: () => void
}

const GameCard: React.FC<Props> = ({ game, onGameDeleted }) => {
  const [showEditModal, setShowEditModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPlayers, setShowPlayers] = useState(false)

  useEffect(() => {
    if (showPlayers) {
      console.log('Game registrations:', game.game_registrations)
      console.log('Sample registration:', game.game_registrations?.[0])
    }
  }, [showPlayers, game.game_registrations])

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this historical game?')) {
      return
    }

    setIsDeleting(true)
    try {
      // First delete all game registrations
      const { error: registrationsError } = await supabaseAdmin
        .from('game_registrations')
        .delete()
        .eq('game_id', game.id)

      if (registrationsError) throw registrationsError

      // Then delete the game
      const { error: gameError } = await supabaseAdmin
        .from('games')
        .delete()
        .eq('id', game.id)

      if (gameError) throw gameError
      
      toast.success('Game deleted successfully')
      onGameDeleted()
    } catch (error) {
      console.error('Error deleting game:', error)
      toast.error('Failed to delete game')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-base-200 rounded-lg p-4 shadow-sm"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {formatDate(game.date)} at {formatTime(game.time)}
          </h3>
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-gray-500" />
            <span>{game.location}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="btn btn-sm btn-ghost"
          >
            <FiEdit />
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-sm btn-ghost text-error"
            disabled={isDeleting}
          >
            <FiTrash2 />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showPlayers && game.game_registrations && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-blue-500 mb-2">Blue Team</h4>
                <ul className="space-y-1">
                  {game.game_registrations
                    .filter(reg => reg.team === 'blue')
                    .map(reg => (
                      <li key={reg.id} className="text-sm">
                        {reg.players?.friendly_name || `Player data: ${JSON.stringify(reg.players)}`}
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-orange-500 mb-2">Orange Team</h4>
                <ul className="space-y-1">
                  {game.game_registrations
                    .filter(reg => reg.team === 'orange')
                    .map(reg => (
                      <li key={reg.id} className="text-sm">
                        {reg.players?.friendly_name || `Player data: ${JSON.stringify(reg.players)}`}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showEditModal && (
        <EditGameModal
          game={game}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            onGameDeleted();
            setShowEditModal(false);
          }}
        />
      )}
    </motion.div>
  )
}

export default GameCard