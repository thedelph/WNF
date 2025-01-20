import React from 'react';
import { Game } from '../../../types/game';

interface Props {
  game: Game;
}

/**
 * Component that displays payment statistics for a game
 * Shows total cost and cost per player
 */
const GamePaymentStats: React.FC<Props> = ({ game }) => {
  const calculateCostPerPlayer = () => {
    const selectedNonReservePlayers = game.game_registrations?.filter(
      reg => reg.status === 'selected' && !reg.is_reserve
    ) || [];
    const playerCount = selectedNonReservePlayers.length || 1;
    return (game.pitch_cost / playerCount).toFixed(2);
  };

  return (
    <div className="stats shadow mb-4">
      <div className="stat">
        <div className="stat-title">Total Cost</div>
        <div className="stat-value text-primary">£{game.pitch_cost}</div>
      </div>
      <div className="stat">
        <div className="stat-title">Cost Per Player</div>
        <div className="stat-value text-secondary">
          £{calculateCostPerPlayer()}
        </div>
      </div>
    </div>
  );
};

export default GamePaymentStats;
