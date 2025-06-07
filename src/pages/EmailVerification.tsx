import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { toast } from 'react-hot-toast'

const EmailVerification = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [verifying, setVerifying] = useState(true)

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token')
      const type = searchParams.get('type')

      if (!token || type !== 'signup') {
        toast.error('Invalid verification link')
        navigate('/login')
        return
      }

      try {
        // Verify the token with Supabase
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        })

        if (error) throw error

        toast.success('Email verified successfully! You can now log in.')
        navigate('/login')
      } catch (error) {
        console.error('Verification error:', error)
        toast.error(error.message || 'Failed to verify email')
        navigate('/login')
      } finally {
        setVerifying(false)
      }
    }

    verifyEmail()
  }, [searchParams, navigate])

  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <h2 className="card-title">Verifying your email...</h2>
            <div className="mt-4">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default EmailVerification
