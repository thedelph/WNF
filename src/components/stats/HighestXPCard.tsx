import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { Tooltip } from '../ui/Tooltip';
import { useUser } from '../../hooks/useUser';

interface HighestXPRecord {
  player_id: string;
  friendly_name: string;
  xp: number;
  xp_v2: number | null;
  snapshot_date: string;
  rank: number;
  rarity: string;
  is_v1_era: boolean;
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
  // Get current user for highlighting their row
  const { player: currentPlayer } = useUser();

  const [highestXP, setHighestXP] = useState<HighestXPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine if we're viewing a v1-era year (2024/2025) - for 'all' or 2026+ we use v2 values
  const isV1EraYear = selectedYear === 2024 || selectedYear === 2025;

  // Using amber gradient to match XP Champion in Hall of Fame
  // Amber = gold = champions, excellence, trophy energy
  const customGradient = 'from-amber-400 via-amber-500 to-amber-700';
  const customShadow = 'shadow-amber-500/50';

  useEffect(() => {
    const fetchHighestXP = async () => {
      try {
        setLoading(true);
        
        // Query to get highest XP for each player
        let query = supabase
          .from('highest_xp_records_view')
          .select('player_id, friendly_name, xp, xp_v2, snapshot_date, rank, rarity, is_v1_era')
          .order(isV1EraYear ? 'xp' : 'xp_v2', { ascending: false, nullsFirst: false })
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
  
  // Emoji medals for top three positions
  const medals = ['🥇', '🥈', '🥉'];
  
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
            <h2 className="card-title text-lg font-bold">XP Champion</h2>
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
          <h2 className="card-title text-lg font-bold">XP Champion</h2>
          <Tooltip content="All-time highest XP scores achieved by players">
            <LineChart className="w-6 h-6" />
          </Tooltip>
        </div>
        
        {highestXP.length > 0 ? (
          <div className="space-y-2">
            {highestXP.map((record, index) => {
              const isCurrentUser = record.player_id === currentPlayer?.id;
              return (
                <div
                  key={`${record.player_id}-${record.snapshot_date}`}
                  className={`flex justify-between items-center gap-2 ${isCurrentUser ? 'bg-white/20 px-2 rounded-lg ring-1 ring-white/40 -mx-2 py-0.5' : ''}`}
                >
                  {/* Player name with medal - left side */}
                  <div className="flex items-center gap-2 min-w-0 flex-shrink flex-grow overflow-hidden max-w-[50%] sm:max-w-none">
                    {index < 3 ? (
                      <span className="flex-shrink-0 w-[18px] text-center">{medals[index]}</span>
                    ) : (
                      <span className="w-[18px] flex-shrink-0">{/* Empty space to maintain alignment */}</span>
                    )}
                    <span className="truncate block">
                      {record.friendly_name}
                      {isCurrentUser && <span className="badge badge-sm badge-ghost ml-1">You</span>}
                    </span>
                  </div>
                  {/* XP and date - right side, stacked on mobile, side-by-side on larger screens */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-4 flex-shrink-0 justify-end">
                    <span className="font-bold whitespace-nowrap text-right">
                      {isV1EraYear ? (
                        <>
                          {record.xp.toLocaleString()} XP
                          {record.xp_v2 && (
                            <span className="text-xs font-normal opacity-70 ml-1">(v2: {record.xp_v2.toLocaleString()})</span>
                          )}
                        </>
                      ) : (
                        // For 'all' or 2026+, show v2 XP only
                        <>{(record.xp_v2 ?? record.xp).toLocaleString()} XP</>
                      )}
                    </span>
                    <span className="text-xs opacity-80 whitespace-nowrap text-right w-24">{record.formatted_date}</span>
                  </div>
                </div>
              );
            })}
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
