import React from 'react';

interface LoadingStateProps {
  fullScreen?: boolean;
}

/**
 * Reusable loading spinner component
 * Can be used as a full screen loader or inline
 */
export const LoadingState: React.FC<LoadingStateProps> = ({ fullScreen = true }) => {
  const containerClasses = fullScreen ? "flex items-center justify-center h-screen" : "flex items-center justify-center p-4";
  
  return (
    <div className={containerClasses}>
      <div className="loading loading-spinner loading-lg"></div>
    </div>
  );
};
