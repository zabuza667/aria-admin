import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fbobbeztduoxudughxls.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib2JiZXp0ZHVveHVkdWdoeGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTU1NDYsImV4cCI6MjA4ODYzMTU0Nn0.57g-RGuVpbzyVocwRCgHZVgQzU_yqK_p0czQY4jSXYg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'aria-auth',
  }
})
