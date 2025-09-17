import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Get environment variables with default values for type safety
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables:')
  if (!supabaseUrl) console.error('- VITE_SUPABASE_URL')
  if (!supabaseAnonKey) console.error('- VITE_SUPABASE_ANON_KEY')
  console.warn('Missing required Supabase configuration. Check your .env file.')
}

if (!supabaseServiceRoleKey) {
  console.warn('Warning: Missing VITE_SUPABASE_SERVICE_ROLE_KEY - some admin features may be limited')
}

// Create Supabase clients with validated URLs
export const supabase = createClient(
  supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`,
  supabaseAnonKey,
  {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}) as any

export const supabaseAdmin = createClient(
  supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`,
  supabaseServiceRoleKey || supabaseAnonKey, // Fallback to anon key if service role key is missing
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
) as any