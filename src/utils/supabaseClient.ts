import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `${window.location.origin}/supabase-api`;
  }
  return import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase anon key missing. Check your .env.local configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
