import { supabase } from '../../../utils/supabase'

export type AuthErrorType = 'signup' | 'login' | 'password_reset' | 'logout'

interface AuthErrorLog {
  error_type: AuthErrorType
  error_code?: string
  error_message: string
  user_email?: string
  metadata?: Record<string, unknown>
}

/**
 * Logs auth-related errors to the auth_error_logs table for troubleshooting.
 * This function is non-blocking and will not throw errors.
 */
export async function logAuthError(error: AuthErrorLog): Promise<void> {
  try {
    await supabase.from('auth_error_logs').insert({
      error_type: error.error_type,
      error_code: error.error_code ?? null,
      error_message: error.error_message,
      user_email: error.user_email ?? null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      metadata: error.metadata ?? {}
    })
  } catch (e) {
    // Don't throw - logging should never break the app
    console.error('Failed to log auth error:', e)
  }
}
