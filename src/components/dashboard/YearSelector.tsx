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
      const { data: years, error } = await supabase.rpc('get_game_years');
      if (!error && years) {
        const yearsList = years.map(y => y.year);
        setAvailableYears(yearsList);
        onYearsLoaded?.(yearsList);
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
