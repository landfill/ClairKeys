import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let serverClient: SupabaseClient | null = null

/**
 * Return the privileged Supabase client when a storage operation actually runs.
 * Keeping creation lazy allows builds and static analysis to import server modules
 * without requiring deployment secrets.
 */
export function getSupabaseServer(): SupabaseClient {
  if (serverClient) {
    return serverClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for server')
  }

  serverClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return serverClient
}
