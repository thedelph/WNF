import React from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { FaChartLine } from 'react-icons/fa';
import { useAdmin } from '../../hooks/useAdmin';
import toast from 'react-hot-toast';

interface TeamStats {
  attack: number;
  defense: number;
  winRate: number;
}

interface TeamAnalysis {
  gameId: string;
  stats: {
    blue: TeamStats;
    orange: TeamStats;
  };
  difference: number;
}

const Teams: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [teamAnalysis, setTeamAnalysis] = React.useState<TeamAnalysis | null>(null);
  const supabase = useSupabaseClient();
  const { isSuperAdmin, loading: adminLoading } = useAdmin();

  React.useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Access denied. Super admin only.');
      return;
    }

    const fetchTeamAnalysis = async () => {
      const { data: gameData, error: gameError } = await supabase
        .from('game_selections')
        .select(`
          player_id,
          team,
          players (
            id,
            player_ratings (
              attack_rating,
              defense_rating,
              win_rate
            )
          )
        `)
        .eq('game_id', gameId);

      if (gameError) {
        console.error('Error fetching game data:', gameError);
        toast.error('Failed to fetch game data');
        return;
      }

      // Process the data to calculate team stats
      const blueTeam = gameData.filter(p => p.team === 'Blue');
      const orangeTeam = gameData.filter(p => p.team === 'Orange');

      const calculateTeamStats = (team: any[]): TeamStats => {
        const ratings = team.map(p => p.players.player_ratings[0]);
        return {
          attack: ratings.reduce((sum, r) => sum + r.attack_rating, 0) / ratings.length,
          defense: ratings.reduce((sum, r) => sum + r.defense_rating, 0) / ratings.length,
          winRate: ratings.reduce((sum, r) => sum + r.win_rate, 0) / ratings.length
        };
      };

      const blueStats = calculateTeamStats(blueTeam);
      const orangeStats = calculateTeamStats(orangeTeam);
      const difference = Math.abs(blueStats.attack - orangeStats.attack) +
                        Math.abs(blueStats.defense - orangeStats.defense) +
                        Math.abs(blueStats.winRate - orangeStats.winRate);

      setTeamAnalysis({
        gameId,
        stats: {
          blue: blueStats,
          orange: orangeStats
        },
        difference
      });
    };

    if (gameId) {
      fetchTeamAnalysis();
    }
  }, [gameId, supabase, isSuperAdmin]);

  if (adminLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-error text-xl font-bold">Access denied. Super admin only.</div>
      </div>
    );
  }

  if (!teamAnalysis) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  const StatBar: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-medium">{value.toFixed(1)}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <motion.div
          className="bg-primary h-2.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value * 10}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );

  const TeamStatsCard: React.FC<{ stats: TeamStats; team: 'blue' | 'orange' }> = ({ stats, team }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-lg shadow-lg ${
        team === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-orange-100 dark:bg-orange-900/20'
      }`}
    >
      <h3 className={`text-2xl font-bold mb-4 ${
        team === 'blue' ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'
      }`}>
        {team === 'blue' ? 'Blue Team' : 'Orange Team'}
      </h3>
      <div className="space-y-4">
        <StatBar value={stats.attack} label="Attack Rating" />
        <StatBar value={stats.defense} label="Defense Rating" />
        <StatBar value={stats.winRate * 100} label="Win Rate %" />
      </div>
    </motion.div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Team Analysis</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <TeamStatsCard stats={teamAnalysis.stats.blue} team="blue" />
        <TeamStatsCard stats={teamAnalysis.stats.orange} team="orange" />
      </div>

      <div className="bg-base-200 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Balance Score</h2>
        <div className="flex items-center space-x-2">
          <FaChartLine className="text-primary" />
          <span className="text-lg">
            Difference: {teamAnalysis.difference.toFixed(2)}
          </span>
        </div>
        <p className="text-sm text-base-content/70 mt-2">
          Lower difference indicates better team balance
        </p>
      </div>
    </div>
  );
};

export default Teams;
