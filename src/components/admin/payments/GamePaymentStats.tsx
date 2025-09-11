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
  // Use the pre-calculated cost_per_person from the game object if available
  // Otherwise calculate it based on registrations
  const getCostPerPlayer = () => {
    // First try to use the pre-calculated value
    if (game.cost_per_person !== undefined && game.cost_per_person !== null) {
      return game.cost_per_person.toFixed(2);
    }
    
    // Fallback: calculate based on registrations
    const selectedPlayers = game.game_registrations?.filter(
      reg => reg.status === 'selected'
    ) || [];
    
    const playerCount = selectedPlayers.length;
    
    // If no players found or no pitch cost, return 0
    if (!playerCount || !game.pitch_cost) {
      return '0.00';
    }
    
    return (game.pitch_cost / playerCount).toFixed(2);
  };

  const playerCount = game.game_registrations?.filter(
    reg => reg.status === 'selected'
  ).length || 0;

  return (
    <div className="stats shadow mb-4">
      <div className="stat">
        <div className="stat-title">Total Cost</div>
        <div className="stat-value text-primary">£{game.pitch_cost || '0.00'}</div>
      </div>
      <div className="stat">
        <div className="stat-title">Cost Per Player</div>
        <div className="stat-value text-secondary">
          £{getCostPerPlayer()}
        </div>
        <div className="stat-desc">{playerCount} players</div>
      </div>
    </div>
  );
};

export default GamePaymentStats;
