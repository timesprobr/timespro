import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Fallback to local storage or dummy implementation if not configured
// This allows the app to be previewed as a demo even without keys
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => !!supabase;
