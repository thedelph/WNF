import React from 'react'

interface Option {
  value: string
  label: string
}

interface SelectInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  required?: boolean
}

const SelectInput: React.FC<SelectInputProps> = ({
  label,
  value,
  onChange,
  options,
  required = false
}) => {
  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend">{label}</legend>
      <select
        className="select w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </fieldset>
  )
}

export default SelectInput
