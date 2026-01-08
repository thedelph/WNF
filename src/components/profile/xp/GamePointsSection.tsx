import React from 'react';
import clsx from 'clsx';

// Local interface for XP calculation game history (different from profile GameHistory type)
interface XPGameHistory {
  sequence: number;
  status: string;
  unpaid?: boolean;
}

interface GamePointsSectionProps {
  gameHistory: XPGameHistory[];
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

  // v2: Calculate XP using linear decay formula
  const calculateGameXP = (gamesAgo: number): number => {
    return Math.max(1, 20 - (gamesAgo * 0.5));
  };

  // Helper function to get games in a specific range and calculate their total XP
  const getGamesInRange = (startGamesAgo: number, endGamesAgo: number) => {
    const games = sortedHistory.filter(game => {
      const gamesAgo = latestSequence - game.sequence;
      return gamesAgo >= startGamesAgo && gamesAgo <= endGamesAgo;
    });

    const totalXP = games.reduce((sum, game) => {
      const gamesAgo = latestSequence - game.sequence;
      return sum + calculateGameXP(gamesAgo);
    }, 0);

    return { games, totalXP };
  };

  // Helper function to render a game points card with XP range
  const renderGamePointsCard = (
    title: string,
    xpRange: string,
    startGamesAgo: number,
    endGamesAgo: number
  ) => {
    const { games, totalXP } = getGamesInRange(startGamesAgo, endGamesAgo);
    if (games.length === 0) return null;

    return (
      <div className={clsx("card shadow-sm", "bg-base-100")}>
        <div className="card-body p-3">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="font-medium text-base-content">{title}</h5>
              <p className="text-sm opacity-70 text-base-content/70">{xpRange}</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-base-content">
                {Math.round(totalXP)} XP
              </div>
              <div className="text-xs opacity-70 text-base-content/70">
                {games.length} game{games.length !== 1 ? 's' : ''}
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
        Game Points ({Math.round(baseXP)} Total Base XP)
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderGamePointsCard("Most Recent", "20 XP", 0, 0)}
        {renderGamePointsCard("1-10 Games Back", "19.5 - 15 XP each", 1, 10)}
        {renderGamePointsCard("11-20 Games Back", "14.5 - 10 XP each", 11, 20)}
        {renderGamePointsCard("21-30 Games Back", "9.5 - 5 XP each", 21, 30)}
        {renderGamePointsCard("31-38 Games Back", "4.5 - 1 XP each", 31, 38)}
        {renderGamePointsCard("39+ Games Back", "1 XP each", 39, Number.MAX_SAFE_INTEGER)}
      </div>
    </div>
  );
};

export default GamePointsSection;
