import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Credenciales de Supabase no encontradas. Por favor, ve al menú "Settings" (icono de engranaje) en la parte superior derecha de AI Studio y agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en la sección de Secrets.');
}

export const supabase = createClient(
  supabaseUrl || 'https://your-project.supabase.co',
  supabaseAnonKey || 'your-anon-key'
);
