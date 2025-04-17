import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Game } from '../../../types/game';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

interface Props {
  games: Game[];
}

const PaymentSummary: React.FC<Props> = ({ games }) => {
  const summary = useMemo(() => {
    const playerDebts = new Map();
    
    games.forEach(game => {
      if (new Date(game.date) > new Date()) return; // Skip future games
      
      // Count only selected (non-reserve) players for cost calculation
      const selectedPlayers = game.game_registrations?.filter(reg => 
        reg.status === 'selected' && !reg.is_reserve
      ) || [];
      const costPerPlayer = selectedPlayers.length > 0 ? game.pitch_cost / selectedPlayers.length : 0;
      
      game.game_registrations?.forEach(reg => {
        // Only consider selected non-reserve players for payment tracking
        if (!reg.paid && reg.status === 'selected' && !reg.is_reserve && reg.player) {
          const currentDebt = playerDebts.get(reg.player_id) || {
            name: reg.player.friendly_name || 'Unknown Player',
            totalOwed: 0,
            gamesUnpaid: 0,
            oldestUnpaidGame: null
          };
          
          currentDebt.totalOwed += costPerPlayer;
          currentDebt.gamesUnpaid += 1;
          if (!currentDebt.oldestUnpaidGame || new Date(game.date) < new Date(currentDebt.oldestUnpaidGame)) {
            currentDebt.oldestUnpaidGame = game.date;
          }
          playerDebts.set(reg.player_id, currentDebt);
        }
      });
    });

    return Array.from(playerDebts.values());
  }, [games]);

  const totalOutstanding = useMemo(() => {
    return summary.reduce((total, player) => total + player.totalOwed, 0);
  }, [summary]);

  // For pagination on mobile
  const [currentIndex, setCurrentIndex] = useState(0);
  const pageSize = 3; // Number of items to show per page on mobile
  
  // Calculate total pages for mobile pagination
  const totalPages = Math.ceil(summary.length / pageSize);
  
  // Handle pagination
  const nextPage = () => setCurrentIndex(prev => Math.min(prev + 1, totalPages - 1));
  const prevPage = () => setCurrentIndex(prev => Math.max(prev - 1, 0));
  
  // Get current items for the pagination
  const currentItems = useMemo(() => {
    return summary.slice(currentIndex * pageSize, (currentIndex + 1) * pageSize);
  }, [summary, currentIndex, pageSize]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-base-200 rounded-lg p-4 sm:p-6 mb-8"
    >
      {/* Header with Responsive Layout */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold">Outstanding Payments</h2>
        <div className="stats shadow w-full sm:w-auto">
          <div className="stat py-2 px-4">
            <div className="stat-title text-sm">Total Outstanding</div>
            <div className="stat-value text-primary text-2xl sm:text-3xl">£{totalOutstanding.toFixed(2)}</div>
          </div>
        </div>
      </div>
      
      {/* Desktop Table View - Hidden on Mobile */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Player</th>
              <th>Games Unpaid</th>
              <th>Total Owed</th>
              <th>Oldest Unpaid Game</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((player) => (
              <motion.tr
                key={player.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover"
              >
                <td>{player.name}</td>
                <td>{player.gamesUnpaid}</td>
                <td>£{player.totalOwed.toFixed(2)}</td>
                <td>{new Date(player.oldestUnpaidGame).toLocaleDateString()}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Card View - Shown only on Mobile */}
      <div className="sm:hidden">
        {currentItems.map((player) => (
          <motion.div
            key={player.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card bg-base-100 shadow-sm mb-3 p-3"
          >
            <div className="font-bold text-lg">{player.name}</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <div className="text-xs opacity-70">Games Unpaid</div>
                <div className="font-semibold">{player.gamesUnpaid}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Total Owed</div>
                <div className="font-semibold text-primary">£{player.totalOwed.toFixed(2)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs opacity-70">Oldest Unpaid Game</div>
                <div className="font-semibold">{new Date(player.oldestUnpaidGame).toLocaleDateString()}</div>
              </div>
            </div>
          </motion.div>
        ))}
        
        {/* Mobile Pagination Controls */}
        {summary.length > pageSize && (
          <div className="flex justify-between items-center mt-4">
            <button 
              onClick={prevPage} 
              disabled={currentIndex === 0}
              className="btn btn-sm btn-ghost"
            >
              <BsChevronLeft />
            </button>
            <span className="text-sm">
              {currentIndex + 1} / {totalPages}
            </span>
            <button 
              onClick={nextPage} 
              disabled={currentIndex >= totalPages - 1}
              className="btn btn-sm btn-ghost"
            >
              <BsChevronRight />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PaymentSummary;