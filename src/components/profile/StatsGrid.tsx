import { PlayerStats } from '../../types/player';
import { Tooltip } from '../ui/Tooltip';

interface StatsGridProps {
  player: PlayerStats;
}

export const StatsGrid = ({ player }: StatsGridProps) => {
  // Calculate win rate
  const winRate = player.wins !== undefined && player.totalGames ? 
    Math.round((player.wins / player.totalGames) * 100) : 
    null;

  const stats = [
    { 
      label: 'XP', 
      value: (player.xp ?? 0).toLocaleString()
    },
    { label: 'Caps', value: player.caps ?? 'N/A' },
    { 
      label: 'Win Rate', 
      value: winRate ? `${winRate}%` : 'N/A',
      tooltip: 'Win rates are only calculated for games with a known outcome and an even number of players on each team'
    },
    { label: 'Current Streak', value: Number(player.current_streak) || 0 },
    { label: 'Best Streak', value: Number(player.max_streak) || 0 },
    { label: 'Active Bonuses', value: player.active_bonuses ?? 'N/A' },
    { label: 'Active Penalties', value: player.active_penalties ?? 'N/A' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className="bg-base-100 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold mb-2">{stat.label}</h2>
            {stat.tooltip && (
              <Tooltip content={stat.tooltip}>
                <span className="cursor-help">ⓘ</span>
              </Tooltip>
            )}
          </div>
          <p className="text-xl">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};
