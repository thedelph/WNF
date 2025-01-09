import React from 'react'
import { Link } from 'react-router-dom'
import { AUTH_CONFIG } from '../features/auth/constants'
import RegistrationForm from '../features/auth/components/RegistrationForm'

/**
 * Registration page component
 * Shows either the registration form or a message when registration is disabled
 */
const Register: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          {AUTH_CONFIG.REGISTRATION_ENABLED ? (
            <RegistrationForm />
          ) : (
            <div className="text-center space-y-4">
              <h2 className="card-title justify-center mb-4">Registration Coming Soon!</h2>
              <p className="text-base-content/80">
                We're currently fine-tuning our registration system. Please check back soon!
              </p>
              <div className="divider">OR</div>
              <div className="text-sm">
                Already have an account?{' '}
                <Link to="/login" className="link link-primary">
                  Login here
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Register