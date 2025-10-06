import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Snippet {
  id: number | string;
  timestamp: string;
  sender_name?: string | null;
  sender_jid?: string | null;
  content: string;
  caption?: string | null;
  message_type?: string;
  group_name?: string | null;
  is_group?: boolean;
}
