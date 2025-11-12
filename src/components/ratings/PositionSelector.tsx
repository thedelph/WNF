/**
 * PositionSelector Component
 *
 * Allows users to select multiple positions where a player excels.
 * Shows a warning modal if selecting more than 3 positions.
 * Grouped by category (Goalkeeper, Defense, Midfield, Attack).
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Position } from '../../types/positions';
import {
  POSITIONS_BY_CATEGORY,
  CATEGORY_CONFIG,
  POSITION_THRESHOLDS
} from '../../constants/positions';
import { validatePositionSelectionCount } from '../../utils/positionClassifier';

interface PositionSelectorProps {
  /** Currently selected position codes */
  selectedPositions: Position[];

  /** Callback when selection changes */
  onPositionsChange: (positions: Position[]) => void;

  /** Whether the selector is disabled (e.g., in ViewAs mode) */
  disabled?: boolean;
}

export default function PositionSelector({
  selectedPositions,
  onPositionsChange,
  disabled = false
}: PositionSelectorProps) {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<Position | null>(null);

  /**
   * Toggle a position selection
   * Shows warning modal if selecting > 3 positions
   */
  const togglePosition = (code: Position) => {
    if (disabled) return;

    const isSelected = selectedPositions.includes(code);

    if (isSelected) {
      // Deselecting - always allow
      const newPositions = selectedPositions.filter(p => p !== code);
      onPositionsChange(newPositions);
    } else {
      // Selecting - check if would exceed recommended count
      const newCount = selectedPositions.length + 1;

      if (newCount > POSITION_THRESHOLDS.MAX_RECOMMENDED_SELECTIONS) {
        // Show warning modal
        setPendingPosition(code);
        setShowWarningModal(true);
      } else {
        // Under limit - add directly
        const newPositions = [...selectedPositions, code];
        onPositionsChange(newPositions);
      }
    }
  };

  /**
   * Confirm adding position despite warning
   */
  const confirmAddPosition = () => {
    if (pendingPosition) {
      const newPositions = [...selectedPositions, pendingPosition];
      onPositionsChange(newPositions);
    }
    setShowWarningModal(false);
    setPendingPosition(null);
  };

  /**
   * Cancel adding position
   */
  const cancelAddPosition = () => {
    setShowWarningModal(false);
    setPendingPosition(null);
  };

  /**
   * Clear all selections
   */
  const clearAll = () => {
    if (disabled) return;
    onPositionsChange([]);
  };

  // Get ordered categories
  const orderedCategories = Object.entries(CATEGORY_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => key as keyof typeof CATEGORY_CONFIG);

  return (
    <div className="form-control">
      {/* Header */}
      <label className="label">
        <span className="label-text font-medium">Positions Where They Excel</span>
        {selectedPositions.length > 0 && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            className="label-text-alt underline hover:text-primary transition-colors"
          >
            Clear all ({selectedPositions.length})
          </button>
        )}
      </label>

      {/* Main selection area */}
      <div className="p-4 bg-base-200 rounded-lg">
        <div className="text-sm font-medium mb-3">
          Select positions this player excels at:
        </div>

        {/* Position groups */}
        <div className="space-y-4">
          {orderedCategories.map(categoryKey => {
            const category = CATEGORY_CONFIG[categoryKey];
            const positions = POSITIONS_BY_CATEGORY[categoryKey];

            return (
              <div key={categoryKey} className="space-y-2">
                {/* Category header */}
                <div className="text-xs font-bold uppercase opacity-70">
                  {category.emoji} {category.label}
                </div>

                {/* Position checkboxes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {positions.map(pos => {
                    const isSelected = selectedPositions.includes(pos.code);

                    return (
                      <label
                        key={pos.code}
                        className={`
                          flex items-center gap-2 p-2 rounded cursor-pointer transition-all
                          ${isSelected
                            ? 'bg-primary/10 border border-primary/20 shadow-sm'
                            : 'hover:bg-base-300 border border-transparent'
                          }
                          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={isSelected}
                          onChange={() => togglePosition(pos.code)}
                          disabled={disabled}
                        />
                        <span className="text-sm">
                          {pos.label} ({pos.code})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help text */}
      <div className="text-xs mt-2 p-2 bg-info/10 border border-info/20 rounded">
        <strong>Tip:</strong> Select all positions where this player can perform well,
        not just their "main" position. Aim for 1-3 positions for best results.
      </div>

      {/* Warning message if too many selected */}
      {selectedPositions.length > POSITION_THRESHOLDS.MAX_RECOMMENDED_SELECTIONS && (
        <div className="text-xs mt-2 p-2 bg-warning/10 border border-warning/20 rounded">
          <strong>Note:</strong> You've selected {selectedPositions.length} positions.
          Consider keeping only their strongest {POSITION_THRESHOLDS.MAX_RECOMMENDED_SELECTIONS}.
        </div>
      )}

      {/* Warning Modal */}
      <AnimatePresence>
        {showWarningModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
            onClick={cancelAddPosition}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-md w-full space-y-4"
              onClick={e => e.stopPropagation()}
            >
              {/* Warning header */}
              <div className="flex items-start gap-3">
                <div className="text-3xl">⚠️</div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Too Many Positions Selected
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    You're about to select {selectedPositions.length + 1} positions.
                  </p>
                </div>
              </div>

              {/* Warning message */}
              <div className="text-sm space-y-2">
                <p>
                  For the most accurate team balancing, please select only the top{' '}
                  <strong>{POSITION_THRESHOLDS.MAX_RECOMMENDED_SELECTIONS} positions</strong>{' '}
                  where this player excels most.
                </p>
                <p className="text-gray-600">
                  Selecting too many positions makes the data less meaningful for creating
                  balanced teams.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-ghost"
                  onClick={cancelAddPosition}
                >
                  Go Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-warning"
                  onClick={confirmAddPosition}
                >
                  Select Anyway
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
