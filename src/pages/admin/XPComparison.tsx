import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { PiChartLineUp } from "react-icons/pi";
import { toast } from 'react-hot-toast';
import { useAdmin } from '../../hooks/useAdmin';
import { XPComparisonDashboard } from '../../components/admin/xp/XPComparisonDashboard';

interface XPComparisonData {
  player_id: string;
  friendly_name: string;
  current_streak: number;
  current_xp: number;
  current_rank: number;
  current_rarity: string;
  v2_xp: number;
  v2_rank: number;
  v2_rarity: string;
  xp_difference: number;
  rank_difference: number;
  current_streak_bonus_pct: number;
  v2_streak_bonus_pct: number;
}

const XPComparison: React.FC = () => {
  const { isAdmin } = useAdmin();
  const [comparisonData, setComparisonData] = useState<XPComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);

      // Fetch from the player_xp_comparison view
      const { data, error } = await supabase
        .from('player_xp_comparison')
        .select('*')
        .order('current_xp', { ascending: false });

      if (error) {
        console.error('Error fetching XP comparison data:', error);
        throw error;
      }

      setComparisonData(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      toast.error('Failed to load XP comparison data');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setLoading(true);
      toast.loading('Recalculating v2 XP for all players...', { id: 'recalc' });

      // Call the recalculate function
      const { error } = await supabase.rpc('recalculate_all_player_xp_v2');

      if (error) {
        console.error('Error recalculating XP:', error);
        throw error;
      }

      toast.success('XP v2 recalculated successfully', { id: 'recalc' });
      await fetchComparisonData();
    } catch (error) {
      console.error('Error recalculating:', error);
      toast.error('Failed to recalculate XP v2', { id: 'recalc' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchComparisonData();
  }, [isAdmin]);

  if (!isAdmin) {
    return <div className="text-center mt-8">Access denied. Admin only.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PiChartLineUp className="text-primary" />
            XP System Comparison
          </h1>
          <p className="text-base-content/70 mt-1">
            Compare current XP system with v2 (diminishing streak returns + linear decay)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRecalculate}
            className="btn btn-secondary"
            disabled={loading}
          >
            {loading ? 'Recalculating...' : 'Recalculate v2'}
          </button>
          <button
            onClick={() => fetchComparisonData()}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {lastUpdated && (
        <div className="text-sm text-base-content/50 mb-4">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg">v2 System Changes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-base-200 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Diminishing Streak Bonus</h3>
              <ul className="list-disc list-inside space-y-1 text-base-content/80">
                <li>1st game: +10%</li>
                <li>2nd game: +9%</li>
                <li>3rd game: +8%</li>
                <li>... continues to 10th: +1%</li>
                <li>10-game streak total: +55%</li>
                <li>11+ games: +1% each</li>
              </ul>
              <p className="mt-2 text-xs text-base-content/60">
                Current: Linear +10% per game (27 games = +270%)
              </p>
            </div>
            <div className="bg-base-200 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Linear Base XP Decay</h3>
              <ul className="list-disc list-inside space-y-1 text-base-content/80">
                <li>Current game: 20 XP</li>
                <li>1 game ago: 19.5 XP</li>
                <li>2 games ago: 19 XP</li>
                <li>... (-0.5 per game)</li>
                <li>38+ games ago: 1 XP (floor)</li>
              </ul>
              <p className="mt-2 text-xs text-base-content/60">
                Current: Step function (20, 18, 16, 14, 12, 10, 5, 0)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <XPComparisonDashboard
            data={comparisonData}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default XPComparison;
