import { createClient } from '@supabase/supabase-js'

// Fallback placeholders keep `next build` from crashing during static
// prerender when env vars aren't set locally. Real values from Vercel
// (or .env.local) override these at build and runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)