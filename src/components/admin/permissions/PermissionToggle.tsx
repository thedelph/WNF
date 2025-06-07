import React from 'react'
import { motion } from 'framer-motion'

interface PermissionToggleProps {
  label: string
  isEnabled: boolean
  onChange: (enabled: boolean) => void
}

const PermissionToggle: React.FC<PermissionToggleProps> = ({ label, isEnabled, onChange }) => {
  return (
    <motion.div 
      className="form-control"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <label className="label cursor-pointer">
        <span className="label-text">{label}</span>
        <input 
          type="checkbox" 
          className="toggle toggle-primary" 
          checked={isEnabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    </motion.div>
  )
}

export default PermissionToggle
