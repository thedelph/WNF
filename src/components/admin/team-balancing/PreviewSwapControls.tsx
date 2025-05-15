import React from 'react';

interface PreviewSwapControlsProps {
  isPreviewActive: boolean;
  onExecutePreviewSwap: () => void;
  onCancelPreview: () => void;
}

/**
 * PreviewSwapControls component provides controls for previewing and executing player swaps
 * Shows buttons to cancel or confirm a swap that is being previewed
 * @param isPreviewActive - Whether a swap preview is active
 * @param onExecutePreviewSwap - Callback to execute the previewed swap
 * @param onCancelPreview - Callback to cancel the preview
 */
export const PreviewSwapControls: React.FC<PreviewSwapControlsProps> = ({ 
  isPreviewActive, 
  onExecutePreviewSwap, 
  onCancelPreview 
}) => {
  if (!isPreviewActive) return null;
  
  return (
    <div className="flex items-center space-x-2 my-4">
      <div className="alert alert-info py-2 px-4 flex-grow">
        <div className="flex justify-between items-center w-full">
          <span>Previewing player swap. Check the changes and confirm or cancel.</span>
          <div className="flex space-x-2">
            <button 
              className="btn btn-sm btn-ghost"
              onClick={onCancelPreview}
            >
              Cancel
            </button>
            <button 
              className="btn btn-sm btn-primary"
              onClick={onExecutePreviewSwap}
            >
              Confirm Swap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
