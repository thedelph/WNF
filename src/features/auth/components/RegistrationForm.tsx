import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRegistration } from '../hooks/useRegistration'

/**
 * Registration form component with email, friendly name, and password fields
 */
const RegistrationForm: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [friendlyName, setFriendlyName] = useState('')
  const [isWhatsAppMember, setIsWhatsAppMember] = useState(false)
  const [whatsAppNumber, setWhatsAppNumber] = useState('+44')
  
  const { handleRegistration, isLoading, validateUKMobileNumber } = useRegistration()

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
        <div className="form-control">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="input input-bordered w-full"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Friendly Name</span>
          </label>
          <input
            type="text"
            value={friendlyName}
            onChange={(e) => setFriendlyName(e.target.value)}
            placeholder="How you want to appear on the teamsheet"
            className="input input-bordered w-full"
            required
          />
          <label className="label">
            <span className="label-text-alt text-neutral-500">This name must be unique</span>
          </label>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Password</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input input-bordered w-full"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Confirm Password</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            className="input input-bordered w-full"
            required
          />
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={isWhatsAppMember}
              onChange={(e) => setIsWhatsAppMember(e.target.checked)}
            />
            <span className="label-text">WNF WhatsApp Group Member</span>
          </label>
          <label className="label">
            <span className="label-text-alt text-neutral-500">
              Currently, registration is only open to WNF WhatsApp Group members
            </span>
          </label>
        </div>

        {isWhatsAppMember && (
          <div className="form-control">
            <label className="label">
              <span className="label-text">WhatsApp Mobile Number</span>
            </label>
            <input
              type="tel"
              value={whatsAppNumber}
              onChange={(e) => setWhatsAppNumber(e.target.value)}
              placeholder="+44"
              className={`input input-bordered w-full ${
                whatsAppNumber && !validateUKMobileNumber(whatsAppNumber) ? 'input-error' : ''
              }`}
              required={isWhatsAppMember}
            />
            <label className="label">
              <span className="label-text-alt text-neutral-500">
                Enter the same mobile number you use for the WNF WhatsApp group (format: +44XXXXXXXXXX)
              </span>
            </label>
          </div>
        )}

        <div className="form-control mt-6">
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
          <Link to="/login" className="link link-primary">
            Login here
          </Link>
        </div>
      </form>
    </>
  )
}

export default RegistrationForm
