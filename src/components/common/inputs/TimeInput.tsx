import React from 'react'
import BaseInput from './BaseInput'

interface TimeInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}

const TimeInput: React.FC<TimeInputProps> = (props) => {
  return (
    <BaseInput
      {...props}
      type="time"
    />
  )
}

export default TimeInput
