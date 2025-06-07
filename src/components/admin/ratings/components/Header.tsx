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
    <h1 className="text-2xl font-bold mb-6">Player Ratings Overview</h1>
    <div className="flex gap-4 items-center">
      <div className="flex-1">
        <SearchBar
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search players..."
        />
      </div>
      <button
        onClick={onToggleFilters}
        className="btn btn-primary"
      >
        <FaFilter className="mr-2" /> Filters
      </button>
    </div>
  </>
);
