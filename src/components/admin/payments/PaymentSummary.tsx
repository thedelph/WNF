import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Game } from '../../../types/game';

interface Props {
  games: Game[];
}

const PaymentSummary: React.FC<Props> = ({ games }) => {
  const summary = useMemo(() => {
    const playerDebts = new Map();
    
    games.forEach(game => {
      if (new Date(game.date) > new Date()) return; // Skip future games
      
      const costPerPlayer = game.pitch_cost / (game.game_registrations?.length || 1);
      
      game.game_registrations?.forEach(reg => {
        if (!reg.paid) {
          const currentDebt = playerDebts.get(reg.player_id) || {
            name: reg.player.friendly_name,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-base-200 rounded-lg p-6 mb-8"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Outstanding Payments</h2>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total Outstanding</div>
            <div className="stat-value text-primary">£{totalOutstanding.toFixed(2)}</div>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
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
    </motion.div>
  );
};

export default PaymentSummary;