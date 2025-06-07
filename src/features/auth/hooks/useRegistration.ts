import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { AUTH_CONFIG } from '../constants'

interface RegistrationForm {
  email: string
  password: string
  confirmPassword: string
  friendlyName: string
  isWhatsAppMember: boolean
  whatsAppNumber?: string
}

/**
 * Custom hook to handle user registration logic
 */
export const useRegistration = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Validates a UK mobile number format
   * Must start with +44 and be followed by 10 digits
   */
  const validateUKMobileNumber = (number: string): boolean => {
    const ukMobileRegex = /^\+44[0-9]{10}$/
    return ukMobileRegex.test(number)
  }

  /**
   * Check if friendly name is available
   * Allows duplicates only with test users
   */
  const checkFriendlyName = async (name: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('friendly_name, is_test_user')
      .eq('friendly_name', name)
      
    if (error) return false
    if (!data || data.length === 0) return true
    return data.every(player => player.is_test_user === true)
  }

  /**
   * Handle the registration process
   */
  const handleRegistration = async (formData: RegistrationForm) => {
    const { email, password, confirmPassword, friendlyName, isWhatsAppMember, whatsAppNumber } = formData
    setIsLoading(true)

    try {
      if (password !== confirmPassword) {
        toast.error('Passwords do not match!')
        return
      }

      // Validate WhatsApp number if user is a group member
      if (isWhatsAppMember) {
        if (!whatsAppNumber) {
          toast.error('WhatsApp number is required for group members')
          return
        }
        if (!validateUKMobileNumber(whatsAppNumber)) {
          toast.error('Please enter a valid UK mobile number starting with +44')
          return
        }
      }

      // Validate friendly name
      const isNameAvailable = await checkFriendlyName(friendlyName)
      if (!isNameAvailable) {
        toast.error('This friendly name is already taken. Please choose another one.')
        return
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${AUTH_CONFIG.EMAIL_REDIRECT_PATH}`
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Create player profile
        const { error: profileError } = await supabase
          .from('players')
          .insert({
            user_id: authData.user.id,
            friendly_name: friendlyName,
            caps: 0,
            active_bonuses: 0,
            active_penalties: 0,
            whatsapp_group_member: isWhatsAppMember ? 'Yes' : null,
            whatsapp_mobile_number: isWhatsAppMember ? whatsAppNumber : null
          })

        if (profileError) {
          console.error('Profile Error:', profileError)
          if (profileError.code === '23505') {
            toast.error('This friendly name is already taken. Please choose another one.')
          } else {
            throw profileError
          }
          return
        }

        toast.success('Registration successful! Please check your email to verify your account.')
        navigate('/login')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      if (error.message?.toLowerCase().includes('security purposes')) {
        toast.error('Please wait a moment before trying again')
      } else if (error.message?.toLowerCase().includes('jwt expired')) {
        toast.error('Your session has expired. Please try again.')
        await supabase.auth.signOut()
        navigate('/login')
      } else {
        toast.error(error.message || 'Registration failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    handleRegistration,
    isLoading,
    validateUKMobileNumber
  }
}
