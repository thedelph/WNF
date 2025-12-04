import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface FIFAYearSelectorProps {
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  availableYears: number[];
}

export const FIFAYearSelector = ({
  selectedYear,
  onYearChange,
  availableYears,
}: FIFAYearSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = selectedYear === 'all' ? 'ALL TIME' : selectedYear.toString();

  const options = ['all' as const, ...availableYears.sort((a, b) => b - a)];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <motion.button
        className="
          flex items-center gap-2 px-6 py-3
          bg-fifa-card border border-fifa-electric/30
          rounded-lg font-fifa-display text-lg
          text-white hover:border-fifa-electric
          transition-all duration-300
          shadow-fifa-glow/20 hover:shadow-fifa-glow
        "
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>{displayValue}</span>
        <ChevronDown
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      {/* Dropdown */}
      {isOpen && (
        <motion.div
          className="
            absolute top-full left-0 right-0 mt-2
            bg-fifa-card border border-fifa-electric/30
            rounded-lg overflow-hidden z-50
            shadow-lg shadow-fifa-electric/10
          "
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {options.map((year) => (
            <button
              key={year}
              className={`
                w-full px-6 py-3 text-left font-fifa-display
                transition-colors duration-200
                ${
                  selectedYear === year
                    ? 'bg-fifa-electric/20 text-fifa-electric'
                    : 'text-white hover:bg-fifa-electric/10'
                }
              `}
              onClick={() => {
                onYearChange(year);
                setIsOpen(false);
              }}
            >
              {year === 'all' ? 'ALL TIME' : year}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};
