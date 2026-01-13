import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRegistration } from '../hooks/useRegistration'
import { PasswordInput } from './PasswordInput'

interface RegistrationFormProps {
  /** Path to redirect to after successful login (passed through to login page) */
  redirectTo?: string;
}

/**
 * Registration form component with email, friendly name, and password fields
 * Features password strength validation and matching confirmation
 */
const RegistrationForm: React.FC<RegistrationFormProps> = ({ redirectTo }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [friendlyName, setFriendlyName] = useState('')
  const [isWhatsAppMember, setIsWhatsAppMember] = useState(false)
  const [whatsAppNumber, setWhatsAppNumber] = useState('+44')
  
  const { handleRegistration, isLoading, validateUKMobileNumber } = useRegistration({ redirectTo })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleRegistration({
      email,
      password,
      confirmPassword,
      friendlyName,
      isWhatsAppMember,
      whatsAppNumber: isWhatsAppMember ? whatsAppNumber : undefined
    })
  }

  return (
    <>
      <h2 className="card-title justify-center mb-4">Create your WNF Account</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Email</legend>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="input w-full"
            required
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Friendly Name</legend>
          <input
            type="text"
            value={friendlyName}
            onChange={(e) => setFriendlyName(e.target.value)}
            placeholder="Your name on the teamsheet"
            className="input w-full"
            required
          />
          <p className="fieldset-label text-neutral-500">This name must be unique</p>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Password</legend>
          <PasswordInput
            value={password}
            onChange={setPassword}
            required
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Confirm Password</legend>
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm Password"
            isConfirm
            confirmValue={password}
            required
          />
        </fieldset>

        <fieldset className="fieldset">
          <label className="flex items-center cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={isWhatsAppMember}
              onChange={(e) => setIsWhatsAppMember(e.target.checked)}
            />
            <span>WNF WhatsApp Group Member</span>
          </label>
          <p className="fieldset-label text-neutral-500">
            Currently, registration is only open to WNF WhatsApp Group members
          </p>
        </fieldset>

        {isWhatsAppMember && (
          <fieldset className="fieldset">
            <legend className="fieldset-legend">WhatsApp Mobile Number</legend>
            <input
              type="tel"
              value={whatsAppNumber}
              onChange={(e) => setWhatsAppNumber(e.target.value)}
              placeholder="+44"
              className={`input w-full ${
                whatsAppNumber && !validateUKMobileNumber(whatsAppNumber) ? 'input-error' : ''
              }`}
              required={isWhatsAppMember}
            />
            <p className="fieldset-label text-neutral-500">
              Enter the same mobile number you use for the WNF WhatsApp group (format: +44XXXXXXXXXX)
            </p>
          </fieldset>
        )}

        <div className="mt-6">
          {isWhatsAppMember ? (
            <button
              type="submit"
              className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
              disabled={isLoading || !validateUKMobileNumber(whatsAppNumber)}
            >
              Register
            </button>
          ) : (
            <div className="text-center text-error">
              Please confirm you are a WNF WhatsApp Group member to register
            </div>
          )}
        </div>

        <div className="divider">OR</div>

        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" state={{ from: redirectTo }} className="link link-primary">
            Login here
          </Link>
        </div>
      </form>
    </>
  )
}

export default RegistrationForm
