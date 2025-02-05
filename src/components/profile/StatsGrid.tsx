import { Tooltip } from '../ui/Tooltip';

interface StatsGridProps {
  profile: {
    total_xp?: number;
    current_streak?: number;
    max_streak?: number;
    active_bonuses?: number;
    active_penalties?: number;
    rarity?: number;
  };
}

export function StatsGrid({ profile }: StatsGridProps) {
  const stats = [
    { 
      label: 'XP', 
      value: (profile.total_xp ?? 0).toLocaleString(),
      tooltip: 'Your total XP including all modifiers'
    },
    { 
      label: 'Rarity', 
      value: profile.rarity ? `${profile.rarity}%` : 'N/A',
      tooltip: 'How rare your XP level is compared to other players'
    },
    { 
      label: 'Current Streak', 
      value: Number(profile.current_streak) || 0,
      tooltip: 'Your current attendance streak'
    },
    { 
      label: 'Best Streak', 
      value: Number(profile.max_streak) || 0,
      tooltip: 'Your best attendance streak'
    },
    { 
      label: 'Active Bonuses', 
      value: profile.active_bonuses ?? 'N/A',
      tooltip: 'Number of active XP bonuses'
    },
    { 
      label: 'Active Penalties', 
      value: profile.active_penalties ?? 'N/A',
      tooltip: 'Number of active XP penalties'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className="bg-base-100 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold mb-2">{stat.label}</h2>
            {stat.tooltip && (
              <Tooltip content={stat.tooltip}>
                <span className="cursor-help text-base-content/70">ⓘ</span>
              </Tooltip>
            )}
          </div>
          <p className="text-xl">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export default StatsGrid;
