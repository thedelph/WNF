'use client'

import React from 'react'
import PlayerFilter from './PlayerFilter'

interface Props {
  filters: {
    dateFrom: string
    dateTo: string
    hasScore: 'all' | 'yes' | 'no'
    playerId: string | null
  }
  onFiltersChange: (filters: any) => void
}

const GameFilters: React.FC<Props> = ({ filters, onFiltersChange }) => {
  return (
    <div className="bg-base-200 p-4 rounded-lg">
      <h3 className="font-semibold mb-4">Filters</h3>
      <div className="grid gap-4 md:grid-cols-4">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">From Date</legend>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            className="input w-full"
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">To Date</legend>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
            className="input w-full"
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Has Score</legend>
          <select
            className="select w-full"
            value={filters.hasScore}
            onChange={(e) => onFiltersChange({ ...filters, hasScore: e.target.value })}
          >
            <option value="all">All Games</option>
            <option value="yes">With Scores</option>
            <option value="no">Without Scores</option>
          </select>
        </fieldset>

        <PlayerFilter
          value={filters.playerId}
          onChange={(value) => onFiltersChange({ ...filters, playerId: value })}
        />
      </div>
    </div>
  )
}

export default GameFilters