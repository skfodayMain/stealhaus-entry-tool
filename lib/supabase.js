import { createClient } from "@supabase/supabase-js";

// Safe to use anywhere, including pages the browser runs directly (like /shop).
// Respects Row Level Security (RLS) - can only do what your RLS policies allow.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

