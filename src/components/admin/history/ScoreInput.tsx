import React from 'react'
import { ScoreInputProps } from './types'

export const ScoreInput: React.FC<ScoreInputProps> = ({ label, value, onChange }) => {
  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend">{label}</legend>
      <input
        type="number"
        min="0"
        value={value || ''}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="input w-full"
        required
      />
    </fieldset>
  )
}
