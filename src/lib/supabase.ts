import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseUrl = rawUrl?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
  throw new Error("ERROR CRÍTICO: URL de Supabase inválida -> " + supabaseUrl)
}

console.log("SUPABASE_URL_RUNTIME:", JSON.stringify(import.meta.env.VITE_SUPABASE_URL))
console.log("SUPABASE_ANON_PRESENT:", !!import.meta.env.VITE_SUPABASE_ANON_KEY)

export const supabase = createClient(supabaseUrl, supabaseAnonKey!)
