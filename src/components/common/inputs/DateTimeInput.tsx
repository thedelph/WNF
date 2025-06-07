import React from 'react'
import BaseInput from './BaseInput'

interface DateTimeInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}

const DateTimeInput: React.FC<DateTimeInputProps> = (props) => {
  return (
    <BaseInput
      {...props}
      type="datetime-local"
    />
  )
}

export default DateTimeInput
