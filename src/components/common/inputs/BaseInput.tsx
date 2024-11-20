import React from 'react'
import { motion } from 'framer-motion'

interface BaseInputProps {
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  error?: string
}

const BaseInput: React.FC<BaseInputProps> = ({
  label,
  type,
  value,
  onChange,
  required = false,
  placeholder = '',
  error
}) => {
  return (
    <motion.div 
      className="form-control w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <label className="label">
        <span className="label-text font-medium">{label}</span>
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
        placeholder={placeholder}
        required={required}
      />
      {error && (
        <motion.label 
          className="label"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="label-text-alt text-error">{error}</span>
        </motion.label>
      )}
    </motion.div>
  )
}

export default BaseInput
