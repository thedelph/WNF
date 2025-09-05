import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAdmin } from '../../hooks/useAdmin';
import { SortConfig, FilterConfig } from '../../components/admin/ratings/types';
import { PlayerAttributeComparison } from '../../components/charts/PlayerRadarChart';
import { PlaystyleStatistics } from '../../components/admin/ratings/components/PlaystyleStatistics';
import { PlayersTable } from '../../components/admin/ratings/components/PlayersTable';
import { PlayerRatingsTable } from '../../components/admin/ratings/components/PlayerRatingsTable';
import { RatersTable } from '../../components/admin/ratings/components/RatersTable';
import { FilterPanel } from '../../components/admin/ratings/components/FilterPanel';
import { Header } from '../../components/admin/ratings/components/Header';
import { LoadingSpinner } from '../../components/admin/ratings/components/LoadingSpinner';
import { TabSelector } from '../../components/admin/ratings/components/TabSelector';
import { RecentActivity } from '../../components/admin/ratings/components/RecentActivity';
import { usePlayerRatings } from '../../components/admin/ratings/hooks/usePlayerRatings';
import { useRaterStats } from '../../components/admin/ratings/hooks/useRaterStats';
import { usePlayerFiltering } from '../../components/admin/ratings/hooks/usePlayerFiltering';
import { useRecentRatings } from '../../components/admin/ratings/hooks/useRecentRatings';

