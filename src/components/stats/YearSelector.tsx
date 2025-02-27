import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

interface YearSelectorProps {
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  onYearsLoaded?: (years: number[]) => void;
}

export const YearSelector = ({ selectedYear, onYearChange, onYearsLoaded }: YearSelectorProps) => {
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const fetchYears = async () => {
      // Get years from regular games
      const { data: gameYears, error: gameError } = await supabase.rpc('get_game_years');
      
      // Get years from XP snapshots
      const { data: snapshotYears, error: snapshotError } = await supabase
        .from('player_xp_snapshots')
        .select('snapshot_date');
      
      if (!gameError && gameYears) {
        // Extract unique years from both sources
        const gameYearsList = gameYears.map((y: any) => y.year);
        
        // Extract years from snapshot dates
        const snapshotYearsList = snapshotYears 
          ? [...new Set(snapshotYears.map((s: any) => new Date(s.snapshot_date).getFullYear()))]
          : [];
        
        // Combine and deduplicate years
        const allYears = [...new Set([...gameYearsList, ...snapshotYearsList])];
        
        // Sort years descending (newest first)
        const sortedYears = allYears.sort((a, b) => b - a);
        
        setAvailableYears(sortedYears);
        onYearsLoaded?.(sortedYears);
      }
    };

    fetchYears();
  }, [onYearsLoaded]);

  return (
    <div className="flex justify-center gap-2 mb-4">
      <button
        className={`btn btn-sm ${selectedYear === 'all' ? 'btn-primary' : 'btn-ghost'}`}
        onClick={() => onYearChange('all')}
      >
        All Time
      </button>
      {availableYears.map(year => (
        <button
          key={year}
          className={`btn btn-sm ${selectedYear === year ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onYearChange(year)}
        >
          {year}
        </button>
      ))}
    </div>
  );
};
