import React from 'react'
import { ScoreInputProps } from '../types'

export const ScoreInput: React.FC<ScoreInputProps> = ({ label, value, onChange }) => {
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">{label}</span>
      </label>
      <input
        type="number"
        min="0"
        value={value || ''}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="input input-bordered w-full"
        required
      />
    </div>
  )
}
