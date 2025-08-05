#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client with service key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSchema() {
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolons to run each statement separately
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Running ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      });

      if (error) {
        console.error(`Error in statement ${i + 1}:`, error.message);
        // Continue with other statements even if one fails
      } else {
        console.log(`✓ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('\n✅ Database schema setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

// Run the setup
runSchema();