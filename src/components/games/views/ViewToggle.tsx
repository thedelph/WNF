import React from 'react';
import { List, Grid } from 'lucide-react';

interface ViewToggleProps {
  view: 'list' | 'card';
  onViewChange: (view: 'list' | 'card') => void;
}

/**
 * ViewToggle component provides a toggle between list and card views
 */
export const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange }) => {
  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={() => onViewChange('list')}
        className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
        aria-label="List view"
      >
        <List className="w-4 h-4" />
        <span className="ml-2">List</span>
      </button>
      <button
        onClick={() => onViewChange('card')}
        className={`btn btn-sm ${view === 'card' ? 'btn-primary' : 'btn-ghost'}`}
        aria-label="Card view"
      >
        <Grid className="w-4 h-4" />
        <span className="ml-2">Cards</span>
      </button>
    </div>
  );
};
