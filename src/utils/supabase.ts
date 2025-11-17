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
  console.warn('⚠️ Warning: Missing VITE_SUPABASE_SERVICE_ROLE_KEY - some admin features may be limited')
} else {
  // Log first/last 10 chars to verify it's loaded (don't log full key for security)
  const keyPreview = supabaseServiceRoleKey.substring(0, 10) + '...' + supabaseServiceRoleKey.substring(supabaseServiceRoleKey.length - 10)
  console.log('✅ Service role key loaded:', keyPreview)
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

// Debug what key is being used for admin client
const adminKey = supabaseServiceRoleKey || supabaseAnonKey
console.log('🔧 Creating supabaseAdmin client with:')
console.log('  - Key length:', adminKey.length)
console.log('  - Using service role key:', !!supabaseServiceRoleKey)
console.log('  - Key preview:', adminKey.substring(0, 30) + '...')
console.log('  - Key matches service role:', adminKey === supabaseServiceRoleKey)
console.log('  - Key matches anon:', adminKey === supabaseAnonKey)

export const supabaseAdmin = createClient(
  supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`,
  adminKey,
  {
    auth: {
      autoRefreshToken: false,  // Changed from true - admin client shouldn't refresh tokens
      persistSession: false,
      detectSessionInUrl: false
    }
  }
) as any

// Global debug function - call window.debugSupabaseAdmin() in browser console
if (typeof window !== 'undefined') {
  (window as any).debugSupabaseAdmin = () => {
    console.log('🐛 Supabase Admin Client Debug:')
    console.log('Service role key from env:', {
      exists: !!supabaseServiceRoleKey,
      length: supabaseServiceRoleKey?.length || 0,
      preview: supabaseServiceRoleKey ? supabaseServiceRoleKey.substring(0, 30) + '...' : 'N/A'
    })
    console.log('Admin key used:', {
      length: adminKey.length,
      preview: adminKey.substring(0, 30) + '...',
      matchesServiceRole: adminKey === supabaseServiceRoleKey,
      matchesAnon: adminKey === supabaseAnonKey
    })
    console.log('Admin client config:', supabaseAdmin)
  }
}