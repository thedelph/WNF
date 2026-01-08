import React from 'react'
import { motion } from 'framer-motion'

interface PermissionToggleProps {
  label: string
  isEnabled: boolean
  onChange: (enabled: boolean) => void
}

const PermissionToggle: React.FC<PermissionToggleProps> = ({ label, isEnabled, onChange }) => {
  return (
    <motion.fieldset
      className="fieldset"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <label className="flex items-center justify-between cursor-pointer">
        <span>{label}</span>
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={isEnabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    </motion.fieldset>
  )
}

export default PermissionToggle
