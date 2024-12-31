import React, { useEffect, useState } from 'react'
import { supabaseAdmin } from '../../utils/supabase'
import { useUser } from '../../hooks/useUser'
import { PaymentStatus } from '../payments/PaymentStatus'
import { format } from 'date-fns'
import { motion } from 'framer-motion'

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

  useEffect(() => {
    if (player?.id) {
      fetchPaymentHistory()
    }
  }, [player?.id])

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
        .order('created_at', { ascending: false })
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
      <div className="overflow-x-auto">
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
            {games.map(game => (
              <tr key={game.id} className="hover:bg-base-100">
                <td>#{game.sequence_number}</td>
                <td>{format(new Date(game.date), 'MMM d, h:mm a')}</td>
                <td>{game.venue.name}</td>
                <td>
                  <PaymentStatus 
                    gameId={game.id} 
                    playerId={player?.id || ''} 
                    onStatusChange={fetchPaymentHistory}
                  />
                </td>
                <td>
                  {game.payment_link && game.payment_status !== 'admin_verified' && (
                    <a 
                      href={game.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-xs btn-primary"
                    >
                      Pay Now
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

export default PaymentHistory
