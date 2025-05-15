import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { Tooltip } from '../ui/Tooltip';

interface YearSelectorProps {
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  onYearsLoaded?: (years: number[]) => void;
}

/**
 * This array contains historic years that should always be shown in the YearSelector
 * if they have data. These years are important to the app's history.
 */
const HISTORIC_YEARS = [2024, 2025];

export const YearSelector = ({ selectedYear, onYearChange, onYearsLoaded }: YearSelectorProps) => {
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const fetchYears = async () => {
      // Get years from regular games
      const { data: gameYears, error: gameError } = await supabase.rpc('get_game_years');
      
      // Get years from XP snapshots
      const { data: snapshotYears } = await supabase
        .from('player_xp_snapshots')
        .select('snapshot_date');
      
      if (!gameError && gameYears) {
        // Extract unique years from both sources
        const gameYearsList = gameYears.map((y: any) => y.year);
        
        // Extract years from snapshot dates
        const snapshotYearsList = snapshotYears 
          ? [...new Set(snapshotYears.map((s: any) => new Date(s.snapshot_date).getFullYear()))]
          : [];
        
        // Combine years from different sources
        const allYears = [...new Set([
          ...gameYearsList, 
          ...snapshotYearsList,
          // Only include historic years that have data
          ...HISTORIC_YEARS.filter(year => {
            // Check if we have games for this year
            return gameYearsList.includes(year) || snapshotYearsList.includes(year);
          })
        ])];
        
        // Sort years descending (newest first)
        const sortedYears = allYears.sort((a, b) => b - a);
        
        setAvailableYears(sortedYears);
        onYearsLoaded?.(sortedYears);
      }
    };

    fetchYears();
  }, [onYearsLoaded]);

  // Check if we have any data for the current year
  const isYearWithData = (year: number) => {
    return availableYears.includes(year) && year <= new Date().getFullYear();
  };
  
  // Button style helper
  const getButtonStyle = (year: number | 'all') => {
    // Base style
    let style = 'btn btn-sm ';
    
    // If this is the selected year
    if (selectedYear === year) {
      return style + 'btn-primary';
    }
    
    // For numeric years, check if we have data
    if (typeof year === 'number' && !isYearWithData(year)) {
      // Future years or years without data get a special style
      return style + 'btn-outline btn-neutral opacity-60';
    }
    
    return style + 'btn-ghost';
  };

  return (
    <div className="flex justify-center flex-wrap gap-2 mb-4">
      <button
        className={getButtonStyle('all')}
        onClick={() => onYearChange('all')}
      >
        All Time
      </button>
      
      {availableYears.map(year => (
        <Tooltip 
          key={year}
          content={!isYearWithData(year) ? 'No data available yet' : ''}
        >
          <button
            className={getButtonStyle(year)}
            onClick={() => onYearChange(year)}
          >
            {year}
          </button>
        </Tooltip>
      ))}
    </div>
  );
};
