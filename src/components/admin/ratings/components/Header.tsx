import React from 'react';
import { FaFilter } from 'react-icons/fa';
import { SearchBar } from './SearchBar';

interface HeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onToggleFilters: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  onSearchChange,
  onToggleFilters,
}) => (
  <>
    <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Player Ratings Overview</h1>
    <div className="flex gap-2 sm:gap-4 items-center">
      <div className="flex-1">
        <SearchBar
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search players..."
        />
      </div>
      <button
        onClick={onToggleFilters}
        className="btn btn-primary btn-sm sm:btn-md"
      >
        <FaFilter className="sm:mr-2" /> 
        <span className="hidden sm:inline">Filters</span>
      </button>
    </div>
  </>
);
