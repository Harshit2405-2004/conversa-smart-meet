
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bwxvudskpkzzfrohntaq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3eHZ1ZHNrcGt6emZyb2hudGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MzU1MDYsImV4cCI6MjA1OTIxMTUwNn0.-jEokRS9gIXczUNqqHXe8FBvwApdJKvxzh78ulVec_Q";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true
  }
});
