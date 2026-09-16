import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These are browser-safe Supabase client settings. Vercel should still set
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY explicitly; the real project
// fallback prevents a missing build variable from becoming a vague fetch
// failure in the deployed app.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://runppvhclespkgdlxyww.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1bnBwdmhjbGVzcGtnZGx4eXd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTEzMDYsImV4cCI6MjA4NjU4NzMwNn0.7JLcVw5GwEU78W9j1R4gRiEuS7wI5ObLJyEXSWkOvGc';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
