/**
 * PositionSelector Component - Ranked Position System
 *
 * Allows users to rank up to 3 positions where a player excels most.
 * 1st choice = 3 points (Gold 🥇)
 * 2nd choice = 2 points (Silver 🥈)
 * 3rd choice = 1 point (Bronze 🥉)
 *
 * Uses dropdown selectors with visual rank indicators.
 */

import React from 'react';
import { Position } from '../../types/positions';
import { POSITION_CONFIGS } from '../../constants/positions';

interface PositionSelectorProps {
  /** Currently selected ranked positions */
  selectedPositions: {
    first?: Position;
    second?: Position;
    third?: Position;
  };

  /** Callback when selection changes */
  onPositionsChange: (positions: { first?: Position; second?: Position; third?: Position }) => void;

  /** Whether the selector is disabled (e.g., in ViewAs mode) */
  disabled?: boolean;
}

/**
 * Badge styling for each rank
 * Gold (#FCD34D), Silver (#9CA3AF), Bronze (#EA580C)
 */
const RANK_STYLES = {
  first: {
    badge: 'bg-[#FCD34D] text-gray-900',
    label: '1st Choice',
    emoji: '🥇',
    points: 3
  },
  second: {
    badge: 'bg-[#9CA3AF] text-white',
    label: '2nd Choice',
    emoji: '🥈',
    points: 2
  },
  third: {
    badge: 'bg-[#EA580C] text-white',
    label: '3rd Choice',
    emoji: '🥉',
    points: 1
  }
} as const;

export default function PositionSelector({
  selectedPositions,
  onPositionsChange,
  disabled = false
}: PositionSelectorProps) {
  /**
   * Handle position change for a specific rank
   */
  const handleRankChange = (rank: 'first' | 'second' | 'third', value: string) => {
    const newPositions = { ...selectedPositions };

    if (value === '') {
      // Clear this rank
      delete newPositions[rank];
    } else {
      // Set new position for this rank
      newPositions[rank] = value as Position;
    }

    onPositionsChange(newPositions);
  };

  /**
   * Get positions that are already selected in other ranks
   * Used to disable duplicate selections
   */
  const getDisabledPositions = (currentRank: 'first' | 'second' | 'third'): Position[] => {
    const disabled: Position[] = [];

    if (currentRank !== 'first' && selectedPositions.first) {
      disabled.push(selectedPositions.first);
    }
    if (currentRank !== 'second' && selectedPositions.second) {
      disabled.push(selectedPositions.second);
    }
    if (currentRank !== 'third' && selectedPositions.third) {
      disabled.push(selectedPositions.third);
    }

    return disabled;
  };

  /**
   * Clear all selections
   */
  const clearAll = () => {
    if (disabled) return;
    onPositionsChange({});
  };

  /**
   * Get count of selected positions
   */
  const selectedCount = [
    selectedPositions.first,
    selectedPositions.second,
    selectedPositions.third
  ].filter(Boolean).length;

  /**
   * Render a single rank dropdown
   */
  const renderRankDropdown = (rank: 'first' | 'second' | 'third') => {
    const style = RANK_STYLES[rank];
    const disabledPositions = getDisabledPositions(rank);
    const currentValue = selectedPositions[rank] || '';

    return (
      <fieldset key={rank} className="fieldset">
        {/* Rank label with badge */}
        <legend className="fieldset-legend flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${style.badge}`}>
            {style.emoji} {style.label}
          </span>
          <span className="text-xs opacity-70">({style.points} points)</span>
        </legend>

        {/* Dropdown selector */}
        <select
          className={`select w-full ${
            currentValue ? 'select-primary' : ''
          }`}
          value={currentValue}
          onChange={(e) => handleRankChange(rank, e.target.value)}
          disabled={disabled}
        >
          {/* Empty option */}
          <option value="">
            {rank === 'first'
              ? 'Select their best position...'
              : 'Select position (optional)...'}
          </option>

          {/* Position options grouped by category */}
          <optgroup label="🛡️ Defense">
            {POSITION_CONFIGS
              .filter(p => p.category === 'defense')
              .map(pos => (
                <option
                  key={pos.code}
                  value={pos.code}
                  disabled={disabledPositions.includes(pos.code)}
                >
                  {pos.label} ({pos.code})
                  {disabledPositions.includes(pos.code) ? ' - Already selected' : ''}
                </option>
              ))}
          </optgroup>

          <optgroup label="⚙️ Midfield">
            {POSITION_CONFIGS
              .filter(p => p.category === 'midfield')
              .map(pos => (
                <option
                  key={pos.code}
                  value={pos.code}
                  disabled={disabledPositions.includes(pos.code)}
                >
                  {pos.label} ({pos.code})
                  {disabledPositions.includes(pos.code) ? ' - Already selected' : ''}
                </option>
              ))}
          </optgroup>

          <optgroup label="⚔️ Attack">
            {POSITION_CONFIGS
              .filter(p => p.category === 'attack')
              .map(pos => (
                <option
                  key={pos.code}
                  value={pos.code}
                  disabled={disabledPositions.includes(pos.code)}
                >
                  {pos.label} ({pos.code})
                  {disabledPositions.includes(pos.code) ? ' - Already selected' : ''}
                </option>
              ))}
          </optgroup>
        </select>
      </fieldset>
    );
  };

  return (
    <fieldset className="fieldset">
      {/* Header */}
      <legend className="fieldset-legend font-medium flex items-center justify-between w-full">
        <span>Position Preferences</span>
        {selectedCount > 0 && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs underline hover:text-primary transition-colors font-normal"
          >
            Clear all ({selectedCount})
          </button>
        )}
      </legend>

      {/* Main selection area */}
      <div className="p-4 bg-base-200 rounded-lg space-y-4">
        {/* Instructions */}
        <div className="text-sm">
          <div className="font-medium mb-1">Rank this player's best positions:</div>
          <div className="text-xs opacity-70">
            Select 1-3 positions in order of strength. Higher ranks = more weight.
          </div>
        </div>

        {/* Three rank dropdowns */}
        <div className="space-y-3">
          {renderRankDropdown('first')}
          {renderRankDropdown('second')}
          {renderRankDropdown('third')}
        </div>
      </div>

      {/* Help text */}
      <div className="text-xs mt-2 p-2 bg-info/10 border border-info/20 rounded">
        <strong>How it works:</strong> Your 1st choice gets 3 points, 2nd gets 2 points,
        3rd gets 1 point. Consensus percentages are calculated from all raters' weighted points.
      </div>

      {/* Summary of selected positions */}
      {selectedCount > 0 && (
        <div className="mt-2 p-2 bg-base-300 rounded flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium opacity-70">Selected:</span>
          {selectedPositions.first && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-[#FCD34D] text-gray-900">
              🥇 {selectedPositions.first}
            </span>
          )}
          {selectedPositions.second && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-[#9CA3AF] text-white">
              🥈 {selectedPositions.second}
            </span>
          )}
          {selectedPositions.third && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-[#EA580C] text-white">
              🥉 {selectedPositions.third}
            </span>
          )}
        </div>
      )}
    </fieldset>
  );
}
