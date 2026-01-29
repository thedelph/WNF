import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { PiChartLineUp } from "react-icons/pi";
import { toast } from 'react-hot-toast';
import { useAdmin } from '../../hooks/useAdmin';
import { FaCheckCircle } from 'react-icons/fa';

const XPComparison: React.FC = () => {
  const { isAdmin } = useAdmin();
  const [loading, setLoading] = useState(false);

  const handleRecalculate = async () => {
    try {
      setLoading(true);
      toast.loading('Recalculating XP for all players...', { id: 'recalc' });

      // Call the recalculate function
      const { error } = await supabase.rpc('recalculate_all_player_xp_v2');

      if (error) {
        console.error('Error recalculating XP:', error);
        throw error;
      }

      toast.success('XP recalculated successfully', { id: 'recalc' });
    } catch (error) {
      console.error('Error recalculating:', error);
      toast.error('Failed to recalculate XP', { id: 'recalc' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return <div className="text-center mt-8">Access denied. Admin only.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PiChartLineUp className="text-primary" />
            XP System
          </h1>
          <p className="text-base-content/70 mt-1">
            XP v2 system with diminishing streak returns + linear decay
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRecalculate}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Recalculating...' : 'Recalculate All XP'}
          </button>
        </div>
      </div>

      {/* Migration Complete Notice */}
      <div className="alert alert-success mb-6">
        <FaCheckCircle className="h-6 w-6" />
        <div>
          <h3 className="font-bold">XP v2 Migration Complete</h3>
          <div className="text-sm">
            The v1 to v2 XP migration was completed in January 2026.
            Legacy comparison data has been archived.
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg">Current XP System (v2)</h2>
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
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg">Manual Recalculation</h2>
          <p className="text-base-content/70 mb-4">
            Use the button above to manually trigger a full XP recalculation for all players.
            This updates XP values, ranks, and rarity tiers based on the current game history.
          </p>
          <p className="text-sm text-base-content/50">
            Note: XP is automatically recalculated after each game completion.
            Manual recalculation is typically only needed after data migrations or corrections.
          </p>
        </div>
      </div>
    </div>
  );
};

export default XPComparison;
