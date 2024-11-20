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
    <div className="form-control">
      <label className="label">
        <span className="label-text">{label}</span>
      </label>
      <select
        className="select select-bordered w-full"
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
    </div>
  )
}

export default SelectInput
