import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Medal, LineChart } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { Tooltip } from '../ui/Tooltip';

interface HighestXPRecord {
  player_id: string;
  friendly_name: string;
  xp: number;
  snapshot_date: string;
  rank: number;
  rarity: string;
  formatted_date: string; // This will be added after fetching
}

interface HighestXPCardProps {
  selectedYear?: number | 'all';
}

// Converts a date string to a nicely formatted date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
};


export const HighestXPCard = ({ selectedYear }: HighestXPCardProps) => {
  const [highestXP, setHighestXP] = useState<HighestXPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Using a custom red gradient that's not used elsewhere
  const customGradient = 'from-red-300 via-red-500 to-red-700';
  const customShadow = 'shadow-red-500/50';

  useEffect(() => {
    const fetchHighestXP = async () => {
      try {
        setLoading(true);
        
        // Query to get highest XP for each player
        let query = supabase
          .from('highest_xp_records_view')
          .select('player_id, friendly_name, xp, snapshot_date, rank, rarity')
          .order('xp', { ascending: false })
          .limit(10);
        
        // Filter by year if selected
        if (selectedYear && selectedYear !== 'all') {
          // We need to filter records from the selected year
          const startDate = `${selectedYear}-01-01`;
          const endDate = `${selectedYear}-12-31`;
          query = query.gte('snapshot_date', startDate).lte('snapshot_date', endDate);
        }
        
        const { data, error: apiError } = await query;
        
        if (apiError) throw apiError;
        
        // Format dates and set the data
        if (data) {
          const formattedData = data.map(record => ({
            ...record,
            formatted_date: formatDate(record.snapshot_date)
          }));
          setHighestXP(formattedData);
        }
      } catch (err) {
        console.error('Error fetching highest XP:', err);
        setError('Failed to load highest XP records');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHighestXP();
  }, [selectedYear]);
  
  const medals = [
    { color: 'text-yellow-300 drop-shadow-[0_0_3px_rgba(253,224,71,0.7)]' },
    { color: 'text-slate-100 drop-shadow-[0_0_3px_rgba(255,255,255,0.7)]' },
    { color: 'text-yellow-700 drop-shadow-[0_0_3px_rgba(255,255,255,0.7)] font-bold' }
  ];
  
  const gradientColor = customGradient;
  const shadowColor = customShadow;
  
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`card bg-gradient-to-br ${gradientColor} text-white shadow-lg ${shadowColor} animate-gradient-xy`}
      >
        <div className="card-body flex items-center justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      </motion.div>
    );
  }
  
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`card bg-gradient-to-br ${gradientColor} text-white shadow-lg ${shadowColor} animate-gradient-xy`}
      >
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title text-lg font-bold">XP Leaderboard</h2>
            <LineChart className="w-6 h-6" />
          </div>
          <p className="text-center">{error}</p>
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`card bg-gradient-to-br ${gradientColor} text-white shadow-lg ${shadowColor} animate-gradient-xy`}
    >
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-title text-lg font-bold">XP Leaderboard</h2>
          <Tooltip content="All-time highest XP scores achieved by players">
            <LineChart className="w-6 h-6" />
          </Tooltip>
        </div>
        
        {highestXP.length > 0 ? (
          <div className="space-y-2">
            {highestXP.map((record, index) => (
              <div key={`${record.player_id}-${record.snapshot_date}`} className="flex justify-between items-center gap-2">
                {/* Player name with medal - left side */}
                <div className="flex items-center gap-2 min-w-0">
                  {index < 3 ? (
                    <Medal className={`flex-shrink-0 ${medals[index].color}`} size={18} />
                  ) : (
                    <span className="w-[18px] flex-shrink-0">{/* Empty space to maintain alignment */}</span>
                  )}
                  <span className="truncate">{record.friendly_name}</span>
                </div>
                {/* XP and date - right side, stacked on mobile, side-by-side on larger screens */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span className="font-bold whitespace-nowrap">{record.xp} XP</span>
                  <span className="text-xs opacity-80 whitespace-nowrap">{record.formatted_date}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-6">
            <p className="text-center opacity-80">No XP records available for this period</p>
          </div>
        )}
        
        {highestXP.length > 0 && (
          <p className="text-sm opacity-80 mt-2">
            Snapshot data from highest achieved XP values
          </p>
        )}
      </div>
    </motion.div>
  );
};
