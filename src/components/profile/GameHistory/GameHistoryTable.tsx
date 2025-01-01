import { motion, AnimatePresence } from 'framer-motion';
import { GameHistory } from '../../../types/game';

interface GameHistoryTableProps {
  games: GameHistory[];
  sortConfig: {
    key: keyof GameHistory['games'] | 'team';
    direction: 'asc' | 'desc';
  };
  handleSort: (key: typeof sortConfig.key) => void;
  getGameOutcome: (game: GameHistory) => string;
}

export const GameHistoryTable = ({ 
  games, 
  sortConfig, 
  handleSort, 
  getGameOutcome 
}: GameHistoryTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th onClick={() => handleSort('date')} className="cursor-pointer hover:bg-base-200">
              Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('team')} className="cursor-pointer hover:bg-base-200">
              Team {sortConfig.key === 'team' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th>Outcome</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {games.map((game) => {
              const outcome = getGameOutcome(game);
              return (
                <motion.tr 
                  key={game.game_id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`${
                    outcome === 'Won' ? 'bg-success/10 hover:bg-success/20' :
                    outcome === 'Lost' ? 'bg-error/10 hover:bg-error/20' :
                    'hover:bg-base-200'
                  } transition-colors duration-200`}
                >
                  <td>{new Date(game.games.date).toLocaleDateString()}</td>
                  <td>
                    <div className={`badge badge-sm font-medium ${
                      !game.team ? 'badge-ghost opacity-50' :
                      game.team?.toLowerCase() === 'blue' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {game.team ? game.team.charAt(0).toUpperCase() + game.team.slice(1) : 'Unknown'}
                    </div>
                  </td>
                  <td>
                    <div className={`badge badge-sm font-medium ${
                      outcome === 'Won' ? 'badge-success' :
                      outcome === 'Lost' ? 'badge-error' :
                      outcome === 'Draw' ? 'badge-primary' :
                      'badge-ghost opacity-50'
                    }`}>
                      {outcome}
                    </div>
                  </td>
                  <td>
                    {(game.games.score_blue !== null && 
                      game.games.score_orange !== null && 
                      game.games.score_blue !== undefined && 
                      game.games.score_orange !== undefined && 
                      !(game.games.score_blue === 0 && game.games.score_orange === 0) &&
                      outcome !== 'Unknown') ? (
                      <div className="flex gap-2 items-center">
                        <div className={`badge badge-sm font-medium ${
                          !game.team ? 'badge-ghost' :
                          game.team?.toLowerCase() === 'blue' ? 'badge-info' : 'badge-warning'
                        }`}>
                          {!game.team ? '?' : 
                           game.team?.toLowerCase() === 'blue' ? game.games.score_blue : game.games.score_orange}
                        </div>
                        <span>-</span>
                        <div className={`badge badge-sm font-medium ${
                          !game.team ? 'badge-ghost' :
                          game.team?.toLowerCase() === 'blue' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {!game.team ? '?' :
                           game.team?.toLowerCase() === 'blue' ? game.games.score_orange : game.games.score_blue}
                        </div>
                      </div>
                    ) : (
                      <div className="badge badge-sm badge-ghost opacity-50 font-medium">
                        Unknown
                      </div>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
};
