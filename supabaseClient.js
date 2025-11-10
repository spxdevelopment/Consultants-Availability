// js/supabaseClient.js
// Creates a Supabase client and exposes it as window.sb
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---- PUT YOUR VALUES HERE ----
const supabaseUrl = 'https://jnmrrqovdindfqzkljlg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubXJycW92ZGluZGZxemtsamxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODI1NjAsImV4cCI6MjA3ODM1ODU2MH0.gErOw_SkAY7l6GUP6bEqj81hntkpbO23KcXJc6czsGU'
// --------------------------------

const sb = createClient(supabaseUrl, supabaseAnonKey)
window.sb = sb
export { sb }
