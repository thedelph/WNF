import React from 'react';

interface TabSelectorProps {
  activeTab: 'received' | 'given' | 'attributes';
  onTabChange: (tab: 'received' | 'given' | 'attributes') => void;
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
      <button
        className={`tab tab-sm sm:tab-md ${activeTab === 'attributes' ? 'tab-active' : ''}`}
        onClick={() => onTabChange('attributes')}
      >
        <span className="hidden sm:inline">Player </span>Attributes
      </button>
    </div>
  );
};
