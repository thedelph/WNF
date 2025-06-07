import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '../../../components/ui/Tooltip';
import { GameHistory } from '../../../types/game';
import clsx from 'clsx';

interface GameHistoryTableProps {
  games: GameHistory[];
  sortConfig: {
    key: keyof GameHistory['games'] | 'team' | 'sequence_number';
    direction: 'asc' | 'desc';
  };
  handleSort: (key: typeof sortConfig.key) => void;
  getGameOutcome: (game: GameHistory) => string | null;
}

/**
 * A responsive game history component that shows a table on desktop and cards on mobile
 */
export const GameHistoryTable = ({ 
  games, 
  sortConfig, 
  handleSort, 
  getGameOutcome 
}: GameHistoryTableProps) => {
  return (
    <div>
      {/* Desktop View - Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th onClick={() => handleSort('sequence_number')} className="cursor-pointer hover:bg-base-200">
                WNF # {sortConfig.key === 'sequence_number' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Date</th>
              <th onClick={() => handleSort('team')} className="cursor-pointer hover:bg-base-200">
                Team {sortConfig.key === 'team' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Outcome</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {games.map((game) => (
                <TableRow 
                  key={game.games.id} 
                  game={game} 
                  getGameOutcome={getGameOutcome}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile View - Cards */}
      <div className="md:hidden space-y-4">
        <div className="flex gap-2 mb-2">
          <button 
            onClick={() => handleSort('sequence_number')} 
            className={clsx(
              "btn btn-sm",
              sortConfig.key === 'sequence_number' && "btn-primary"
            )}
          >
            WNF # {sortConfig.key === 'sequence_number' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            onClick={() => handleSort('team')} 
            className={clsx(
              "btn btn-sm",
              sortConfig.key === 'team' && "btn-primary"
            )}
          >
            Team {sortConfig.key === 'team' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
        </div>
        <AnimatePresence>
          {games.map((game) => (
            <GameCard 
              key={game.games.id} 
              game={game} 
              getGameOutcome={getGameOutcome}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const TableRow = ({ game, getGameOutcome }: { 
  game: GameHistory; 
  getGameOutcome: (game: GameHistory) => string | null;
}) => {
  const outcome = getGameOutcome(game);
  
  return (
    <motion.tr 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        outcome === 'Won' && 'bg-success/10 hover:bg-success/20',
        outcome === 'Lost' && 'bg-error/10 hover:bg-error/20',
        'hover:bg-base-200 transition-colors duration-200'
      )}
    >
      <td>WNF #{game.games.sequence_number}</td>
      <td>{new Date(game.games.date).toLocaleDateString()}</td>
      <td>
        <TeamBadge team={game.team} />
      </td>
      <td>
        <OutcomeBadge outcome={outcome} />
      </td>
      <td>
        <ScoreDisplay game={game} />
      </td>
    </motion.tr>
  );
};

const GameCard = ({ game, getGameOutcome }: {
  game: GameHistory;
  getGameOutcome: (game: GameHistory) => string | null;
}) => {
  const outcome = getGameOutcome(game);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        "card bg-base-200 shadow-lg",
        outcome === 'Won' && 'border-l-4 border-success',
        outcome === 'Lost' && 'border-l-4 border-error',
        outcome === 'Draw' && 'border-l-4 border-primary'
      )}
    >
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">WNF #{game.games.sequence_number}</span>
            <span className="text-sm opacity-70">
              {new Date(game.games.date).toLocaleDateString()}
            </span>
          </div>
          <TeamBadge team={game.team} />
        </div>
        <div className="flex items-center justify-between">
          <OutcomeBadge outcome={outcome} />
          <ScoreDisplay game={game} />
        </div>
      </div>
    </motion.div>
  );
};

const TeamBadge = ({ team }: { team: string }) => (
  <div className={clsx(
    'badge badge-sm font-medium',
    !team && 'badge-ghost opacity-50',
    team?.toLowerCase() === 'blue' && 'badge-info',
    team?.toLowerCase() === 'orange' && 'badge-warning'
  )}>
    {team ? team.charAt(0).toUpperCase() + team.slice(1) : 'Unknown'}
  </div>
);

const OutcomeBadge = ({ outcome }: { outcome: string | null }) => {
  const isUnknown = outcome === null;
  const tooltipText = 'This match has an unknown outcome and does not count towards win rate calculation.';
  
  return (
    <div className={clsx(
      'badge badge-sm font-medium',
      outcome === 'Won' && 'badge-success',
      outcome === 'Lost' && 'badge-error',
      outcome === 'Draw' && 'badge-primary',
      isUnknown && 'badge-ghost opacity-50'
    )}>
      {isUnknown ? (
        <Tooltip content={tooltipText}>
          <span>Unknown</span>
        </Tooltip>
      ) : (
        outcome
      )}
    </div>
  );
};

const ScoreDisplay = ({ game }: { game: GameHistory }) => {
  if (game.games.score_blue === null || game.games.score_orange === null) {
    return (
      <Tooltip content="This match has no recorded score, but the outcome still counts towards win rate calculation.">
        <div className="badge badge-sm badge-ghost opacity-50 font-medium">
          Unknown
        </div>
      </Tooltip>
    );
  }

  const hasUnevenTeams = game.games.blue_team_size !== game.games.orange_team_size;

  return (
    <div className="flex gap-2 items-center">
      <div className={clsx(
        'badge badge-sm font-medium',
        !game.team && 'badge-ghost',
        game.team?.toLowerCase() === 'blue' ? 'badge-info' : 'badge-warning'
      )}>
        {game.team?.toLowerCase() === 'blue' ? game.games.score_blue : game.games.score_orange}
      </div>
      <span>-</span>
      <div className={clsx(
        'badge badge-sm font-medium',
        !game.team && 'badge-ghost',
        game.team?.toLowerCase() === 'blue' ? 'badge-warning' : 'badge-info'
      )}>
        {game.team?.toLowerCase() === 'blue' ? game.games.score_orange : game.games.score_blue}
      </div>
      {hasUnevenTeams && (
        <Tooltip content={`Uneven Teams (${game.games.blue_team_size} vs ${game.games.orange_team_size})\nThis match does not count towards win rate calculation due to uneven teams.`}>
          <div className="badge badge-sm badge-ghost opacity-70">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        </Tooltip>
      )}
    </div>
  );
};
