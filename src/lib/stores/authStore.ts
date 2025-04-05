import { writable } from 'svelte/store';
import { supabase } from '../supabaseClient';
import type { User } from '@supabase/supabase-js';

export const user = writable<User | null>(null);

// Initialize the store with the current session
supabase.auth.getSession().then(({ data: { session } }) => {
  user.set(session?.user ?? null);
});

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  user.set(session?.user ?? null);
}); 