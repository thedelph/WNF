import React from 'react'
import { GameOutcomeProps } from './types'
import { Tooltip } from '../../ui/Tooltip'

export const GameOutcome: React.FC<GameOutcomeProps> = ({ outcome, scoreBlue, scoreOrange, onChange, isValid }) => {
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">Game Outcome</span>
      </label>
      <Tooltip content={!isValid ? "Selected outcome does not match the scores" : "Select the game outcome"}>
        <select
          value={outcome || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`select select-bordered w-full ${!isValid ? 'select-error' : ''}`}
          required
        >
          <option value="">Select Outcome</option>
          <option value="blue_win">Blue Team Wins</option>
          <option value="orange_win">Orange Team Wins</option>
          <option value="draw">Draw</option>
        </select>
      </Tooltip>
    </div>
  )
}
