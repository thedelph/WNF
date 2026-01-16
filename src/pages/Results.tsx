/**
 * Results Page - Public game history list
 * Shows all completed games with filters for year, outcome, and participation
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Filter, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../hooks/useUser';
import { useGameResults, GameResultsFilters } from '../hooks/useGameResults';
import { YearSelector } from '../components/stats/YearSelector';
import { ResultCard } from '../components/results/ResultCard';
import { LoadingSpinner } from '../components/LoadingSpinner';

const Results: React.FC = () => {
  const { user } = useAuth();
  const { player } = useUser();

  const [filters, setFilters] = useState<GameResultsFilters>({
    year: 'all',
    outcome: '',
    participation: 'all',
  });

  const {
    games,
    loading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    totalPages,
    hasMore,
    loadMore,
  } = useGameResults(filters, player?.id || null);

  const handleYearChange = (year: number | 'all') => {
    setFilters(prev => ({ ...prev, year }));
  };

  const handleOutcomeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({
      ...prev,
      outcome: e.target.value as GameResultsFilters['outcome'],
    }));
  };

  const handleParticipationChange = (participation: GameResultsFilters['participation']) => {
    // Reset outcome filter when switching participation modes
    // (user-centric outcomes only make sense when viewing "played" games)
    const shouldResetOutcome =
      (participation !== 'played' && (filters.outcome === 'my_win' || filters.outcome === 'my_loss'));

    setFilters(prev => ({
      ...prev,
      participation,
      outcome: shouldResetOutcome ? '' : prev.outcome,
    }));
  };

  // Whether to show user-centric outcome options
  const showUserOutcomes = filters.participation === 'played' && user && player;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Trophy className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Game Results</h1>
        </div>
        <p className="text-base-content/70">
          Browse all completed WNF games
        </p>
      </motion.div>

      {/* Filters Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-base-200 p-4 rounded-lg mb-6"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          Filters
        </h3>

        <div className="space-y-4">
          {/* Year Selector */}
          <div>
            <label className="text-sm text-base-content/70 mb-2 block">Year</label>
            <YearSelector
              selectedYear={filters.year}
              onYearChange={handleYearChange}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Outcome Filter */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Outcome</legend>
              <select
                value={filters.outcome}
                onChange={handleOutcomeChange}
                className="select select-bordered w-full"
              >
                <option value="">All Outcomes</option>
                {showUserOutcomes ? (
                  <>
                    <option value="my_win">My Wins</option>
                    <option value="my_loss">My Losses</option>
                    <option value="draw">Draws</option>
                  </>
                ) : (
                  <>
                    <option value="blue_win">Blue Wins</option>
                    <option value="orange_win">Orange Wins</option>
                    <option value="draw">Draws</option>
                  </>
                )}
              </select>
            </fieldset>

            {/* Participation Filter - Login Incentive */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">My Participation</legend>
              {user && player ? (
                <div className="join w-full">
                  <button
                    className={`join-item btn btn-sm flex-1 ${
                      filters.participation === 'all' ? 'btn-primary' : 'btn-ghost'
                    }`}
                    onClick={() => handleParticipationChange('all')}
                  >
                    All
                  </button>
                  <button
                    className={`join-item btn btn-sm flex-1 ${
                      filters.participation === 'played' ? 'btn-primary' : 'btn-ghost'
                    }`}
                    onClick={() => handleParticipationChange('played')}
                  >
                    Played
                  </button>
                  <button
                    className={`join-item btn btn-sm flex-1 ${
                      filters.participation === 'reserve' ? 'btn-primary' : 'btn-ghost'
                    }`}
                    onClick={() => handleParticipationChange('reserve')}
                  >
                    Reserve
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="join w-full opacity-40">
                    <button className="join-item btn btn-sm flex-1 btn-ghost" disabled>All</button>
                    <button className="join-item btn btn-sm flex-1 btn-ghost" disabled>Played</button>
                    <button className="join-item btn btn-sm flex-1 btn-ghost" disabled>Reserve</button>
                  </div>
                  <p className="text-xs text-base-content/60 text-center">
                    <Link to="/login?redirect=/results" className="link link-primary">Log in</Link> to filter by your games
                  </p>
                </div>
              )}
            </fieldset>
          </div>
        </div>
      </motion.div>

      {/* Results Count */}
      {!loading && games.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-base-content/70 mb-4"
        >
          Showing {games.length} of {totalCount} games
        </motion.div>
      )}

      {/* Loading State */}
      {loading && games.length === 0 && (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="alert alert-error">
          <span>Error loading games: {error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && games.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <History className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-lg font-medium text-base-content/70">
            No games found
          </h3>
          <p className="text-sm text-base-content/50 mt-2">
            {filters.year !== 'all' || filters.outcome || filters.participation !== 'all'
              ? 'Try adjusting your filter criteria'
              : 'Check back after the next game is completed'}
          </p>
        </motion.div>
      )}

      {/* Results Grid */}
      {games.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game, index) => (
            <ResultCard key={game.id} game={game} index={index} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn btn-sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || loading}
            >
              First
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
            >
              Prev
            </button>

            {/* Page indicator */}
            <span className="px-3 py-1 text-sm text-base-content/70">
              {currentPage} / {totalPages}
            </span>

            <button
              className="btn btn-sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || loading}
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Load More (alternative to pagination for mobile) */}
      {hasMore && (
        <div className="text-center mt-6 md:hidden">
          <button
            onClick={loadMore}
            className="btn btn-outline"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Results;
