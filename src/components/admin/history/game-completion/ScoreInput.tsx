import React from 'react'
import { ScoreInputProps } from './types'

export const ScoreInput: React.FC<ScoreInputProps> = ({ label, value, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="number"
        value={value || ''}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full p-2 border rounded"
        min="0"
        required
      />
    </div>
  )
}
