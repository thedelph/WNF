import React from 'react';
import clsx from 'clsx';
import { GameHistory } from '../../../types/game';

interface GamePointsSectionProps {
  gameHistory: GameHistory[];
  latestSequence: number;
  baseXP: number;
}

const GamePointsSection: React.FC<GamePointsSectionProps> = ({
  gameHistory,
  latestSequence,
  baseXP,
}) => {
  // Sort sequences by how many games ago they are, excluding only future games
  const sortedHistory = [...gameHistory]
    .filter(game => game.sequence <= latestSequence)
    .sort((a, b) => b.sequence - a.sequence);

  // Helper function to get games in a specific range
  const getGamesInRange = (startGamesAgo: number, endGamesAgo: number) => {
    return sortedHistory.filter(game => {
      const gamesAgo = latestSequence - game.sequence;
      return gamesAgo >= startGamesAgo && gamesAgo <= endGamesAgo;
    });
  };

  // Helper function to render a game points card
  const renderGamePointsCard = (
    title: string,
    xpPerGame: number,
    startGamesAgo: number,
    endGamesAgo: number
  ) => {
    const gamesInRange = getGamesInRange(startGamesAgo, endGamesAgo);
    if (gamesInRange.length === 0) return null;

    return (
      <div className={clsx("card shadow-sm", "bg-base-100")}>
        <div className="card-body p-3">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="font-medium text-base-content">{title}</h5>
              <p className="text-sm opacity-70 text-base-content/70">{xpPerGame} XP per game</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-base-content">
                {gamesInRange.length * xpPerGame} XP
              </div>
              <div className="text-xs opacity-70 text-base-content/70">
                {gamesInRange.length} game{gamesInRange.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 mb-6">
      <h4 className="font-medium text-primary border-b border-base-300 pb-2">
        Game Points ({baseXP} Total Base XP)
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderGamePointsCard("Most Recent Game", 20, 0, 0)}
        {renderGamePointsCard("2-3 Games Back", 18, 1, 2)}
        {renderGamePointsCard("4-5 Games Back", 16, 3, 4)}
        {renderGamePointsCard("6-10 Games Back", 14, 5, 9)}
        {renderGamePointsCard("11-20 Games Back", 12, 10, 19)}
        {renderGamePointsCard("21-30 Games Back", 10, 20, 29)}
        {renderGamePointsCard("31-40 Games Back", 5, 30, 39)}
        {renderGamePointsCard("Over 40 Games Back", 0, 40, Number.MAX_SAFE_INTEGER)}
      </div>
    </div>
  );
};

export default GamePointsSection;
