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
  // Add any other properties that might be coming from d.games
}

const ITEMS_PER_PAGE = 10

const PaymentHistory = () => {
  const { player } = useUser()
  const [games, setGames] = useState<GamePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'all' | 'month' | '3months' | '6months'>('all')

  useEffect(() => {
    if (player?.id) {
      fetchTotalCount()
      fetchPaymentHistory()
    }
  }, [player?.id, currentPage, sortOrder, paymentFilter, dateRange])

  const fetchTotalCount = async () => {
    try {
      let query = supabaseAdmin
        .from('game_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', player?.id)
        .eq('status', 'selected')

      // Apply payment status filter
      if (paymentFilter !== 'all') {
        query = query.eq('payment_status', paymentFilter)
      }

      // Apply date range filter
      if (dateRange !== 'all') {
        const now = new Date()
        let monthsAgo = 1
        if (dateRange === '3months') monthsAgo = 3
        if (dateRange === '6months') monthsAgo = 6
        
        const startDate = new Date()
        startDate.setMonth(now.getMonth() - monthsAgo)
        query = query.gte('games.date', startDate.toISOString())
      }

      const { count, error } = await query

      if (error) throw error
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching total count:', error)
    }
  }

  const fetchPaymentHistory = async () => {
    try {
      let query = supabaseAdmin
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
        .order('games(date)', { ascending: sortOrder === 'asc' })
        .order('games(sequence_number)', { ascending: sortOrder === 'asc' })

      // Apply payment status filter
      if (paymentFilter !== 'all') {
        query = query.eq('payment_status', paymentFilter)
      }

      // Apply date range filter
      if (dateRange !== 'all') {
        const now = new Date()
        let monthsAgo = 1
        if (dateRange === '3months') monthsAgo = 3
        if (dateRange === '6months') monthsAgo = 6
        
        const startDate = new Date()
        startDate.setMonth(now.getMonth() - monthsAgo)
        query = query.gte('games.date', startDate.toISOString())
      }

      query = query.range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

      const { data, error } = await query

      if (error) throw error

      // Make sure we only include games with valid data and proper typing
      const transformedGames: GamePayment[] = [];
      
      // Safely process the data
      if (data && Array.isArray(data)) {
        for (const d of data) {
          // Skip if games data is missing or invalid
          if (!d || !d.games || typeof d.games !== 'object') {
            console.warn('Skipping invalid game data item:', d);
            continue;
          }
          
          // Access properties safely with optional chaining
          const gameId = d.games?.id;
          const gameDate = d.games?.date;
          const gameSequence = d.games?.sequence_number;
          const venueName = d.games?.venue?.name;
          
          // Skip if any required fields are missing
          if (!gameId || !gameDate || !gameSequence || !venueName) {
            console.warn('Skipping game with missing required fields:', d.games);
            continue;
          }
          
          // Create a properly typed game payment object
          transformedGames.push({
            id: gameId,
            date: gameDate,
            sequence_number: gameSequence,
            payment_link: d.games?.payment_link || null,
            payment_status: d.payment_status || null,
            venue: {
              name: venueName
            }
          });
        }
      }

      setGames(transformedGames)
    } catch (error) {
      console.error('Error fetching payment history:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
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

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
        <select 
          className="select select-sm"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>

        <select 
          className="select select-sm"
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value)
            setCurrentPage(1) // Reset to first page when filter changes
          }}
        >
          <option value="all">All Payments</option>
          <option value="admin_verified">Admin Verified</option>
          <option value="marked_paid">Pending Verification</option>
          <option value="unpaid">Unpaid</option>
        </select>

        <select 
          className="select select-sm"
          value={dateRange}
          onChange={(e) => {
            setDateRange(e.target.value as 'all' | 'month' | '3months' | '6months')
            setCurrentPage(1) // Reset to first page when filter changes
          }}
        >
          <option value="all">All Time</option>
          <option value="month">Last Month</option>
          <option value="3months">Last 3 Months</option>
          <option value="6months">Last 6 Months</option>
        </select>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mb-4">
          <div className="join">
            <button
              className={clsx(
                "join-item btn btn-sm",
                currentPage === 1 
                  ? "btn-disabled opacity-50" 
                  : "bg-primary hover:bg-primary/90 text-white"
              )}
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              «
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                className={clsx(
                  "join-item btn btn-sm",
                  currentPage === i + 1 
                    ? "bg-primary text-white" 
                    : "bg-primary/10 hover:bg-primary/90 hover:text-white"
                )}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className={clsx(
                "join-item btn btn-sm",
                currentPage === totalPages 
                  ? "btn-disabled opacity-50" 
                  : "bg-primary hover:bg-primary/90 text-white"
              )}
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              »
            </button>
          </div>
        </div>
      )}

      {games.length === 0 && currentPage === 1 ? (
        <div className="text-center p-8">
          <p className="text-gray-500 dark:text-gray-400">No games found matching your filters.</p>
        </div>
      ) : (
        <>
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
                  {games.map((game, index) => (
                    <TableRow 
                      key={`table-row-${game.id || 'unknown'}-${game.sequence_number || index}`} 
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
              {games.map((game, index) => (
                <PaymentCard 
                  key={`payment-card-${game.id || 'unknown'}-${game.sequence_number || index}`} 
                  game={game} 
                  onRefresh={fetchPaymentHistory}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
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
  
  // Don't render if we don't have valid IDs
  if (!player?.id || !game.id) return null

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
          playerId={player.id}
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
  const isVerified = game.payment_status === 'verified' || game.payment_status === 'admin_verified'
  
  // Don't render if we don't have valid IDs
  if (!player?.id || !game.id) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        "card bg-base-200 shadow-lg",
        isVerified && 'border-l-4 border-success',
        game.payment_status === 'marked_paid' && 'border-l-4 border-warning',
        (!game.payment_status || game.payment_status === 'unpaid') && 'border-l-4 border-error'
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
            playerId={player.id}
            onStatusChange={onRefresh}
          />
          <PaymentButton game={game} />
        </div>
      </div>
    </motion.div>
  )
}

export default PaymentHistory
