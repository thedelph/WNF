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
    <motion.fieldset
      className="fieldset w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <legend className="fieldset-legend font-medium">{label}</legend>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input w-full ${error ? 'input-error' : ''}`}
        placeholder={placeholder}
        required={required}
      />
      {error && (
        <motion.p
          className="fieldset-label text-error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.p>
      )}
    </motion.fieldset>
  )
}

export default BaseInput
