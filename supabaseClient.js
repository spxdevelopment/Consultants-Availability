import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY

const sb = createClient(supabaseUrl, supabaseAnonKey)
window.sb = sb
export { sb }
