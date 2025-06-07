import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAdmin } from '../../hooks/useAdmin';
import { SortConfig, FilterConfig } from '../../components/admin/ratings/types';
import { PlayersTable } from '../../components/admin/ratings/components/PlayersTable';
import { PlayerRatingsTable } from '../../components/admin/ratings/components/PlayerRatingsTable';
import { RatersTable } from '../../components/admin/ratings/components/RatersTable';
import { FilterPanel } from '../../components/admin/ratings/components/FilterPanel';
import { Header } from '../../components/admin/ratings/components/Header';
import { LoadingSpinner } from '../../components/admin/ratings/components/LoadingSpinner';
import { TabSelector } from '../../components/admin/ratings/components/TabSelector';
import { usePlayerRatings } from '../../components/admin/ratings/hooks/usePlayerRatings';
import { useRaterStats } from '../../components/admin/ratings/hooks/useRaterStats';
import { usePlayerFiltering } from '../../components/admin/ratings/hooks/usePlayerFiltering';

const RatingsView: React.FC = () => {
  const { isSuperAdmin, loading: adminLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedRaterId, setSelectedRaterId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'friendly_name',
    direction: 'asc'
  });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    minAttack: 0,
    maxAttack: 10,
    minDefense: 0,
    maxDefense: 10,
    minTotalRatings: 0
  });
  const [showFilters, setShowFilters] = useState(false);

  // Custom hooks
  const { players, loading: playersLoading } = usePlayerRatings(isSuperAdmin);
  const { raters, loading: ratersLoading } = useRaterStats(isSuperAdmin);
  const filteredPlayers = usePlayerFiltering(players, searchTerm, filterConfig);
  const filteredRaters = raters.filter(rater => 
    rater.friendly_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleTabChange = (tab: 'received' | 'given') => {
    setActiveTab(tab);
    setSelectedPlayerId(null);
    setSelectedRaterId(null);
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const selectedRater = raters.find(r => r.id === selectedRaterId);

  // Wait for admin status to be confirmed before rendering anything
  if (adminLoading) {
    return <LoadingSpinner />;
  }

  // Only check for super admin after loading is complete
  if (!isSuperAdmin) {
    return null;
  }

  const loading = playersLoading || ratersLoading;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      <TabSelector activeTab={activeTab} onTabChange={handleTabChange} />

      <AnimatePresence>
        {showFilters && activeTab === 'received' && (
          <FilterPanel
            filterConfig={filterConfig}
            onFilterChange={setFilterConfig}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
          <div className="bg-base-200 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">
              {activeTab === 'received' ? 'Players' : 'Raters'}
            </h2>
            {activeTab === 'received' ? (
              <PlayersTable
                players={filteredPlayers}
                sortConfig={sortConfig}
                onSort={handleSort}
                onPlayerSelect={setSelectedPlayerId}
                selectedPlayerId={selectedPlayerId}
              />
            ) : (
              <RatersTable
                raters={filteredRaters}
                sortConfig={sortConfig}
                onSort={handleSort}
                onRaterSelect={setSelectedRaterId}
                selectedRaterId={selectedRaterId}
              />
            )}
          </div>

          {(selectedPlayer || selectedRater) && (
            <div className="bg-base-200 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">
                {activeTab === 'received' 
                  ? `Ratings for ${selectedPlayer?.friendly_name}`
                  : `Ratings by ${selectedRater?.friendly_name}`
                }
              </h2>
              <PlayerRatingsTable
                ratings={activeTab === 'received' 
                  ? selectedPlayer?.ratings || []
                  : selectedRater?.ratings_given || []
                }
                mode={activeTab}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RatingsView;
