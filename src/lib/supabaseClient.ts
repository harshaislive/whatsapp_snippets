import { createClient } from '@supabase/supabase-js'

// Read Supabase URL and Anon Key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Basic validation
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

// Create and export the Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 