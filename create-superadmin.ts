import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://wyvqgdmnaxwwyduwgzff.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dnFnZG1uYXh3d3lkdXdnemZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODY5OTIsImV4cCI6MjA4ODI2Mjk5Mn0.GrRSR7bIhnecDB1IAsad_rtwUs-nWEjjHSUdUa0AZVw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createSuperAdmin() {
  const { data, error } = await supabase.auth.signUp({
    email: 'gestarlink@gmail.com',
    password: 'asdffdsa',
  });
  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('User created:', data.user?.id);
    
    // Attempt to set role if we have RLS policies that allow it or if it's open
    if (data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role: 'superadmin' });
      if (roleError) {
        console.error('Error setting role:', roleError.message);
      } else {
        console.log('Role superadmin set successfully');
      }
    }
  }
}

createSuperAdmin();
