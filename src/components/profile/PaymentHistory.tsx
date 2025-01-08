import React, { useEffect, useState } from 'react'
import { supabaseAdmin } from '../../utils/supabase'
import { useUser } from '../../hooks/useUser'
import { PaymentStatus } from '../payments/PaymentStatus'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { AnimatePresence } from 'framer-motion'

interface GamePayment {
  id: string
  date: string
  sequence_number: number
  payment_link: string | null
  payment_status: string | null
  venue: {
    name: string
  }
}

const PaymentHistory = () => {
  const { player } = useUser()
  const [games, setGames] = useState<GamePayment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPaymentHistory = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('game_registrations')
        .select(`
          payment_status,
          games:game_id (
            id,
            date,
            sequence_number,
            payment_link,
            venue:venues (
              name
            )
          )
        `)
        .eq('player_id', player?.id)
        .eq('status', 'selected')
        .order('games(date)', { ascending: false })
        .order('games(sequence_number)', { ascending: false })
        .limit(10)

      if (error) throw error

      // Transform the data to include payment_status
      const transformedGames = data?.map(d => ({
        ...d.games,
        payment_status: d.payment_status
      })).filter(game => game) || []

      setGames(transformedGames)
    } catch (error) {
      console.error('Error fetching payment history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (player?.id) {
      fetchPaymentHistory()
    }
  }, [player?.id])

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold mb-4">Recent Games & Payments</h2>
        <p className="text-gray-500">No recent games found.</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <h2 className="text-xl font-semibold mb-4">Recent Games & Payments</h2>
      
      {/* Desktop View - Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="bg-base-200">
              <th className="w-20">Game</th>
              <th className="w-32">Date</th>
              <th>Venue</th>
              <th className="w-32">Payment Status</th>
              <th className="w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {games.map((game) => (
                <TableRow 
                  key={game.id} 
                  game={game} 
                  onRefresh={fetchPaymentHistory}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile View - Cards */}
      <div className="md:hidden space-y-4">
        <AnimatePresence>
          {games.map((game) => (
            <PaymentCard 
              key={game.id} 
              game={game} 
              onRefresh={fetchPaymentHistory}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

interface RowProps {
  game: GamePayment
  onRefresh: () => Promise<void>
}

const PaymentButton = ({ game }: { game: GamePayment }) => {
  const isVerified = game.payment_status === 'verified' || game.payment_status === 'admin_verified'
  
  if (!game.payment_link) return null

  return (
    <motion.div
      whileHover={!isVerified ? { scale: 1.05 } : {}}
      whileTap={!isVerified ? { scale: 0.95 } : {}}
    >
      <a
        href={game.payment_link}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(
          "btn btn-sm",
          isVerified ? "btn-disabled opacity-50" : "btn-primary"
        )}
        onClick={(e) => {
          if (isVerified) {
            e.preventDefault()
          }
        }}
      >
        Pay Now
      </a>
    </motion.div>
  )
}

const TableRow = ({ game, onRefresh }: RowProps) => {
  const { player } = useUser()
  
  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <td>WNF #{game.sequence_number}</td>
      <td>{format(new Date(game.date), 'MMM d, yyyy')}</td>
      <td>{game.venue.name}</td>
      <td>
        <PaymentStatus 
          gameId={game.id}
          playerId={player?.id || ''}
          onStatusChange={onRefresh}
        />
      </td>
      <td>
        <PaymentButton game={game} />
      </td>
    </motion.tr>
  )
}

const PaymentCard = ({ game, onRefresh }: RowProps) => {
  const { player } = useUser()
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        "card bg-base-200 shadow-lg",
        game.payment_status === 'paid' && 'border-l-4 border-success',
        game.payment_status === 'pending' && 'border-l-4 border-warning',
        !game.payment_status && 'border-l-4 border-error'
      )}
    >
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">WNF #{game.sequence_number}</span>
            <span className="text-sm opacity-70">
              {format(new Date(game.date), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="badge badge-sm badge-ghost">
            {game.venue.name}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <PaymentStatus 
            gameId={game.id}
            playerId={player?.id || ''}
            onStatusChange={onRefresh}
          />
          <PaymentButton game={game} />
        </div>
      </div>
    </motion.div>
  )
}

export default PaymentHistory
