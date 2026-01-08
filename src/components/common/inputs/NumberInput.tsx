import React from 'react'

interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  required?: boolean
}

const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  required = false
}) => {
  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend">{label}</legend>
      <input
        type="number"
        className="input w-full"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        required={required}
      />
    </fieldset>
  )
}

export default NumberInput
