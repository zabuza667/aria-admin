import { createClient } from '@supabase/supabase-js'
import { CFG } from './config'

export const supabase = createClient(
  CFG.supabaseUrl || 'https://fbobbeztduoxudughxls.supabase.co',
  CFG.supabaseKey || 'sb_publishable_sLxC-Kngnmq3eHkBZl7ZTA_61Hu1vBe',
  { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
)
