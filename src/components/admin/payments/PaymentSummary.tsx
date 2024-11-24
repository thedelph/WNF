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
      const costPerPlayer = game.pitch_cost / (game.game_registrations?.length || 1);
      
      game.game_registrations?.forEach(reg => {
        if (!reg.paid) {
          const currentDebt = playerDebts.get(reg.player_id) || {
            name: reg.player.friendly_name,
            totalOwed: 0,
            gamesUnpaid: 0
          };
          
          currentDebt.totalOwed += costPerPlayer;
          currentDebt.gamesUnpaid += 1;
          playerDebts.set(reg.player_id, currentDebt);
        }
      });
    });

    return Array.from(playerDebts.values());
  }, [games]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-base-200 rounded-lg p-6 mb-8"
    >
      <h2 className="text-xl font-bold mb-4">Outstanding Payments</h2>
      
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Player</th>
              <th>Games Unpaid</th>
              <th>Total Owed</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((debt, index) => (
              <tr key={index}>
                <td>{debt.name}</td>
                <td>{debt.gamesUnpaid}</td>
                <td>£{debt.totalOwed.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default PaymentSummary;