const RatingsView: React.FC = () => {
  const { isSuperAdmin, loading: adminLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState<'received' | 'given' | 'attributes'>('received');
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
    minGameIq: 0,
    maxGameIq: 10,
    minTotalRatings: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlayersForComparison, setSelectedPlayersForComparison] = useState<string[]>([]);
  const [comparisonSearchTerm, setComparisonSearchTerm] = useState('');

  // Custom hooks
  const { players, loading: playersLoading } = usePlayerRatings(isSuperAdmin);
  const { raters, loading: ratersLoading } = useRaterStats(isSuperAdmin);
  const { recentRatings, loading: recentLoading } = useRecentRatings(isSuperAdmin, 10);
  const { recentRatings: userRecentRatings, loading: userRecentLoading } = useRecentRatings(
    isSuperAdmin, 
    10, 
    activeTab === 'given' ? selectedRaterId || undefined : undefined
  );
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

  const handleTabChange = (tab: 'received' | 'given' | 'attributes') => {
    setActiveTab(tab);
    setSelectedPlayerId(null);
    setSelectedRaterId(null);
    if (tab === 'attributes') {
      setSelectedPlayersForComparison([]);
      setComparisonSearchTerm('');
    }
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const selectedRater = raters.find(r => r.id === selectedRaterId);

  const handleRecentActivityClick = (playerId: string) => {
    setActiveTab('received');
    setSelectedPlayerId(playerId);
    setSelectedRaterId(null);
  };

  // Wait for admin status to be confirmed before rendering anything
  if (adminLoading) {
    return <LoadingSpinner />;
  }

  // Only check for super admin after loading is complete
  if (!isSuperAdmin) {
    return null;
  }

  const loading = playersLoading || ratersLoading || recentLoading || userRecentLoading;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />
      
      {activeTab === 'given' && selectedRaterId ? (
        <RecentActivity
          recentRatings={userRecentRatings}
          onSelectPlayer={handleRecentActivityClick}
          loading={userRecentLoading}
          title={`Recent Activity by ${selectedRater?.friendly_name}`}
        />
      ) : (
        <RecentActivity
          recentRatings={recentRatings}
          onSelectPlayer={handleRecentActivityClick}
          loading={recentLoading}
        />
      )}

      <TabSelector activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Show playstyle statistics for both received and given tabs */}
      {(activeTab === 'received' || activeTab === 'given') && (
        <PlaystyleStatistics 
          players={activeTab === 'received' ? players : raters} 
          className="mb-4" 
        />
      )}

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
      ) : activeTab === 'attributes' ? (
        <div className="space-y-4">
          {/* Player selection for comparison */}
          <div className="bg-base-200 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
              <h3 className="text-lg font-semibold mb-2 sm:mb-0">Select Players to Compare</h3>
              <div className="flex gap-2">
                <button 
                  className="btn btn-xs"
                  onClick={() => {
                    const playersWithAttributes = filteredPlayers
                      .filter(p => p.derived_attributes)
                      .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name))
                      .slice(0, 4)
                      .map(p => p.id);
                    setSelectedPlayersForComparison(playersWithAttributes);
                  }}
                >
                  Select First 4
                </button>
                <button 
                  className="btn btn-xs"
                  onClick={() => setSelectedPlayersForComparison([])}
                >
                  Clear All
                </button>
              </div>
            </div>
            
            {/* Search input */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search players..."
                className="input input-bordered input-sm w-full"
                value={comparisonSearchTerm}
                onChange={(e) => setComparisonSearchTerm(e.target.value)}
              />
              <p className="text-xs text-base-content/60 mt-1">
                {(() => {
                  const totalWithData = filteredPlayers.filter(p => p.derived_attributes).length;
                  if (comparisonSearchTerm) {
                    const matchingCount = filteredPlayers
                      .filter(p => p.derived_attributes)
                      .filter(p => p.friendly_name.toLowerCase().includes(comparisonSearchTerm.toLowerCase()))
                      .length;
                    return `${matchingCount} matching players (${totalWithData} total with playstyle data)`;
                  }
                  return `${totalWithData} players with playstyle data`;
                })()}
              </p>
            </div>
            
            {/* Selected players display */}
            {selectedPlayersForComparison.length > 0 && (
              <div className="mb-3 p-2 bg-base-100 rounded">
                <p className="text-sm font-medium mb-1">Selected ({selectedPlayersForComparison.length}/4):</p>
                <div className="flex flex-wrap gap-1">
                  {selectedPlayersForComparison.map(playerId => {
                    const player = players.find(p => p.id === playerId);
                    return player ? (
                      <span key={playerId} className="badge badge-sm badge-primary">
                        {player.friendly_name}
                        <button
                          className="ml-1"
                          onClick={() => setSelectedPlayersForComparison(
                            selectedPlayersForComparison.filter(id => id !== playerId)
                          )}
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            
            {/* Player checkboxes */}
            {(() => {
              const availablePlayers = filteredPlayers
                .filter(p => p.derived_attributes)
                .filter(p => p.friendly_name.toLowerCase().includes(comparisonSearchTerm.toLowerCase()))
                .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
              
              if (availablePlayers.length === 0 && comparisonSearchTerm) {
                return (
                  <p className="text-base-content/60 text-center py-4">
                    No players matching "{comparisonSearchTerm}"
                  </p>
                );
              }
              
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
                  {availablePlayers.map(player => (
                    <label key={player.id} className="flex items-center space-x-2 cursor-pointer hover:bg-base-300 p-1 rounded">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedPlayersForComparison.includes(player.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (selectedPlayersForComparison.length < 4) {
                              setSelectedPlayersForComparison([...selectedPlayersForComparison, player.id]);
                            }
                          } else {
                            setSelectedPlayersForComparison(
                              selectedPlayersForComparison.filter(id => id !== player.id)
                            );
                          }
                        }}
                        disabled={!selectedPlayersForComparison.includes(player.id) && selectedPlayersForComparison.length >= 4}
                      />
                      <span className="text-sm truncate flex-1">{player.friendly_name}</span>
                    </label>
                  ))}
                </div>
              );
            })()}
            {filteredPlayers.filter(p => p.derived_attributes).length === 0 && !comparisonSearchTerm && (
              <p className="text-base-content/60 text-center py-4">
                No players with playstyle data available
              </p>
            )}
            {selectedPlayersForComparison.length === 4 && (
              <p className="text-warning text-sm mt-2">Maximum 4 players can be compared at once</p>
            )}
          </div>

          {/* Radar Chart Comparison */}
          <PlayerAttributeComparison
            players={players.filter(p => selectedPlayersForComparison.includes(p.id))}
            className=""
          />
        </div>
      ) : (
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
          <div className="bg-base-200 p-3 sm:p-4 rounded-lg overflow-hidden">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
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
            <div className="bg-base-200 p-3 sm:p-4 rounded-lg overflow-hidden">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 line-clamp-1">
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
