import React from 'react'

interface PrimaryButtonProps {
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  fullWidth?: boolean
  children: React.ReactNode
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({ 
  type = 'button', 
  onClick, 
  fullWidth = false, 
  children 
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn btn-primary ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  )
}

export default PrimaryButton
