'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BiUser } from 'react-icons/bi'
import { FiEdit, FiTrash2 } from 'react-icons/fi'
import { supabaseAdmin } from '../../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { Game } from '../../../../types/game'
import EditGameModal from './EditGameModal'

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
    <>
      <motion.div 
        className="card bg-base-100 shadow-xl"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        <div className="card-body">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="card-title">
                Game #{game.sequence_number?.toString().padStart(3, '0')} - {
                  new Date(game.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    timeZone: 'UTC'  // Keep UTC interpretation for consistent dates
                  })
                }
              </h3>
              <div className="mt-2 space-y-1">
                <p className="text-sm">
                  Score: {game.score_blue !== null && game.score_orange !== null 
                    ? `${game.score_blue} - ${game.score_orange}`
                    : 'Unknown'}
                </p>
                <p className="text-sm">
                  Result: {game.outcome 
                    ? game.outcome.replace('_', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase())
                    : 'Unknown'}
                </p>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                className="btn btn-circle btn-sm"
                onClick={() => setShowPlayers(!showPlayers)}
                title="Show Players"
              >
                <BiUser size={16} />
              </button>
              <button
                className="btn btn-circle btn-sm"
                onClick={() => setShowEditModal(true)}
                title="Edit Game"
              >
                <FiEdit size={16} />
              </button>
              <button
                className="btn btn-circle btn-sm btn-error"
                onClick={handleDelete}
                disabled={isDeleting}
                title="Delete Game"
              >
                <FiTrash2 size={16} />
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
        </div>
      </motion.div>

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
    </>
  )
}

export default GameCard