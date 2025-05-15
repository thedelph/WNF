import React from 'react';
import { toast } from 'react-hot-toast';

interface BalancingActionsProps {
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  previewActive: boolean;
  onRefresh: () => Promise<void>;
  onSave: () => Promise<void>;
  onExecutePreviewSwap: () => void;
}

/**
 * BalancingActions component provides action buttons for team balancing operations
 * Shows buttons for refresh, save, and executing previewed swaps
 * @param hasUnsavedChanges - Whether there are unsaved changes
 * @param isLoading - Whether data is currently loading
 * @param previewActive - Whether a swap preview is active
 * @param onRefresh - Callback to refresh team data
 * @param onSave - Callback to save team assignments
 * @param onExecutePreviewSwap - Callback to execute the previewed swap
 */
export const BalancingActions: React.FC<BalancingActionsProps> = ({
  hasUnsavedChanges,
  isLoading,
  previewActive,
  onRefresh,
  onSave,
  onExecutePreviewSwap
}) => {
  return (
    <div className="flex justify-center mt-8 gap-2">
      <button
        className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
        onClick={() => {
          toast.promise(
            onRefresh(),
            {
              loading: 'Refreshing team data...',
              success: 'Team data updated successfully',
              error: 'Failed to refresh team data'
            }
          );
        }}
        disabled={isLoading}
      >
        {isLoading ? 'Refreshing...' : 'Refresh Team Data'}
      </button>
      
      {hasUnsavedChanges && (
        <button
          className="btn btn-primary"
          onClick={() => {
            toast.promise(
              onSave(),
              {
                loading: 'Saving team assignments...',
                success: 'Team assignments saved successfully',
                error: 'Failed to save team assignments'
              }
            );
          }}
        >
          Save Changes
        </button>
      )}
      
      {previewActive && (
        <button
          className="btn btn-primary"
          onClick={onExecutePreviewSwap}
        >
          Execute Previewed Swap
        </button>
      )}
    </div>
  );
};
