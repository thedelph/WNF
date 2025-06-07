import React, { useState } from 'react';
import { Tooltip } from '../../../components/ui/Tooltip';
import { motion } from 'framer-motion';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isConfirm?: boolean;
  confirmValue?: string;
  required?: boolean;
}

/**
 * A password input component with strength indicators and validation
 * Features:
 * - Password strength meter
 * - Requirements tooltip
 * - Password matching validation (when used as confirm password)
 * - Animated strength indicator
 * 
 * @param value - The current password value
 * @param onChange - Callback when password changes
 * @param placeholder - Input placeholder text
 * @param isConfirm - Whether this is a confirm password input
 * @param confirmValue - The value to match against (for confirm password)
 * @param required - Whether the field is required
 */
export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder = 'Password',
  isConfirm = false,
  confirmValue,
  required = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Password strength criteria
  const hasMinLength = value.length >= 8;
  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

  // Calculate strength score (0-4)
  const strengthScore = [
    hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecialChar,
  ].filter(Boolean).length;

  // Get strength label and color
  const getStrengthInfo = () => {
    if (strengthScore <= 1) return { label: 'Weak', color: 'bg-error' };
    if (strengthScore <= 3) return { label: 'Medium', color: 'bg-warning' };
    return { label: 'Strong', color: 'bg-success' };
  };

  const strengthInfo = getStrengthInfo();

  // Password requirements tooltip content
  const requirementsText = `
    Password must:
    • Be at least 8 characters
    • Include uppercase letter
    • Include lowercase letter
    • Include number
    • Include special character
  `;

  // Check if passwords match when in confirm mode
  const passwordsMatch = isConfirm ? value === confirmValue : true;

  return (
    <div className="form-control w-full">
      <div className="relative">
        <Tooltip content={isConfirm ? 'Passwords must match' : requirementsText}>
          <input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={`input input-bordered w-full ${
              isConfirm && value && !passwordsMatch ? 'input-error' : ''
            }`}
            required={required}
          />
        </Tooltip>
      </div>

      {/* Only show strength indicator for main password input */}
      {!isConfirm && value && (
        <div className="mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs">{strengthInfo.label}</span>
          </div>
          <div className="h-1 w-full bg-base-300 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${strengthInfo.color}`}
              initial={{ width: 0 }}
              animate={{ width: `${(strengthScore / 5) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Show match indicator for confirm password */}
      {isConfirm && value && (
        <label className="label">
          <span className={`label-text-alt ${passwordsMatch ? 'text-success' : 'text-error'}`}>
            {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
          </span>
        </label>
      )}
    </div>
  );
};
