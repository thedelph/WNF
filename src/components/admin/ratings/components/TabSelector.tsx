import React from 'react';

interface TabSelectorProps {
  activeTab: 'received' | 'given';
  onTabChange: (tab: 'received' | 'given') => void;
}

export const TabSelector: React.FC<TabSelectorProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="tabs tabs-boxed justify-center mb-6">
      <button
        className={`tab ${activeTab === 'received' ? 'tab-active' : ''}`}
        onClick={() => onTabChange('received')}
      >
        Ratings Received
      </button>
      <button
        className={`tab ${activeTab === 'given' ? 'tab-active' : ''}`}
        onClick={() => onTabChange('given')}
      >
        Ratings Given
      </button>
    </div>
  );
};
