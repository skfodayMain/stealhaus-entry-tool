import { createClient } from "@supabase/supabase-js";

// Public client - safe to use anywhere, but respects Row Level Security (RLS).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client - SERVER-ONLY, never exposed to the browser (no NEXT_PUBLIC_ prefix).
// This one bypasses RLS, which is what lets this internal tool create new
// brands/products/variants even though your live site's RLS policies would
// normally block writes like this from an anonymous key.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

