import React from 'react'
import { GameOutcomeProps } from './types'

export const GameOutcome: React.FC<GameOutcomeProps> = ({ 
  outcome, 
  scoreBlue, 
  scoreOrange, 
  onChange,
  isValid 
}) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">Outcome</label>
      <select
        value={outcome || ''}
        onChange={e => onChange(e.target.value)}
        className={`w-full p-2 border rounded ${!isValid ? 'border-error text-error' : ''}`}
        required
      >
        <option value="">Select outcome...</option>
        <option 
          value="blue_win" 
          disabled={typeof scoreBlue === 'number' && typeof scoreOrange === 'number' && scoreBlue <= scoreOrange}
        >
          Blue Win
        </option>
        <option 
          value="orange_win"
          disabled={typeof scoreBlue === 'number' && typeof scoreOrange === 'number' && scoreOrange <= scoreBlue}
        >
          Orange Win
        </option>
        <option 
          value="draw"
          disabled={typeof scoreBlue === 'number' && typeof scoreOrange === 'number' && scoreBlue !== scoreOrange}
        >
          Draw
        </option>
      </select>
      {!isValid && (
        <p className="text-error text-sm mt-1">
          Outcome does not match the scores
        </p>
      )}
    </div>
  )
}
