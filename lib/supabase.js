import { createClient } from "@supabase/supabase-js";

// These two values come from your Vercel Environment Variables,
// NOT hardcoded here - see README for setup.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
