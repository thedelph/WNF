import React from 'react'
import BaseInput from './BaseInput'

interface DateInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}

const DateInput: React.FC<DateInputProps> = (props) => {
  return (
    <BaseInput
      {...props}
      type="date"
    />
  )
}

export default DateInput
