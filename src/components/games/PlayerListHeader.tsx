import React from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { IconType } from 'react-icons';

interface PlayerListHeaderProps {
  icon: IconType;
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Reusable header component for player list sections
 * Displays an icon, title, player count, and toggle button
 */
export const PlayerListHeader: React.FC<PlayerListHeaderProps> = ({
  icon: Icon,
  title,
  count,
  isExpanded,
  onToggle
}) => {
  return (
    <button
      onClick={onToggle}
      className="btn btn-ghost btn-sm w-full flex justify-between items-center"
    >
      <span className="flex items-center gap-2">
        <Icon />
        {title} ({count})
      </span>
      {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
    </button>
  );
};
