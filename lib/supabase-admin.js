import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY - this file must only ever be imported from API routes
// (files under app/api/...), never from a page a browser loads directly.
// Bypasses RLS, which is what lets the admin tool create new
// brands/products/variants even though your live site's RLS policies would
// normally block writes like this from an anonymous key.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
