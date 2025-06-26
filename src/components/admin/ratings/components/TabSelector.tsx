import React from 'react';

interface TabSelectorProps {
  activeTab: 'received' | 'given';
  onTabChange: (tab: 'received' | 'given') => void;
}

export const TabSelector: React.FC<TabSelectorProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="tabs tabs-boxed justify-center mb-4 sm:mb-6">
      <button
        className={`tab tab-sm sm:tab-md ${activeTab === 'received' ? 'tab-active' : ''}`}
        onClick={() => onTabChange('received')}
      >
        <span className="hidden sm:inline">Ratings </span>Received
      </button>
      <button
        className={`tab tab-sm sm:tab-md ${activeTab === 'given' ? 'tab-active' : ''}`}
        onClick={() => onTabChange('given')}
      >
        <span className="hidden sm:inline">Ratings </span>Given
      </button>
    </div>
  );
};
