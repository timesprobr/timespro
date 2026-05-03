import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
  console.log('Checking organizations...');
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('*')
    .limit(10);

  if (orgsError) {
    console.error('Error fetching orgs:', orgsError);
  } else {
    console.log('Recent organizations:', orgs);
  }

  console.log('\nChecking profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(10);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  } else {
    console.log('Recent profiles:', profiles);
  }
}

debug();
