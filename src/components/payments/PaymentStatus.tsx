import React, { useState, useEffect } from 'react'
import { supabaseAdmin } from '../../utils/supabase'
import { useUser } from '../../hooks/useUser'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import clsx from 'clsx'

interface Props {
  gameId: string
  playerId: string
  onStatusChange?: () => void
}

export const PaymentStatus: React.FC<Props> = ({ gameId, playerId, onStatusChange }) => {
  const [paymentStatus, setPaymentStatus] = useState<string>('unpaid')
  const [loading, setLoading] = useState(false)
  const { player } = useUser()

  useEffect(() => {
    fetchPaymentStatus()
  }, [gameId, playerId])

  const fetchPaymentStatus = async () => {
    // Don't fetch if we don't have valid IDs
    if (!gameId || !playerId) {
      console.warn('Missing gameId or playerId for payment status')
      return
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('game_registrations')
        .select('payment_status')
        .eq('game_id', gameId)
        .eq('player_id', playerId)
        .single()

      if (error) throw error
      if (data) {
        setPaymentStatus(data.payment_status || 'unpaid')
      }
    } catch (error) {
      console.error('Error fetching payment status:', error)
    }
  }

  const handleMarkAsPaid = async () => {
    // Don't proceed if we don't have valid IDs
    if (!gameId || !playerId) {
      toast.error('Unable to update payment status')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabaseAdmin
        .from('game_registrations')
        .update({ 
          payment_status: 'marked_paid',
          paid: true,
          payment_received_date: new Date().toISOString()
        })
        .eq('game_id', gameId)
        .eq('player_id', playerId)

      if (error) throw error

      setPaymentStatus('marked_paid')
      toast.success('Marked as paid')
      onStatusChange?.()
    } catch (error) {
      console.error('Error marking as paid:', error)
      toast.error('Failed to update payment status')
    } finally {
      setLoading(false)
    }
  }

  const getStatusDisplay = () => {
    switch (paymentStatus) {
      case 'admin_verified':
        return (
          <div className="badge badge-success gap-2">
            Admin Verified ✓
          </div>
        )
      case 'marked_paid':
        return (
          <div className="badge badge-warning gap-2">
            Pending Verification ⌛
          </div>
        )
      default:
        return (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <button
              onClick={handleMarkAsPaid}
              disabled={loading}
              className={clsx(
                "btn btn-sm",
                loading ? "btn-disabled" : "btn-primary"
              )}
            >
              {loading ? "Updating..." : "Mark as Paid"}
            </button>
          </motion.div>
        )
    }
  }

  return (
    <div className="flex items-center justify-center">
      {getStatusDisplay()}
    </div>
  )
}
