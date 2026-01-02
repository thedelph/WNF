/**
 * AwardYearSelector component - year/all-time filter for awards
 * Design: DaisyUI button group matching site patterns
 */

import { Infinity } from 'lucide-react';
import { AwardYearFilter } from '../../types/awards';

interface AwardYearSelectorProps {
  selectedYear: AwardYearFilter;
  onYearChange: (year: AwardYearFilter) => void;
  availableYears: number[];
}

export const AwardYearSelector = ({
  selectedYear,
  onYearChange,
  availableYears,
}: AwardYearSelectorProps) => {
  const isSelected = (year: AwardYearFilter) => selectedYear === year;

  return (
    <div className="flex justify-center items-center flex-wrap gap-2">
      {/* All-Time button */}
      <button
        className={`btn btn-sm ${isSelected('all') ? 'btn-primary' : 'btn-ghost'}`}
        onClick={() => onYearChange('all')}
      >
        <Infinity className="w-4 h-4" />
        All-Time
      </button>

      {/* Separator */}
      <div className="divider divider-horizontal mx-0" />

      {/* Year buttons */}
      {availableYears.map(year => (
        <button
          key={year}
          className={`btn btn-sm ${isSelected(year) ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onYearChange(year)}
        >
          {year}
        </button>
      ))}
    </div>
  );
};

export default AwardYearSelector;
