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
        <div className="form-control">
          <label className="label">
            <span className="label-text">From Date</span>
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            className="input input-bordered w-full"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">To Date</span>
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
            className="input input-bordered w-full"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Has Score</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.hasScore}
            onChange={(e) => onFiltersChange({ ...filters, hasScore: e.target.value })}
          >
            <option value="all">All Games</option>
            <option value="yes">With Scores</option>
            <option value="no">Without Scores</option>
          </select>
        </div>

        <PlayerFilter
          value={filters.playerId}
          onChange={(value) => onFiltersChange({ ...filters, playerId: value })}
        />
      </div>
    </div>
  )
}

export default GameFilters