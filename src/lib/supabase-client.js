import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yufpytzzywcxkmuxhlxb.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZnB5dHp6eXdjeGttdXhobHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTYwNzAsImV4cCI6MjA3ODY5MjA3MH0.sN0dXUCRGl-l7Bt_FrO9Ht_awe2ExK1WWHtR8Tk9WRI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
