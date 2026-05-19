import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // ou SUPABASE_KEY, o nome que usar no Render

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Key environment variables.');
}

// Esse é o cliente que tem acesso ao .storage
export const supabase = createClient(supabaseUrl, supabaseKey);
