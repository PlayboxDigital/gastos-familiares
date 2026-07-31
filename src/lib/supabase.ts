import { createClient, Session } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseUrl = rawUrl?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
  throw new Error("ERROR CRÍTICO: URL de Supabase inválida -> " + supabaseUrl)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const INACTIVE_SESSION_MESSAGE =
  'Tu sesión no está activa. Iniciá sesión nuevamente para analizar el ticket.'

export const requireActiveSession = async (): Promise<Session> => {
  const {
    data: { session: storedSession },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !storedSession) {
    throw new Error(INACTIVE_SESSION_MESSAGE)
  }

  const expiresSoon =
    typeof storedSession.expires_at === 'number' &&
    storedSession.expires_at <= Math.floor(Date.now() / 1000) + 30

  if (!expiresSoon) return storedSession

  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await supabase.auth.refreshSession()

  if (refreshError || !refreshedSession) {
    throw new Error(INACTIVE_SESSION_MESSAGE)
  }

  return refreshedSession
}
